import {
  Component,
  inject,
  input,
  output,
  signal,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DocumentStore, FileImportService, TimeAgo } from 'md-core';

@Component({
  selector: 'app-sidebar',
  imports: [TimeAgo],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
  host: {
    '[class.open]': 'isOpen()',
  },
})
export class Sidebar {
  protected readonly store = inject(DocumentStore);
  protected readonly fileImport = inject(FileImportService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly isOpen = input<boolean>(true);
  readonly toggleSidebar = output<void>();

  protected readonly searchQuery = signal('');

  protected get filteredDocuments() {
    const query = this.searchQuery().toLowerCase();
    const docs = this.store.sortedDocuments();
    if (!query) return docs;
    return docs.filter(
      (d) =>
        d.title.toLowerCase().includes(query) ||
        d.content.toLowerCase().includes(query),
    );
  }

  protected createDocument(): void {
    this.store.create();
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

  protected onSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  protected async importFiles(): Promise<void> {
    await this.fileImport.importFiles();
  }

  protected async importFolder(): Promise<void> {
    await this.fileImport.importFolder();
  }
}
