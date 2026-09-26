import { Injectable, inject, PLATFORM_ID, signal, computed } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MarkdownDocument } from '../models/document.model';
import { IndexedDbService } from './indexed-db.service';

const DB_NAME = 'markdownview_fs_db';
const STORE_NAME = 'handles';
const HANDLE_KEY = 'workspace_dir';
const LOCAL_STORAGE_DIR_KEY = 'md_local_directory_name';

@Injectable({ providedIn: 'root' })
export class LocalDirectoryService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly indexedDb = inject(IndexedDbService);

  /** Active directory handle in memory */
  private dirHandle: any = null;

  /** Name of the connected local directory */
  readonly connectedDirectoryName = signal<string | null>(null);

  /** Whether a local directory is currently linked */
  readonly isConnected = computed(() => !!this.connectedDirectoryName());

  /** Whether the browser supports the File System Access API */
  readonly isSupported = signal<boolean>(false);

  /** Whether a file system sync operation is currently in progress */
  readonly isSyncing = signal<boolean>(false);

  constructor() {
    if (this.isBrowser && typeof window !== 'undefined') {
      const supported = 'showDirectoryPicker' in window;
      this.isSupported.set(supported);

      // Restore previously connected directory name from localStorage
      const savedName = localStorage.getItem(LOCAL_STORAGE_DIR_KEY);
      if (savedName) {
        this.connectedDirectoryName.set(savedName);
      }

      // Try restoring handle from IndexedDB
      if (supported) {
        this.restoreHandleFromDb();
      }
    }
  }

  /**
   * Prompt user to select a folder on their local computer with read/write permissions.
   */
  async connectDirectory(): Promise<boolean> {
    if (!this.isBrowser || !this.isSupported()) {
      return false;
    }

    try {
      const picker = (window as any).showDirectoryPicker;
      const handle = await picker({ mode: 'readwrite' });
      if (!handle) return false;

      this.dirHandle = handle;
      this.connectedDirectoryName.set(handle.name);
      localStorage.setItem(LOCAL_STORAGE_DIR_KEY, handle.name);

      await this.saveHandleToDb(handle);
      return true;
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        // User cancelled selection
        return false;
      }
      console.warn('Failed to connect local directory:', err);
      return false;
    }
  }

  /**
   * Save a single Markdown document directly into the local directory.
   * If the document has a folder assigned, creates or uses that subfolder.
   */
  async saveDocument(doc: MarkdownDocument): Promise<boolean> {
    const handle = await this.getVerifiedHandle();
    if (!handle) return false;

    try {
      let targetDir = handle;

      if (doc.folder?.trim()) {
        const folderParts = doc.folder
          .split(/[\/\\]/)
          .map((part) => this.sanitizeName(part.trim()))
          .filter(Boolean);

        for (const part of folderParts) {
          targetDir = await targetDir.getDirectoryHandle(part, { create: true });
        }
      }

      const fileName = `${this.sanitizeName(doc.title || 'Untitled')}.md`;
      const fileHandle = await targetDir.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(doc.content || '');
      await writable.close();

      // Also save any referenced assets to the workspace 'assets' folder
      const assetMatches = doc.content?.match(/assets\/[a-zA-Z0-9_\-\.]+\.(?:png|jpe?g|gif|webp|svg|avif|bmp|ico)/gi);
      if (assetMatches && assetMatches.length > 0) {
        try {
          const assetsDir = await handle.getDirectoryHandle('assets', { create: true });
          for (const match of new Set(assetMatches)) {
            const assetFileName = match.replace(/^assets[\/\\]/, '');
            const blob = await this.indexedDb.getAsset(match);
            if (blob) {
              const assetFileHandle = await assetsDir.getFileHandle(assetFileName, { create: true });
              const assetWritable = await assetFileHandle.createWritable();
              await assetWritable.write(blob);
              await assetWritable.close();
            }
          }
        } catch (assetErr) {
          console.warn('Could not save referenced assets to local directory:', assetErr);
        }
      }

      return true;
    } catch (err) {
      console.error('Failed to save document to local directory:', err);
      return false;
    }
  }

  /**
   * Sync all documents from the editor store into the connected local folder.
   */
  async syncAllDocuments(
    documents: MarkdownDocument[],
  ): Promise<{ count: number; errorCount: number }> {
    const handle = await this.getVerifiedHandle();
    if (!handle || documents.length === 0) {
      return { count: 0, errorCount: 0 };
    }

    this.isSyncing.set(true);
    let count = 0;
    let errorCount = 0;

    try {
      for (const doc of documents) {
        const success = await this.saveDocument(doc);
        if (success) {
          count++;
        } else {
          errorCount++;
        }
      }
    } finally {
      this.isSyncing.set(false);
    }

    return { count, errorCount };
  }

  /**
   * Read all markdown files from the connected directory and its direct subdirectories.
   */
  async importFromConnectedDirectory(): Promise<
    Array<{ title: string; content: string; folder?: string }>
  > {
    const handle = await this.getVerifiedHandle();
    if (!handle) return [];

    const results: Array<{ title: string; content: string; folder?: string }> = [];

    try {
      // Read top-level files and folders
      for await (const entry of handle.values()) {
        if (entry.kind === 'file') {
          if (this.isMarkdownFile(entry.name)) {
            const file = await entry.getFile();
            const content = await file.text();
            const title = entry.name.replace(/\.(md|markdown|txt)$/i, '');
            results.push({ title, content });
          }
        } else if (entry.kind === 'directory') {
          // Read files inside this subdirectory
          const subDirName = entry.name;
          for await (const subEntry of entry.values()) {
            if (subEntry.kind === 'file' && this.isMarkdownFile(subEntry.name)) {
              const file = await subEntry.getFile();
              const content = await file.text();
              const title = subEntry.name.replace(/\.(md|markdown|txt)$/i, '');
              results.push({ title, content, folder: subDirName });
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to read from connected local directory:', err);
    }

    return results;
  }

  /**
   * Disconnect the current local directory.
   */
  async disconnectDirectory(): Promise<void> {
    this.dirHandle = null;
    this.connectedDirectoryName.set(null);
    if (this.isBrowser) {
      localStorage.removeItem(LOCAL_STORAGE_DIR_KEY);
      await this.removeHandleFromDb();
    }
  }

  /**
   * Verify and request read/write permissions for the active directory handle.
   */
  private async getVerifiedHandle(): Promise<any> {
    if (!this.dirHandle) {
      const restored = await this.restoreHandleFromDb();
      if (!restored) {
        const connected = await this.connectDirectory();
        if (!connected) return null;
      }
    }

    if (!this.dirHandle) return null;

    try {
      if (this.dirHandle.queryPermission) {
        const query = await this.dirHandle.queryPermission({ mode: 'readwrite' });
        if (query === 'granted') {
          return this.dirHandle;
        }

        const request = await this.dirHandle.requestPermission({ mode: 'readwrite' });
        if (request === 'granted') {
          return this.dirHandle;
        }
        return null;
      }
      return this.dirHandle;
    } catch (err) {
      console.warn('Error querying directory handle permissions:', err);
      return null;
    }
  }

  private isMarkdownFile(filename: string): boolean {
    const lower = filename.toLowerCase();
    return (
      lower.endsWith('.md') ||
      lower.endsWith('.markdown') ||
      lower.endsWith('.txt')
    );
  }

  private sanitizeName(name: string): string {
    return name.replace(/[\\/:*?"<>|]/g, '_').trim() || 'Untitled';
  }

  // IndexedDB helpers for handle persistence
  private openDb(): Promise<IDBDatabase | null> {
    return new Promise((resolve) => {
      if (!this.isBrowser || !('indexedDB' in window)) {
        return resolve(null);
      }
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });
  }

  private async saveHandleToDb(handle: any): Promise<void> {
    const db = await this.openDb();
    if (!db) return;
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(handle, HANDLE_KEY);
      await new Promise((res) => {
        tx.oncomplete = res;
        tx.onerror = res;
      });
    } catch {}
  }

  private async restoreHandleFromDb(): Promise<boolean> {
    const db = await this.openDb();
    if (!db) return false;
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(HANDLE_KEY);
      const handle = await new Promise<any>((res) => {
        req.onsuccess = () => res(req.result);
        req.onerror = () => res(null);
      });
      if (handle) {
        this.dirHandle = handle;
        if (!this.connectedDirectoryName()) {
          this.connectedDirectoryName.set(handle.name);
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  private async removeHandleFromDb(): Promise<void> {
    const db = await this.openDb();
    if (!db) return;
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(HANDLE_KEY);
      await new Promise((res) => {
        tx.oncomplete = res;
        tx.onerror = res;
      });
    } catch {}
  }
}
