import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MarkdownDocument } from '../models/document.model';

export interface DocumentSnapshot {
  id: string;
  documentId: string;
  title: string;
  content: string;
  timestamp: number;
  charCount: number;
  wordCount: number;
}

const HISTORY_PREFIX = 'md-view-hist-';
const MAX_SNAPSHOTS = 35;
const MIN_INTERVAL_MS = 30000; // minimum 30s between automatic snapshots

@Injectable({ providedIn: 'root' })
export class DocumentHistoryService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private lastSnapshotTime: Record<string, number> = {};

  /**
   * Retrieves all historical snapshots for a document, latest first.
   */
  getSnapshots(docId: string): DocumentSnapshot[] {
    if (!this.isBrowser || !docId) return [];
    try {
      const raw = localStorage.getItem(`${HISTORY_PREFIX}${docId}`);
      if (!raw) return [];
      const list: DocumentSnapshot[] = JSON.parse(raw);
      return Array.isArray(list) ? list.sort((a, b) => b.timestamp - a.timestamp) : [];
    } catch {
      return [];
    }
  }

  /**
   * Conditionally creates a new snapshot for a document.
   */
  captureSnapshot(doc: MarkdownDocument, force: boolean = false): void {
    if (!this.isBrowser || !doc || !doc.id || doc.isLocked) return;

    const now = Date.now();
    const lastTime = this.lastSnapshotTime[doc.id] || 0;

    if (!force && now - lastTime < MIN_INTERVAL_MS) {
      return;
    }

    const currentList = this.getSnapshots(doc.id);
    const lastSnapshot = currentList[0];

    // Don't record if content is identical
    if (lastSnapshot && lastSnapshot.content === doc.content && lastSnapshot.title === doc.title) {
      return;
    }

    const trimmed = doc.content.trim();
    const wordCount = trimmed ? trimmed.split(/\s+/).length : 0;

    const newSnapshot: DocumentSnapshot = {
      id: crypto.randomUUID(),
      documentId: doc.id,
      title: doc.title,
      content: doc.content,
      timestamp: now,
      charCount: doc.content.length,
      wordCount,
    };

    const updated = [newSnapshot, ...currentList].slice(0, MAX_SNAPSHOTS);
    try {
      localStorage.setItem(`${HISTORY_PREFIX}${doc.id}`, JSON.stringify(updated));
      this.lastSnapshotTime[doc.id] = now;
    } catch (e) {
      console.warn('Could not save document history snapshot:', e);
    }
  }

  /**
   * Clears snapshots for a deleted document.
   */
  deleteHistory(docId: string): void {
    if (!this.isBrowser || !docId) return;
    try {
      localStorage.removeItem(`${HISTORY_PREFIX}${docId}`);
      delete this.lastSnapshotTime[docId];
    } catch {}
  }
}
