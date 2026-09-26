import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MarkdownDocument } from '../models/document.model';

export interface DocumentSnapshot {
  id: string;
  docId: string;
  timestamp: number;
  title: string;
  content: string;
  wordCount: number;
  charCount: number;
  diffSummary?: string;
}

export interface StoredAsset {
  name: string;
  blob: Blob;
  mimeType: string;
  createdAt: number;
}

const DB_NAME = 'markdown_view_db';
const DB_VERSION = 1;

const STORE_DOCUMENTS = 'documents';
const STORE_ASSETS = 'assets';
const STORE_HISTORY = 'history';
const STORE_SETTINGS = 'settings';

@Injectable({ providedIn: 'root' })
export class IndexedDbService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private dbPromise: Promise<IDBDatabase> | null = null;
  private readonly blobUrlCache = new Map<string, string>();

  constructor() {
    if (this.isBrowser) {
      this.getDb();
    }
  }

  /** Open or return cached IndexedDB instance */
  getDb(): Promise<IDBDatabase> {
    if (!this.isBrowser) {
      return Promise.reject(new Error('IndexedDB not supported in server environment.'));
    }

    if (!this.dbPromise) {
      this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;

          if (!db.objectStoreNames.contains(STORE_DOCUMENTS)) {
            db.createObjectStore(STORE_DOCUMENTS, { keyPath: 'id' });
          }

          if (!db.objectStoreNames.contains(STORE_ASSETS)) {
            db.createObjectStore(STORE_ASSETS, { keyPath: 'name' });
          }

          if (!db.objectStoreNames.contains(STORE_HISTORY)) {
            db.createObjectStore(STORE_HISTORY, { keyPath: 'docId' });
          }

          if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
            db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
          }
        };

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          reject(request.error);
        };
      });
    }

    return this.dbPromise;
  }

  // ==========================================
  // Document Operations
  // ==========================================

  async getAllDocuments(): Promise<MarkdownDocument[]> {
    if (!this.isBrowser) return [];
    try {
      const db = await this.getDb();
      return new Promise<MarkdownDocument[]>((resolve, reject) => {
        const tx = db.transaction(STORE_DOCUMENTS, 'readonly');
        const store = tx.objectStore(STORE_DOCUMENTS);
        const req = store.getAll();

        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return [];
    }
  }

  async saveDocument(doc: MarkdownDocument): Promise<void> {
    if (!this.isBrowser || !doc?.id) return;
    const db = await this.getDb();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_DOCUMENTS, 'readwrite');
      const store = tx.objectStore(STORE_DOCUMENTS);
      const req = store.put(doc);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async saveAllDocuments(docs: MarkdownDocument[]): Promise<void> {
    if (!this.isBrowser) return;
    const db = await this.getDb();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_DOCUMENTS, 'readwrite');
      const store = tx.objectStore(STORE_DOCUMENTS);

      for (const doc of docs) {
        store.put(doc);
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async deleteDocument(id: string): Promise<void> {
    if (!this.isBrowser || !id) return;
    const db = await this.getDb();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_DOCUMENTS, 'readwrite');
      const store = tx.objectStore(STORE_DOCUMENTS);
      const req = store.delete(id);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // ==========================================
  // Asset (Images / Media) Operations
  // ==========================================

  /**
   * Saves a media file/blob into IndexedDB and returns a short reference path (e.g., 'assets/image-1727351234.png').
   */
  async saveAsset(blob: Blob, customFilename?: string): Promise<string> {
    if (!this.isBrowser) return '';

    const mime = blob.type || 'image/png';
    let ext = 'png';
    if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
    else if (mime.includes('webp')) ext = 'webp';
    else if (mime.includes('gif')) ext = 'gif';
    else if (mime.includes('svg')) ext = 'svg';

    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    const assetName = customFilename?.startsWith('assets/')
      ? customFilename
      : `assets/image-${timestamp}-${randomSuffix}.${ext}`;

    const assetRecord: StoredAsset = {
      name: assetName,
      blob,
      mimeType: mime,
      createdAt: timestamp,
    };

    const db = await this.getDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_ASSETS, 'readwrite');
      const store = tx.objectStore(STORE_ASSETS);
      const req = store.put(assetRecord);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    // Pre-cache object URL
    const url = URL.createObjectURL(blob);
    this.blobUrlCache.set(assetName, url);

    return assetName;
  }

  /**
   * Get binary Blob for a stored asset path
   */
  async getAsset(assetName: string): Promise<Blob | null> {
    if (!this.isBrowser || !assetName) return null;
    const db = await this.getDb();
    return new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(STORE_ASSETS, 'readonly');
      const store = tx.objectStore(STORE_ASSETS);
      const req = store.get(assetName);

      req.onsuccess = () => {
        const record = req.result as StoredAsset | undefined;
        resolve(record?.blob || null);
      };
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Return cached Object URL if already created, without waiting for async I/O.
   */
  getCachedBlobUrl(assetName: string): string | null {
    return this.blobUrlCache.get(assetName) || null;
  }

  /**
   * Get an active Object URL for a stored asset (cached for performance)
   */
  async getAssetBlobUrl(assetName: string): Promise<string | null> {
    if (!this.isBrowser || !assetName) return null;

    if (this.blobUrlCache.has(assetName)) {
      return this.blobUrlCache.get(assetName)!;
    }

    const blob = await this.getAsset(assetName);
    if (!blob) return null;

    const url = URL.createObjectURL(blob);
    this.blobUrlCache.set(assetName, url);
    return url;
  }

  /**
   * Convert a Blob to a Base64 data URL
   */
  async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Get an asset as a Base64 data URL
   */
  async getAssetBase64(assetName: string): Promise<string | null> {
    if (!this.isBrowser || !assetName) return null;
    const blob = await this.getAsset(assetName);
    if (!blob) return null;
    return this.blobToBase64(blob);
  }

  /**
   * Replace all local `assets/...` or blob URLs in a content string with self-contained Base64 data URIs.
   * Works for both Markdown and rendered HTML.
   */
  async replaceAssetReferencesWithBase64(content: string): Promise<string> {
    if (!this.isBrowser || !content) return content;

    let result = content;

    // 1. Replace any blob URLs currently in cache with base64
    for (const [assetName, blobUrl] of this.blobUrlCache.entries()) {
      if (result.includes(blobUrl)) {
        const base64 = await this.getAssetBase64(assetName);
        if (base64) {
          result = result.replaceAll(blobUrl, base64);
        }
      }
    }

    // 2. Find all assets/... references
    const assetRegex = /assets\/[a-zA-Z0-9_\-\.]+\.(?:png|jpe?g|gif|webp|svg|avif|bmp|ico)/gi;
    const matches = Array.from(new Set(content.match(assetRegex) || []));

    for (const match of matches) {
      const base64 = await this.getAssetBase64(match);
      if (base64) {
        result = result.replaceAll(match, base64);
      }
    }

    return result;
  }

  /**
   * Retrieve all stored media assets (useful for ZIP packaging)
   */
  async getAllAssets(): Promise<StoredAsset[]> {
    if (!this.isBrowser) return [];
    try {
      const db = await this.getDb();
      return new Promise<StoredAsset[]>((resolve, reject) => {
        const tx = db.transaction(STORE_ASSETS, 'readonly');
        const store = tx.objectStore(STORE_ASSETS);
        const req = store.getAll();

        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return [];
    }
  }

  async deleteAsset(assetName: string): Promise<void> {
    if (!this.isBrowser || !assetName) return;
    if (this.blobUrlCache.has(assetName)) {
      URL.revokeObjectURL(this.blobUrlCache.get(assetName)!);
      this.blobUrlCache.delete(assetName);
    }
    const db = await this.getDb();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_ASSETS, 'readwrite');
      const store = tx.objectStore(STORE_ASSETS);
      const req = store.delete(assetName);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // ==========================================
  // Document History Snapshots Operations
  // ==========================================

  async getHistory(docId: string): Promise<DocumentSnapshot[]> {
    if (!this.isBrowser || !docId) return [];
    try {
      const db = await this.getDb();
      return new Promise<DocumentSnapshot[]>((resolve, reject) => {
        const tx = db.transaction(STORE_HISTORY, 'readonly');
        const store = tx.objectStore(STORE_HISTORY);
        const req = store.get(docId);

        req.onsuccess = () => {
          const res = req.result as { docId: string; snapshots: DocumentSnapshot[] } | undefined;
          resolve(res?.snapshots ? res.snapshots.sort((a, b) => b.timestamp - a.timestamp) : []);
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      return [];
    }
  }

  async saveHistory(docId: string, snapshots: DocumentSnapshot[]): Promise<void> {
    if (!this.isBrowser || !docId) return;
    const db = await this.getDb();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_HISTORY, 'readwrite');
      const store = tx.objectStore(STORE_HISTORY);
      const req = store.put({ docId, snapshots });

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async deleteHistory(docId: string): Promise<void> {
    if (!this.isBrowser || !docId) return;
    const db = await this.getDb();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_HISTORY, 'readwrite');
      const store = tx.objectStore(STORE_HISTORY);
      const req = store.delete(docId);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // ==========================================
  // Key-Value App Settings Operations
  // ==========================================

  async getSetting<T>(key: string, defaultValue?: T): Promise<T | undefined> {
    if (!this.isBrowser || !key) return defaultValue;
    try {
      const db = await this.getDb();
      return new Promise<T | undefined>((resolve, reject) => {
        const tx = db.transaction(STORE_SETTINGS, 'readonly');
        const store = tx.objectStore(STORE_SETTINGS);
        const req = store.get(key);

        req.onsuccess = () => {
          const res = req.result as { key: string; value: T } | undefined;
          resolve(res ? res.value : defaultValue);
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      return defaultValue;
    }
  }

  async setSetting(key: string, value: any): Promise<void> {
    if (!this.isBrowser || !key) return;
    const db = await this.getDb();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_SETTINGS, 'readwrite');
      const store = tx.objectStore(STORE_SETTINGS);
      const req = store.put({ key, value });

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
}
