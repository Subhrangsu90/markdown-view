import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MarkdownDocument } from '../models/document.model';
import { IndexedDbService, DocumentSnapshot } from './indexed-db.service';

export type { DocumentSnapshot };

const MAX_SNAPSHOTS = 35;
const MIN_INTERVAL_MS = 30000; // minimum 30s between automatic snapshots

@Injectable({ providedIn: 'root' })
export class DocumentHistoryService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly db = inject(IndexedDbService);

  private readonly cache = new Map<string, DocumentSnapshot[]>();
  private readonly lastSnapshotTime = new Map<string, number>();

  /**
   * Synchronously retrieves snapshots from memory cache, triggering background load if empty.
   */
  getSnapshots(docId: string): DocumentSnapshot[] {
    if (!this.isBrowser || !docId) return [];

    if (!this.cache.has(docId)) {
      this.loadSnapshotsAsync(docId).catch(console.error);
      return [];
    }

    return this.cache.get(docId) || [];
  }

  /**
   * Asynchronously loads snapshots from IndexedDB (with one-time localStorage migration fallback).
   */
  async loadSnapshotsAsync(docId: string): Promise<DocumentSnapshot[]> {
    if (!this.isBrowser || !docId) return [];

    try {
      const fromDb = await this.db.getHistory(docId);
      if (fromDb && fromDb.length > 0) {
        this.cache.set(docId, fromDb);
        return fromDb;
      }

      // Check legacy localStorage migration
      const legacyRaw = localStorage.getItem(`md-view-hist-${docId}`);
      if (legacyRaw) {
        try {
          const legacy = JSON.parse(legacyRaw) as DocumentSnapshot[];
          if (Array.isArray(legacy) && legacy.length > 0) {
            this.cache.set(docId, legacy);
            await this.db.saveHistory(docId, legacy);
            localStorage.removeItem(`md-view-hist-${docId}`);
            return legacy;
          }
        } catch {}
      }

      this.cache.set(docId, []);
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Conditionally creates a new snapshot for a document and saves to IndexedDB.
   */
  captureSnapshot(doc: MarkdownDocument, force: boolean = false): void {
    if (!this.isBrowser || !doc || !doc.id || doc.isLocked) return;

    const now = Date.now();
    const lastTime = this.lastSnapshotTime.get(doc.id) || 0;

    if (!force && now - lastTime < MIN_INTERVAL_MS) {
      return;
    }

    const currentList = this.cache.get(doc.id) || [];
    const lastSnapshot = currentList[0];

    // Don't record if content is identical
    if (lastSnapshot && lastSnapshot.content === doc.content && lastSnapshot.title === doc.title) {
      return;
    }

    const trimmed = doc.content.trim();
    const wordCount = trimmed ? trimmed.split(/\s+/).length : 0;

    const newSnapshot: DocumentSnapshot = {
      id: crypto.randomUUID ? crypto.randomUUID() : `snap-${Date.now()}-${Math.random()}`,
      docId: doc.id,
      title: doc.title,
      content: doc.content,
      timestamp: now,
      charCount: doc.content.length,
      wordCount,
    };

    const updated = [newSnapshot, ...currentList].slice(0, MAX_SNAPSHOTS);
    this.cache.set(doc.id, updated);
    this.lastSnapshotTime.set(doc.id, now);

    this.db.saveHistory(doc.id, updated).catch(console.error);
  }

  /**
   * Clears snapshots for a deleted document.
   */
  deleteHistory(docId: string): void {
    if (!this.isBrowser || !docId) return;
    this.cache.delete(docId);
    this.lastSnapshotTime.delete(docId);
    this.db.deleteHistory(docId).catch(console.error);
  }
}
