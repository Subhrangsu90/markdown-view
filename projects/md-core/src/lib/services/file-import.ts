import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MarkdownDocument, createDocument } from '../models/document.model';
import { DocumentStore } from './document-store';

@Injectable({ providedIn: 'root' })
export class FileImportService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly store = inject(DocumentStore);

  /** Import files via file input picker */
  async importFiles(): Promise<void> {
    if (!this.isBrowser) return;
    const files = await this.pickFiles(false);
    if (files.length === 0) return;
    const docs = await this.readFilesAsDocuments(files);
    this.store.addDocuments(docs);
  }

  /** Import a folder of markdown files */
  async importFolder(): Promise<void> {
    if (!this.isBrowser) return;

    // Try File System Access API first
    if ('showDirectoryPicker' in window) {
      try {
        const dirHandle = await (window as any).showDirectoryPicker();
        const docs = await this.readDirectoryHandle(dirHandle);
        this.store.addDocuments(docs);
        return;
      } catch (e: any) {
        if (e.name === 'AbortError') return; // User cancelled
        // Fall through to input fallback
      }
    }

    // Fallback: use file input with webkitdirectory
    const files = await this.pickFiles(true);
    if (files.length === 0) return;
    const docs = await this.readFilesAsDocuments(files);
    this.store.addDocuments(docs);
  }

  /** Process dropped files from drag and drop */
  async processDroppedItems(dataTransfer: DataTransfer): Promise<void> {
    const files: File[] = [];

    // Try to get FileSystemEntry for folder support
    if (dataTransfer.items) {
      for (let i = 0; i < dataTransfer.items.length; i++) {
        const item = dataTransfer.items[i];
        const entry = item.webkitGetAsEntry?.();
        if (entry) {
          const entryFiles = await this.readEntry(entry);
          files.push(...entryFiles);
        } else if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file && this.isMarkdownFile(file.name)) {
            files.push(file);
          }
        }
      }
    } else {
      for (let i = 0; i < dataTransfer.files.length; i++) {
        const file = dataTransfer.files[i];
        if (this.isMarkdownFile(file.name)) {
          files.push(file);
        }
      }
    }

    if (files.length > 0) {
      const docs = await this.readFilesAsDocuments(files);
      this.store.addDocuments(docs);
    }
  }

  private async readEntry(entry: FileSystemEntry): Promise<File[]> {
    if (entry.isFile) {
      return new Promise((resolve) => {
        (entry as FileSystemFileEntry).file((file) => {
          if (this.isMarkdownFile(file.name)) {
            resolve([file]);
          } else {
            resolve([]);
          }
        });
      });
    } else if (entry.isDirectory) {
      const dirReader = (entry as FileSystemDirectoryEntry).createReader();
      return new Promise((resolve) => {
        dirReader.readEntries(async (entries) => {
          const allFiles: File[] = [];
          for (const e of entries) {
            const files = await this.readEntry(e);
            allFiles.push(...files);
          }
          resolve(allFiles);
        });
      });
    }
    return [];
  }

  private async readDirectoryHandle(dirHandle: any): Promise<MarkdownDocument[]> {
    const docs: MarkdownDocument[] = [];

    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file' && this.isMarkdownFile(entry.name)) {
        const file: File = await entry.getFile();
        const content = await this.readFileContent(file);
        const title = this.fileNameToTitle(file.name);
        const doc = createDocument(title, content);
        doc.path = file.name;
        docs.push(doc);
      } else if (entry.kind === 'directory') {
        const subDocs = await this.readDirectoryHandle(entry);
        docs.push(...subDocs);
      }
    }

    return docs;
  }

  private pickFiles(directory: boolean): Promise<File[]> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.md,.markdown,.txt,.mdx';
      input.multiple = true;
      if (directory) {
        input.setAttribute('webkitdirectory', '');
      }
      input.onchange = () => {
        const files: File[] = [];
        if (input.files) {
          for (let i = 0; i < input.files.length; i++) {
            const f = input.files[i];
            if (directory ? this.isMarkdownFile(f.name) : true) {
              files.push(f);
            }
          }
        }
        resolve(files);
      };
      input.oncancel = () => resolve([]);
      input.click();
    });
  }

  private async readFilesAsDocuments(files: File[]): Promise<MarkdownDocument[]> {
    const docs: MarkdownDocument[] = [];
    for (const file of files) {
      const content = await this.readFileContent(file);
      const title = this.fileNameToTitle(file.name);
      const doc = createDocument(title, content);
      doc.path = (file as any).webkitRelativePath || file.name;
      docs.push(doc);
    }
    return docs;
  }

  private readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  private fileNameToTitle(name: string): string {
    return name.replace(/\.(md|markdown|txt|mdx)$/i, '').replace(/[-_]/g, ' ');
  }

  private isMarkdownFile(name: string): boolean {
    return /\.(md|markdown|txt|mdx)$/i.test(name);
  }
}
