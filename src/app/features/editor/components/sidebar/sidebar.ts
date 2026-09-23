import {
  Component,
  inject,
  input,
  output,
  signal,
  computed,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  DocumentStore,
  FileImportService,
  FileExportService,
  TimeAgo,
  MarkdownDocument,
  MdIcon,
  DOCUMENT_ICON_PALETTE,
  resolveIconName,
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
  },
})
export class Sidebar {
  protected readonly store = inject(DocumentStore);
  protected readonly fileImport = inject(FileImportService);
  protected readonly fileExport = inject(FileExportService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly isOpen = input<boolean>(true);
  readonly toggleSidebar = output<void>();

  protected readonly searchQuery = signal('');

  // Folder UI state
  protected readonly collapsedFolders = signal<Set<string>>(new Set());
  protected readonly isCreatingFolder = signal(false);
  protected readonly newFolderName = signal('');
  protected readonly editingFolder = signal<string | null>(null);
  protected readonly renameFolderName = signal('');

  protected readonly filteredFavoriteDocuments = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const favs = this.store.favoriteDocuments();
    if (!q) return favs;
    return favs.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.content.toLowerCase().includes(q),
    );
  });

  protected readonly folderGroups = computed<FolderGroup[]>(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const allFolders = this.store.folders();
    const docs = this.store.documents();

    return allFolders
      .map((folderName) => {
        const folderDocs = docs.filter(
          (d) => d.folder && d.folder.toLowerCase() === folderName.toLowerCase(),
        );
        const filteredDocs = q
          ? folderDocs.filter(
              (d) =>
                d.title.toLowerCase().includes(q) ||
                d.content.toLowerCase().includes(q),
            )
          : folderDocs;

        return {
          name: folderName,
          documents: filteredDocs,
          totalCount: folderDocs.length,
        };
      })
      .filter((group) => !q || group.documents.length > 0);
  });

  protected readonly filteredUncategorizedDocuments = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const uncat = this.store.uncategorizedDocuments();
    if (!q) return uncat;
    return uncat.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.content.toLowerCase().includes(q),
    );
  });

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
    this.store.delete(id);
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
    if (this.isBrowser) {
      const confirmDelete = confirm(`Delete folder "${folderName}"? Documents inside will be kept in root pages.`);
      if (confirmDelete) {
        this.store.deleteFolder(folderName, false);
      }
    } else {
      this.store.deleteFolder(folderName, false);
    }
  }

  protected async exportFolder(event: Event, folderName: string): Promise<void> {
    event.stopPropagation();
    await this.fileExport.exportFolderAsZip(folderName, this.store.documents());
  }

  protected async exportAllZip(): Promise<void> {
    await this.fileExport.exportAllAsZip(this.store.documents());
  }

  protected async importFiles(): Promise<void> {
    await this.fileImport.importFiles();
  }

  protected async importFolder(): Promise<void> {
    await this.fileImport.importFolder();
  }
}
