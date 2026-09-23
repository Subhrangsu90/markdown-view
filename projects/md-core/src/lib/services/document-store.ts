import { Injectable, computed, effect, signal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MarkdownDocument, createDocument } from '../models/document.model';

const STORAGE_KEY = 'md-view-documents';
const ACTIVE_KEY = 'md-view-active-id';
const FOLDERS_KEY = 'md-view-folders';

@Injectable({ providedIn: 'root' })
export class DocumentStore {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  /** All documents */
  private readonly _documents = signal<MarkdownDocument[]>(this.loadDocuments());

  /** ID of the active document */
  private readonly _activeId = signal<string | null>(this.loadActiveId());

  /** User-created and imported folders */
  private readonly _customFolders = signal<string[]>(this.loadFolders());

  /** Public readonly signals */
  readonly documents = this._documents.asReadonly();
  readonly activeId = this._activeId.asReadonly();
  readonly customFolders = this._customFolders.asReadonly();

  /** Derived: currently active document */
  readonly activeDocument = computed(() => {
    const id = this._activeId();
    return this._documents().find((d) => d.id === id) ?? null;
  });

  /** Derived: documents sorted by custom order or updatedAt */
  readonly sortedDocuments = computed(() =>
    [...this._documents()].sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      return b.updatedAt - a.updatedAt;
    }),
  );

  /** Derived: favorite / pinned documents */
  readonly favoriteDocuments = computed(() =>
    this.sortedDocuments().filter((d) => !!d.isFavorite),
  );

  /** Derived: non-favorite documents */
  readonly regularDocuments = computed(() =>
    this.sortedDocuments().filter((d) => !d.isFavorite),
  );

  /** Derived: all active folders preserving custom drag order */
  readonly folders = computed(() => {
    const list: string[] = [];
    const seen = new Set<string>();

    for (const f of this._customFolders()) {
      const trimmed = f.trim();
      if (trimmed && !seen.has(trimmed.toLowerCase())) {
        seen.add(trimmed.toLowerCase());
        list.push(trimmed);
      }
    }

    for (const d of this._documents()) {
      let folderName: string | undefined = d.folder?.trim();
      if (!folderName && d.path && d.path.includes('/')) {
        folderName = d.path.substring(0, d.path.lastIndexOf('/')).trim();
      }
      if (folderName && !seen.has(folderName.toLowerCase())) {
        seen.add(folderName.toLowerCase());
        list.push(folderName);
      }
    }

    return list;
  });

  /** Derived: documents without any folder (root documents) */
  readonly uncategorizedDocuments = computed(() =>
    this.sortedDocuments().filter((d) => !d.folder?.trim()),
  );

  constructor() {
    // Auto-persist documents to localStorage
    effect(() => {
      const docs = this._documents();
      if (this.isBrowser) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
      }
    });

    // Auto-persist activeId to localStorage
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

    // Auto-persist folders to localStorage
    effect(() => {
      const f = this._customFolders();
      if (this.isBrowser) {
        localStorage.setItem(FOLDERS_KEY, JSON.stringify(f));
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

  /** Create a new document and select it, optionally in a folder */
  create(title: string = 'Untitled', content: string = '', folder?: string): MarkdownDocument {
    const doc = createDocument(title, content, null, 'document', folder);
    this._documents.update((docs) => [...docs, doc]);
    if (folder?.trim()) {
      this.registerFolder(folder.trim());
    }
    this._activeId.set(doc.id);
    return doc;
  }

  /** Create a new empty folder if it doesn't already exist */
  createFolder(name: string): boolean {
    const trimmed = name.trim();
    if (!trimmed) return false;
    const current = this.folders();
    if (current.some((f) => f.toLowerCase() === trimmed.toLowerCase())) {
      return false;
    }
    this._customFolders.update((folders) => [...folders, trimmed]);
    return true;
  }

  /** Rename an existing folder across custom folders and documents */
  renameFolder(oldName: string, newName: string): void {
    const oldTrimmed = oldName.trim();
    const newTrimmed = newName.trim();
    if (!newTrimmed || oldTrimmed === newTrimmed) return;

    this._customFolders.update((folders) =>
      folders.map((f) => (f.toLowerCase() === oldTrimmed.toLowerCase() ? newTrimmed : f)),
    );

    this._documents.update((docs) =>
      docs.map((d) => {
        if (d.folder && d.folder.toLowerCase() === oldTrimmed.toLowerCase()) {
          const newPath = d.path ? d.path.replace(new RegExp(`^${oldTrimmed}/`, 'i'), `${newTrimmed}/`) : undefined;
          return { ...d, folder: newTrimmed, path: newPath, updatedAt: Date.now() };
        }
        return d;
      }),
    );
  }

  /** Delete a folder; optionally delete all documents inside it or unassign them to root */
  deleteFolder(name: string, deleteDocuments: boolean = false): void {
    const trimmed = name.trim().toLowerCase();
    this._customFolders.update((folders) =>
      folders.filter((f) => f.toLowerCase() !== trimmed),
    );

    if (deleteDocuments) {
      this._documents.update((docs) =>
        docs.filter((d) => !d.folder || d.folder.toLowerCase() !== trimmed),
      );
      if (this.activeDocument()?.folder?.toLowerCase() === trimmed) {
        this._activeId.set(this._documents()[0]?.id ?? null);
      }
    } else {
      this._documents.update((docs) =>
        docs.map((d) =>
          d.folder && d.folder.toLowerCase() === trimmed
            ? { ...d, folder: undefined, updatedAt: Date.now() }
            : d,
        ),
      );
    }
  }

  /** Move a document to a specific folder (or null for root) */
  moveToFolder(id: string, folder: string | null): void {
    const trimmedFolder = folder?.trim() || undefined;
    if (trimmedFolder) {
      this.registerFolder(trimmedFolder);
    }
    this._documents.update((docs) =>
      docs.map((d) =>
        d.id === id ? { ...d, folder: trimmedFolder, updatedAt: Date.now() } : d,
      ),
    );
  }

  /** Move multiple documents to a folder (or null for root) */
  moveManyToFolder(ids: string[], folder: string | null): void {
    if (ids.length === 0) return;
    const trimmedFolder = folder?.trim() || undefined;
    if (trimmedFolder) {
      this.registerFolder(trimmedFolder);
    }
    const idSet = new Set(ids);
    this._documents.update((docs) =>
      docs.map((d) =>
        idSet.has(d.id) ? { ...d, folder: trimmedFolder, updatedAt: Date.now() } : d,
      ),
    );
  }

  /** Delete multiple documents in bulk */
  deleteMany(ids: string[]): void {
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    this._documents.update((docs) => docs.filter((d) => !idSet.has(d.id)));
    if (this._activeId() && idSet.has(this._activeId()!)) {
      this._activeId.set(this._documents()[0]?.id ?? null);
    }
  }

  /** Toggle favorite status for multiple documents in bulk */
  toggleFavoriteMany(ids: string[], forceFavorite?: boolean): void {
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    this._documents.update((docs) =>
      docs.map((d) => {
        if (!idSet.has(d.id)) return d;
        const fav = forceFavorite !== undefined ? forceFavorite : !d.isFavorite;
        return { ...d, isFavorite: fav, updatedAt: Date.now() };
      }),
    );
  }

  /**
   * Reorder a document before or after a target document, optionally moving it into a folder.
   */
  reorderDocuments(
    sourceDocId: string,
    targetDocId: string,
    position: 'before' | 'after' = 'before',
    targetFolder?: string | null,
  ): void {
    if (sourceDocId === targetDocId && targetFolder === undefined) return;

    const docs = [...this._documents()];
    const sourceIdx = docs.findIndex((d) => d.id === sourceDocId);
    if (sourceIdx === -1) return;

    const [sourceDoc] = docs.splice(sourceIdx, 1);

    if (targetFolder !== undefined) {
      const cleanFolder = targetFolder?.trim() || undefined;
      sourceDoc.folder = cleanFolder;
      if (cleanFolder) {
        this.registerFolder(cleanFolder);
      }
    }

    const targetIdx = docs.findIndex((d) => d.id === targetDocId);
    const insertIdx = targetIdx === -1
      ? docs.length
      : position === 'after'
        ? targetIdx + 1
        : targetIdx;

    docs.splice(insertIdx, 0, sourceDoc);

    const baseTime = Date.now();
    docs.forEach((doc, idx) => {
      doc.order = baseTime + idx * 1000;
    });

    this._documents.set(docs);
  }

  /**
   * Reorder folders before or after a target folder.
   */
  reorderFolders(
    sourceFolder: string,
    targetFolder: string,
    position: 'before' | 'after' = 'before',
  ): void {
    if (sourceFolder.toLowerCase() === targetFolder.toLowerCase()) return;

    const all = [...this.folders()];
    const sourceIdx = all.findIndex((f) => f.toLowerCase() === sourceFolder.toLowerCase());
    if (sourceIdx === -1) return;

    const [removed] = all.splice(sourceIdx, 1);
    const targetIdx = all.findIndex((f) => f.toLowerCase() === targetFolder.toLowerCase());
    const insertIdx = targetIdx === -1
      ? all.length
      : position === 'after'
        ? targetIdx + 1
        : targetIdx;

    all.splice(insertIdx, 0, removed);
    this._customFolders.set(all);
  }

  /** Get all documents within a specific folder */
  getDocumentsInFolder(folder: string): MarkdownDocument[] {
    const target = folder.trim().toLowerCase();
    return this.sortedDocuments().filter(
      (d) => d.folder && d.folder.toLowerCase() === target,
    );
  }

  private registerFolder(folder: string): void {
    const trimmed = folder.trim();
    if (!trimmed) return;
    if (!this._customFolders().some((f) => f.toLowerCase() === trimmed.toLowerCase())) {
      this._customFolders.update((f) => [...f, trimmed]);
    }
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
    const trimmed = title.trim();
    this._documents.update((docs) =>
      docs.map((d) =>
        d.id === id ? { ...d, title: trimmed || 'Untitled', updatedAt: Date.now() } : d,
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

  /** Toggle a document's favorite status */
  toggleFavorite(id: string): void {
    this._documents.update((docs) =>
      docs.map((d) =>
        d.id === id ? { ...d, isFavorite: !d.isFavorite, updatedAt: Date.now() } : d,
      ),
    );
  }

  /** Update a document's icon/emoji */
  updateIcon(id: string, icon: string): void {
    this._documents.update((docs) =>
      docs.map((d) =>
        d.id === id ? { ...d, icon, updatedAt: Date.now() } : d,
      ),
    );
  }

  /** Duplicate a document and select the clone */
  duplicate(id: string): MarkdownDocument | null {
    const original = this._documents().find((d) => d.id === id);
    if (!original) return null;
    const cloned = createDocument(
      `${original.title} (Copy)`,
      original.content,
      original.parentId,
      original.icon ?? 'document',
      original.folder,
    );
    this._documents.update((docs) => [...docs, cloned]);
    this._activeId.set(cloned.id);
    return cloned;
  }

  /** Add multiple documents (for file import) */
  addDocuments(docs: MarkdownDocument[]): void {
    this._documents.update((existing) => [...existing, ...docs]);
    for (const doc of docs) {
      if (doc.folder) {
        this.registerFolder(doc.folder);
      }
    }
    if (docs.length > 0) {
      this._activeId.set(docs[0].id);
    }
  }

  /** Find a document by path, filename, or title (fuzzy match) */
  findByPathOrTitle(query: string): MarkdownDocument | null {
    if (!query) return null;
    const clean = decodeURIComponent(query).trim();
    // Remove query params or anchors if passed
    const target = clean.split('#')[0].split('?')[0].replace(/^\.?\//, '');
    const withoutExt = target.replace(/\.(md|markdown|txt|html)$/i, '');
    const normalize = (s: string) => s.toLowerCase().replace(/[-_\s./\\]+/g, '');

    const normalizedTarget = normalize(target);
    const normalizedWithoutExt = normalize(withoutExt);

    const docs = this._documents();

    // 1. Direct path, folder/title or title match
    const directMatch = docs.find((d) => {
      const fullPath = d.folder ? `${d.folder}/${d.title}` : d.title;
      return (
        (d.path && (d.path === target || d.path.endsWith('/' + target) || d.path.endsWith('\\' + target))) ||
        d.title.toLowerCase() === target.toLowerCase() ||
        d.title.toLowerCase() === withoutExt.toLowerCase() ||
        fullPath.toLowerCase() === target.toLowerCase() ||
        fullPath.toLowerCase() === withoutExt.toLowerCase()
      );
    });
    if (directMatch) return directMatch;

    // 2. Normalized match (ignores dashes, underscores, spaces, slashes)
    const normalizedMatch = docs.find((d) => {
      const docTitleNorm = normalize(d.title);
      const docPathNorm = d.path ? normalize(d.path) : '';
      const docFolderNorm = d.folder ? normalize(d.folder) : '';
      const fullNorm = docFolderNorm ? `${docFolderNorm}${docTitleNorm}` : docTitleNorm;
      return (
        docTitleNorm === normalizedWithoutExt ||
        docTitleNorm === normalizedTarget ||
        fullNorm === normalizedWithoutExt ||
        fullNorm === normalizedTarget ||
        (docPathNorm && (docPathNorm === normalizedTarget || docPathNorm.endsWith(normalizedTarget)))
      );
    });
    if (normalizedMatch) return normalizedMatch;

    // 3. Substring / partial match
    const partialMatch = docs.find((d) => {
      const docTitleNorm = normalize(d.title);
      return docTitleNorm.includes(normalizedWithoutExt) || normalizedWithoutExt.includes(docTitleNorm);
    });
    return partialMatch ?? null;
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

  private loadFolders(): string[] {
    if (!this.isBrowser) return [];
    try {
      const raw = localStorage.getItem(FOLDERS_KEY);
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
