import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MarkdownDocument } from '../models/document.model';

@Injectable({ providedIn: 'root' })
export class FileExportService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  /** Export all documents as a structured ZIP archive preserving folders */
  async exportAllAsZip(
    documents: MarkdownDocument[],
    zipName: string = 'markdown-export.zip',
  ): Promise<void> {
    if (!this.isBrowser || documents.length === 0) return;

    const JSZipModule = await import('jszip');
    const JSZip = (JSZipModule as any).default || JSZipModule;
    const zip = new JSZip();

    const usedPaths = new Set<string>();

    for (const doc of documents) {
      const sanitizedTitle = this.sanitizeName(doc.title || 'Untitled');
      let folderPath = '';
      if (doc.folder?.trim()) {
        folderPath = doc.folder
          .split(/[\/\\]/)
          .map((part) => this.sanitizeName(part.trim()))
          .filter(Boolean)
          .join('/');
      }

      let basePath = folderPath ? `${folderPath}/${sanitizedTitle}` : sanitizedTitle;
      let finalPath = `${basePath}.md`;
      let counter = 1;
      while (usedPaths.has(finalPath.toLowerCase())) {
        finalPath = `${basePath} (${counter}).md`;
        counter++;
      }
      usedPaths.add(finalPath.toLowerCase());

      zip.file(finalPath, doc.content || '');
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    this.downloadBlob(blob, zipName.endsWith('.zip') ? zipName : `${zipName}.zip`);
  }

  /** Export only documents in a specific folder as a ZIP archive */
  async exportFolderAsZip(
    folderName: string,
    documents: MarkdownDocument[],
  ): Promise<void> {
    if (!this.isBrowser) return;

    const targetFolder = folderName.trim().toLowerCase();
    const folderDocs = documents.filter(
      (d) => d.folder && d.folder.trim().toLowerCase() === targetFolder,
    );

    if (folderDocs.length === 0) return;

    const JSZipModule = await import('jszip');
    const JSZip = (JSZipModule as any).default || JSZipModule;
    const zip = new JSZip();

    const usedPaths = new Set<string>();

    for (const doc of folderDocs) {
      const sanitizedTitle = this.sanitizeName(doc.title || 'Untitled');
      let finalPath = `${sanitizedTitle}.md`;
      let counter = 1;
      while (usedPaths.has(finalPath.toLowerCase())) {
        finalPath = `${sanitizedTitle} (${counter}).md`;
        counter++;
      }
      usedPaths.add(finalPath.toLowerCase());

      zip.file(finalPath, doc.content || '');
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const cleanFolderName = this.sanitizeName(folderName) || 'folder';
    this.downloadBlob(blob, `${cleanFolderName}.zip`);
  }

  /** Download a blob as a file in the browser */
  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /** Sanitize file and directory names against illegal filesystem characters */
  private sanitizeName(name: string): string {
    return name.replace(/[\\/:*?"<>|]/g, '_').trim() || 'Untitled';
  }
}
