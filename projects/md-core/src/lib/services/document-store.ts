import { Injectable, computed, effect, signal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MarkdownDocument, createDocument } from '../models/document.model';

const STORAGE_KEY = 'md-view-documents';
const ACTIVE_KEY = 'md-view-active-id';

@Injectable({ providedIn: 'root' })
export class DocumentStore {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  /** All documents */
  private readonly _documents = signal<MarkdownDocument[]>(this.loadDocuments());

  /** ID of the active document */
  private readonly _activeId = signal<string | null>(this.loadActiveId());

  /** Public readonly signals */
  readonly documents = this._documents.asReadonly();
  readonly activeId = this._activeId.asReadonly();

  /** Derived: currently active document */
  readonly activeDocument = computed(() => {
    const id = this._activeId();
    return this._documents().find((d) => d.id === id) ?? null;
  });

  /** Derived: documents sorted by updatedAt (newest first) */
  readonly sortedDocuments = computed(() =>
    [...this._documents()].sort((a, b) => b.updatedAt - a.updatedAt),
  );

  constructor() {
    // Auto-persist to localStorage
    effect(() => {
      const docs = this._documents();
      if (this.isBrowser) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
      }
    });

    effect(() => {
      const id = this._activeId();
      if (this.isBrowser) {
        if (id) {
          localStorage.setItem(ACTIVE_KEY, id);
        } else {
          localStorage.removeItem(ACTIVE_KEY);
        }
      }
    });

    // If no documents exist, create a welcome document
    if (this._documents().length === 0) {
      const welcome = createDocument('Welcome', WELCOME_CONTENT);
      this._documents.set([welcome]);
      this._activeId.set(welcome.id);
    } else if (!this._activeId()) {
      // Select the first document if none is active
      this._activeId.set(this._documents()[0]?.id ?? null);
    }
  }

  /** Select a document by ID */
  select(id: string): void {
    this._activeId.set(id);
  }

  /** Create a new document and select it */
  create(title: string = 'Untitled', content: string = ''): MarkdownDocument {
    const doc = createDocument(title, content);
    this._documents.update((docs) => [...docs, doc]);
    this._activeId.set(doc.id);
    return doc;
  }

  /** Update the active document's content */
  updateContent(content: string): void {
    const id = this._activeId();
    if (!id) return;
    this._documents.update((docs) =>
      docs.map((d) =>
        d.id === id ? { ...d, content, updatedAt: Date.now() } : d,
      ),
    );
  }

  /** Update a document's title */
  updateTitle(id: string, title: string): void {
    this._documents.update((docs) =>
      docs.map((d) =>
        d.id === id ? { ...d, title, updatedAt: Date.now() } : d,
      ),
    );
  }

  /** Delete a document */
  delete(id: string): void {
    this._documents.update((docs) => docs.filter((d) => d.id !== id));
    if (this._activeId() === id) {
      this._activeId.set(this._documents()[0]?.id ?? null);
    }
  }

  /** Add multiple documents (for file import) */
  addDocuments(docs: MarkdownDocument[]): void {
    this._documents.update((existing) => [...existing, ...docs]);
    if (docs.length > 0) {
      this._activeId.set(docs[0].id);
    }
  }

  private loadDocuments(): MarkdownDocument[] {
    if (!this.isBrowser) return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private loadActiveId(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem(ACTIVE_KEY);
  }
}

const WELCOME_CONTENT = `# Welcome to MarkdownView ✨

A **Notion-inspired** markdown editor with live preview.

## Features

- 📝 **Edit** — Write in raw markdown with syntax support
- 👁️ **Preview** — See rendered output in real-time
- 🔀 **Split** — Side-by-side editing and preview
- 📁 **Import** — Drag & drop \`.md\` files or import folders
- 💾 **Auto-save** — Everything persists in your browser

## Markdown Examples

### Text Formatting

**Bold text**, *italic text*, ~~strikethrough~~, \`inline code\`

### Links & Images

[Visit Angular](https://angular.dev)

### Code Blocks

\`\`\`typescript
const greeting = signal('Hello, Markdown!');
const upper = computed(() => greeting().toUpperCase());
\`\`\`

### Lists

- First item
- Second item
  - Nested item
  - Another nested

1. Ordered first
2. Ordered second

### Task List

- [x] Create the editor
- [x] Add markdown preview
- [ ] Take over the world

### Blockquote

> "The best way to predict the future is to invent it."
> — Alan Kay

### Table

| Feature | Status |
|---------|--------|
| Editor | ✅ Done |
| Preview | ✅ Done |
| Split View | ✅ Done |
| File Import | ✅ Done |

---

Start editing to see the magic! 🚀
`;
