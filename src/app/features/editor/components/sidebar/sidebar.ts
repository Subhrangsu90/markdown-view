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
import { DocumentStore, FileImportService, TimeAgo } from 'md-core';

const EMOJI_PALETTE = ['📄', '📝', '🚀', '💡', '⚡', '📊', '📚', '🎯', '✨', '🔥', '💻', '🎨', '📌', '🛠️'];

@Component({
  selector: 'app-sidebar',
  standalone: true,
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

  protected readonly filteredRegularDocuments = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const regulars = this.store.regularDocuments();
    if (!q) return regulars;
    return regulars.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.content.toLowerCase().includes(q),
    );
  });

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

  protected toggleFavorite(event: Event, id: string): void {
    event.stopPropagation();
    this.store.toggleFavorite(id);
  }

  protected duplicateDocument(event: Event, id: string): void {
    event.stopPropagation();
    this.store.duplicate(id);
  }

  protected cycleIcon(event: Event, id: string, currentIcon: string = '📄'): void {
    event.stopPropagation();
    const currentIndex = EMOJI_PALETTE.indexOf(currentIcon);
    const nextIndex = (currentIndex + 1) % EMOJI_PALETTE.length;
    this.store.updateIcon(id, EMOJI_PALETTE[nextIndex]);
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
