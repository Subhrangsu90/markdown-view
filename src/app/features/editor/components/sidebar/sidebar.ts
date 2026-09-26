// Sidebar component - Export & Location setup
import { Component, inject, input, output, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  DocumentStore,
  FileImportService,
  FileExportService,
  LocalDirectoryService,
  TimeAgo,
  MarkdownDocument,
  createDocument,
  MdIcon,
  DOCUMENT_ICON_PALETTE,
  resolveIconName,
  extractDocumentTags,
} from 'md-core';

export interface FolderGroup {
  name: string;
  documents: MarkdownDocument[];
  totalCount: number;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [TimeAgo, FormsModule, MdIcon],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
  host: {
    '[class.open]': 'isOpen()',
    '(window:keydown.escape)': 'onEscape()',
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class Sidebar {
  protected readonly store = inject(DocumentStore);
  protected readonly fileImport = inject(FileImportService);
  protected readonly fileExport = inject(FileExportService);
  protected readonly localDir = inject(LocalDirectoryService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly isOpen = input<boolean>(true);
  readonly toggleSidebar = output<void>();
  readonly openTemplates = output<void>();
  readonly openAbout = output<void>();
  readonly openGraph = output<void>();
  readonly openCommandPalette = output<void>();
  readonly viewModeChange = output<'editor' | 'kanban' | 'table'>();

  protected readonly searchQuery = signal('');
  protected readonly activeTag = signal<string | null>(null);
  protected readonly isTagsCollapsed = signal<boolean>(false);

  // Dropdown menus in sidebar action toolbar
  protected readonly isImportMenuOpen = signal<boolean>(false);
  protected readonly isExportMenuOpen = signal<boolean>(false);

  // Delete confirmation state
  protected readonly pendingDeleteId = signal<string | null>(null);
  protected readonly pendingDeleteTitle = computed(() => {
    const id = this.pendingDeleteId();
    if (!id) return '';
    const doc = this.store.documents().find((d) => d.id === id);
    return doc?.title || 'Untitled';
  });
  protected readonly pendingDeleteFolderName = signal<string | null>(null);
  protected readonly isBatchDeleting = signal<boolean>(false);

  // Multi-selection state
  protected readonly selectedDocIds = signal<Set<string>>(new Set());
  protected readonly lastSelectedId = signal<string | null>(null);
  protected readonly isBatchMoveOpen = signal<boolean>(false);

  // Folder UI state
  protected readonly collapsedFolders = signal<Set<string>>(new Set());
  protected readonly isCreatingFolder = signal(false);
  protected readonly newFolderName = signal('');
  protected readonly editingFolder = signal<string | null>(null);
  protected readonly renameFolderName = signal('');

  // Drag and Drop state
  protected readonly draggingDocId = signal<string | null>(null);
  protected readonly draggingFolder = signal<string | null>(null);
  protected readonly dragOverFolder = signal<string | null>(null);
  protected readonly dragOverDocId = signal<string | null>(null);
  protected readonly dragOverPosition = signal<'before' | 'after' | null>(null);
  protected readonly dragOverRoot = signal<boolean>(false);

  private docMatchesSearchAndTag(doc: MarkdownDocument, query: string, tag: string | null): boolean {
    if (tag) {
      const docTags = extractDocumentTags(doc.content, doc.tags);
      if (!docTags.includes(tag.toLowerCase())) return false;
    }
    if (query) {
      return doc.title.toLowerCase().includes(query) || doc.content.toLowerCase().includes(query);
    }
    return true;
  }

  protected readonly filteredFavoriteDocuments = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const tag = this.activeTag();
    const favs = this.store.favoriteDocuments();
    return favs.filter((d) => this.docMatchesSearchAndTag(d, q, tag));
  });

  protected readonly folderGroups = computed<FolderGroup[]>(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const tag = this.activeTag();
    const allFolders = this.store.folders();
    const docs = this.store.sortedDocuments();

    return allFolders
      .map((folderName) => {
        const folderDocs = docs.filter(
          (d) => d.folder && d.folder.toLowerCase() === folderName.toLowerCase(),
        );
        const filteredDocs = folderDocs.filter((d) => this.docMatchesSearchAndTag(d, q, tag));

        return {
          name: folderName,
          documents: filteredDocs,
          totalCount: folderDocs.length,
        };
      })
      .filter((group) => (!q && !tag) || group.documents.length > 0);
  });

  protected readonly filteredUncategorizedDocuments = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const tag = this.activeTag();
    const uncat = this.store.uncategorizedDocuments();
    return uncat.filter((d) => this.docMatchesSearchAndTag(d, q, tag));
  });

  protected toggleTag(tag: string): void {
    this.activeTag.update((t) => (t === tag ? null : tag));
  }

  protected clearTag(): void {
    this.activeTag.set(null);
  }

  protected readonly allVisibleDocIds = computed<string[]>(() => {
    const ids: string[] = [];
    // Favorites
    for (const d of this.filteredFavoriteDocuments()) {
      if (!ids.includes(d.id)) ids.push(d.id);
    }
    // Folders (if not collapsed)
    for (const group of this.folderGroups()) {
      if (!this.isFolderCollapsed(group.name)) {
        for (const d of group.documents) {
          if (!ids.includes(d.id)) ids.push(d.id);
        }
      }
    }
    // Root pages
    for (const d of this.filteredUncategorizedDocuments()) {
      if (!ids.includes(d.id)) ids.push(d.id);
    }
    return ids;
  });

  protected handleDocClick(event: MouseEvent, docId: string): void {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      this.toggleDocSelection(docId);
      return;
    }

    if (event.shiftKey && this.lastSelectedId()) {
      event.preventDefault();
      this.selectRange(this.lastSelectedId()!, docId);
      return;
    }

    // Normal click: if multi-selection is active, clear it first
    if (this.selectedDocIds().size > 0) {
      this.clearSelection();
    }
    this.lastSelectedId.set(docId);
    this.selectDocument(docId);
  }

  protected toggleDocSelection(docId: string, event?: Event): void {
    if (event) event.stopPropagation();
    this.selectedDocIds.update((set) => {
      const next = new Set(set);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
    this.lastSelectedId.set(docId);
  }

  protected selectRange(fromId: string, toId: string): void {
    const list = this.allVisibleDocIds();
    const fromIdx = list.indexOf(fromId);
    const toIdx = list.indexOf(toId);
    if (fromIdx === -1 || toIdx === -1) {
      this.toggleDocSelection(toId);
      return;
    }
    const start = Math.min(fromIdx, toIdx);
    const end = Math.max(fromIdx, toIdx);
    const rangeIds = list.slice(start, end + 1);

    this.selectedDocIds.update((set) => {
      const next = new Set(set);
      for (const id of rangeIds) {
        next.add(id);
      }
      return next;
    });
    this.lastSelectedId.set(toId);
  }

  protected selectAllVisible(): void {
    this.selectedDocIds.set(new Set(this.allVisibleDocIds()));
  }

  protected clearSelection(): void {
    this.selectedDocIds.set(new Set());
    this.isBatchMoveOpen.set(false);
  }

  protected batchMoveToFolder(folder: string | null): void {
    const ids = Array.from(this.selectedDocIds());
    if (ids.length === 0) return;
    this.store.moveManyToFolder(ids, folder);
    this.isBatchMoveOpen.set(false);
    this.clearSelection();
  }

  protected batchDelete(): void {
    const ids = Array.from(this.selectedDocIds());
    if (ids.length === 0) return;
    this.isBatchDeleting.set(true);
  }

  protected confirmBatchDelete(): void {
    const ids = Array.from(this.selectedDocIds());
    if (ids.length > 0) {
      this.store.deleteMany(ids);
      this.clearSelection();
    }
    this.isBatchDeleting.set(false);
  }

  protected cancelBatchDelete(): void {
    this.isBatchDeleting.set(false);
  }

  protected batchToggleFavorite(forceFav?: boolean): void {
    const ids = Array.from(this.selectedDocIds());
    if (ids.length === 0) return;
    this.store.toggleFavoriteMany(ids, forceFav);
  }

  protected async batchExportZip(): Promise<void> {
    const ids = this.selectedDocIds();
    const docs = this.store.documents().filter((d) => ids.has(d.id));
    if (docs.length === 0) return;
    await this.fileExport.exportAllAsZip(docs, `selection-${docs.length}-documents.zip`);
  }

  // Action Toolbar Dropdown Handlers
  protected toggleImportMenu(event?: Event): void {
    if (event) event.stopPropagation();
    this.isExportMenuOpen.set(false);
    this.isImportMenuOpen.update((v) => !v);
  }

  protected toggleExportMenu(event?: Event): void {
    if (event) event.stopPropagation();
    this.isImportMenuOpen.set(false);
    this.isExportMenuOpen.update((v) => !v);
  }

  protected closeSidebarMenus(): void {
    this.isImportMenuOpen.set(false);
    this.isExportMenuOpen.set(false);
  }

  protected onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.sidebar-menu-wrapper') && !target.closest('.sidebar-dropdown-menu')) {
      this.closeSidebarMenus();
    }
    if (!target.closest('.batch-move-wrapper')) {
      this.isBatchMoveOpen.set(false);
    }
  }

  protected onEscape(): void {
    if (this.pendingDeleteId()) {
      this.cancelDelete();
      return;
    }
    if (this.pendingDeleteFolderName()) {
      this.cancelDeleteFolder();
      return;
    }
    if (this.isBatchDeleting()) {
      this.cancelBatchDelete();
      return;
    }
    if (this.isImportMenuOpen() || this.isExportMenuOpen()) {
      this.closeSidebarMenus();
      return;
    }
    if (this.isBatchMoveOpen()) {
      this.isBatchMoveOpen.set(false);
      return;
    }
    if (this.selectedDocIds().size > 0) {
      this.clearSelection();
      return;
    }
    if (this.isCreatingFolder()) {
      this.cancelCreateFolder();
      return;
    }
    if (this.editingFolder()) {
      this.cancelRenameFolder();
      return;
    }
  }

  // Import Actions
  protected async importFiles(): Promise<void> {
    this.closeSidebarMenus();
    await this.fileImport.importFiles();
  }

  protected async importFolder(): Promise<void> {
    this.closeSidebarMenus();
    await this.fileImport.importFolder();
  }

  protected async connectLocalFolder(): Promise<void> {
    this.closeSidebarMenus();
    await this.localDir.connectDirectory();
  }

  protected async importFromLocalFolder(): Promise<void> {
    this.closeSidebarMenus();
    const imported = await this.localDir.importFromConnectedDirectory();
    if (imported.length > 0) {
      const docs = imported.map((item) => createDocument(item.title, item.content, item.folder));
      this.store.addDocuments(docs);
    }
  }

  // Export Actions
  protected async exportAllZip(): Promise<void> {
    this.closeSidebarMenus();
    await this.fileExport.exportAllAsZip(this.store.documents());
  }

  protected async syncAllToLocalFolder(): Promise<void> {
    this.closeSidebarMenus();
    await this.localDir.syncAllDocuments(this.store.documents());
  }

  protected async disconnectLocalFolder(): Promise<void> {
    this.closeSidebarMenus();
    await this.localDir.disconnectDirectory();
  }

  protected createDocument(folder?: string): void {
    this.store.create('Untitled', '', folder);
    if (this.isBrowser && window.innerWidth < 768) {
      this.toggleSidebar.emit();
    }
  }

  protected selectDocument(id: string): void {
    this.store.select(id);
    if (this.isBrowser && window.innerWidth < 768) {
      this.toggleSidebar.emit();
    }
  }

  protected deleteDocument(event: Event, id: string): void {
    event.stopPropagation();
    this.pendingDeleteId.set(id);
  }

  protected confirmDelete(): void {
    const id = this.pendingDeleteId();
    if (id) {
      this.store.delete(id);
    }
    this.pendingDeleteId.set(null);
  }

  protected cancelDelete(): void {
    this.pendingDeleteId.set(null);
  }

  protected toggleFavorite(event: Event, id: string): void {
    event.stopPropagation();
    this.store.toggleFavorite(id);
  }

  protected duplicateDocument(event: Event, id: string): void {
    event.stopPropagation();
    this.store.duplicate(id);
  }

  protected cycleIcon(event: Event, id: string, currentIcon: string = 'document'): void {
    event.stopPropagation();
    const resolved = resolveIconName(currentIcon);
    const currentIndex = DOCUMENT_ICON_PALETTE.indexOf(resolved);
    const nextIndex = (currentIndex + 1) % DOCUMENT_ICON_PALETTE.length;
    this.store.updateIcon(id, DOCUMENT_ICON_PALETTE[nextIndex]);
  }

  protected onSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  protected toggleFolder(folderName: string, event?: Event): void {
    if (event) event.stopPropagation();
    this.collapsedFolders.update((set) => {
      const next = new Set(set);
      if (next.has(folderName)) {
        next.delete(folderName);
      } else {
        next.add(folderName);
      }
      return next;
    });
  }

  protected isFolderCollapsed(folderName: string): boolean {
    return this.collapsedFolders().has(folderName);
  }

  protected startCreateFolder(): void {
    this.newFolderName.set('');
    this.isCreatingFolder.set(true);
  }

  protected confirmCreateFolder(): void {
    const name = this.newFolderName().trim();
    if (name) {
      this.store.createFolder(name);
    }
    this.isCreatingFolder.set(false);
    this.newFolderName.set('');
  }

  protected cancelCreateFolder(): void {
    this.isCreatingFolder.set(false);
    this.newFolderName.set('');
  }

  protected startRenameFolder(event: Event, folderName: string): void {
    event.stopPropagation();
    this.editingFolder.set(folderName);
    this.renameFolderName.set(folderName);
  }

  protected confirmRenameFolder(oldName: string): void {
    const newName = this.renameFolderName().trim();
    if (newName && newName !== oldName) {
      this.store.renameFolder(oldName, newName);
    }
    this.editingFolder.set(null);
    this.renameFolderName.set('');
  }

  protected cancelRenameFolder(): void {
    this.editingFolder.set(null);
    this.renameFolderName.set('');
  }

  protected deleteFolder(event: Event, folderName: string): void {
    event.stopPropagation();
    this.pendingDeleteFolderName.set(folderName);
  }

  protected confirmDeleteFolder(): void {
    const folder = this.pendingDeleteFolderName();
    if (folder) {
      this.store.deleteFolder(folder, false);
    }
    this.pendingDeleteFolderName.set(null);
  }

  protected cancelDeleteFolder(): void {
    this.pendingDeleteFolderName.set(null);
  }

  protected async exportFolder(event: Event, folderName: string): Promise<void> {
    event.stopPropagation();
    await this.fileExport.exportFolderAsZip(folderName, this.store.documents());
  }

  // Document Drag & Drop Handlers
  protected onDocDragStart(event: DragEvent, docId: string): void {
    if (!event.dataTransfer) return;
    this.draggingDocId.set(docId);

    const isSelected = this.selectedDocIds().has(docId);
    const idsToDrag =
      isSelected && this.selectedDocIds().size > 1 ? Array.from(this.selectedDocIds()) : [docId];

    event.dataTransfer.setData('text/plain', docId);
    event.dataTransfer.setData('application/x-md-doc', docId);
    event.dataTransfer.setData('application/x-md-docs', JSON.stringify(idsToDrag));
    event.dataTransfer.effectAllowed = 'move';
  }

  protected onDocDragEnd(): void {
    this.draggingDocId.set(null);
    this.draggingFolder.set(null);
    this.dragOverFolder.set(null);
    this.dragOverDocId.set(null);
    this.dragOverPosition.set(null);
    this.dragOverRoot.set(false);
  }

  protected onDocDragOver(event: DragEvent, targetDoc: MarkdownDocument): void {
    const draggingId = this.draggingDocId();
    if (!draggingId || draggingId === targetDoc.id) return;

    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const position = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
    this.dragOverDocId.set(targetDoc.id);
    this.dragOverPosition.set(position);
  }

  protected onDocDragLeave(targetDocId: string): void {
    if (this.dragOverDocId() === targetDocId) {
      this.dragOverDocId.set(null);
      this.dragOverPosition.set(null);
    }
  }

  protected onDocDrop(event: DragEvent, targetDoc: MarkdownDocument): void {
    event.preventDefault();
    event.stopPropagation();
    const sourceId = this.draggingDocId();
    const pos = this.dragOverPosition() || 'before';

    if (sourceId && sourceId !== targetDoc.id) {
      this.store.reorderDocuments(sourceId, targetDoc.id, pos, targetDoc.folder ?? null);
    }

    this.onDocDragEnd();
  }

  // Folder Drag & Drop Handlers
  protected onFolderDragStart(event: DragEvent, folderName: string): void {
    if (!event.dataTransfer) return;
    this.draggingFolder.set(folderName);
    event.dataTransfer.setData('application/x-md-folder', folderName);
    event.dataTransfer.effectAllowed = 'move';
  }

  protected onFolderDragOver(event: DragEvent, folderName: string): void {
    const isDoc = !!this.draggingDocId();
    const isFolder = !!this.draggingFolder() && this.draggingFolder() !== folderName;

    if (!isDoc && !isFolder) return;

    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }

    this.dragOverFolder.set(folderName);
  }

  protected onFolderDragLeave(folderName: string): void {
    if (this.dragOverFolder() === folderName) {
      this.dragOverFolder.set(null);
    }
  }

  protected onFolderDrop(event: DragEvent, targetFolder: string): void {
    event.preventDefault();
    event.stopPropagation();

    const docId = this.draggingDocId();
    const sourceFolder = this.draggingFolder();

    if (docId) {
      if (this.selectedDocIds().has(docId) && this.selectedDocIds().size > 1) {
        // Multi-document drop
        this.store.moveManyToFolder(Array.from(this.selectedDocIds()), targetFolder);
        this.clearSelection();
      } else {
        // Single document drop
        this.store.moveToFolder(docId, targetFolder);
      }
      // Auto expand folder so user sees the dropped document
      this.collapsedFolders.update((set) => {
        const next = new Set(set);
        next.delete(targetFolder);
        return next;
      });
    } else if (sourceFolder && sourceFolder.toLowerCase() !== targetFolder.toLowerCase()) {
      // Reorder folder
      this.store.reorderFolders(sourceFolder, targetFolder, 'after');
    }

    this.onDocDragEnd();
  }

  // Root / Pages Section Drop Handlers
  protected onRootDragOver(event: DragEvent): void {
    if (!this.draggingDocId()) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    this.dragOverRoot.set(true);
  }

  protected onRootDragLeave(): void {
    this.dragOverRoot.set(false);
  }

  protected onRootDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const docId = this.draggingDocId();
    if (docId) {
      if (this.selectedDocIds().has(docId) && this.selectedDocIds().size > 1) {
        this.store.moveManyToFolder(Array.from(this.selectedDocIds()), null);
        this.clearSelection();
      } else {
        this.store.moveToFolder(docId, null);
      }
    }
    this.onDocDragEnd();
  }
}
