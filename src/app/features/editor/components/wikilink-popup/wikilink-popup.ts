import {
  Component,
  input,
  output,
  inject,
  computed,
  signal,
  HostListener,
  effect,
} from '@angular/core';
import { DocumentStore, MdIcon } from 'md-core';

@Component({
  selector: 'app-wikilink-popup',
  standalone: true,
  imports: [MdIcon],
  templateUrl: './wikilink-popup.html',
  styleUrl: './wikilink-popup.css',
})
export class WikilinkPopup {
  private readonly store = inject(DocumentStore);

  readonly query = input<string>('');
  readonly position = input<{ top: number; left: number }>({ top: 0, left: 0 });

  readonly selectDoc = output<string>();
  readonly close = output<void>();

  protected readonly selectedIndex = signal<number>(0);

  protected readonly filteredDocs = computed(() => {
    return this.store.searchWikilinkTargets(this.query());
  });

  constructor() {
    effect(() => {
      this.query();
      this.selectedIndex.set(0);
    });
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    const list = this.filteredDocs();
    const totalCount = list.length + (this.query().trim() ? 1 : 0);

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.selectedIndex.update((i) => (i + 1) % Math.max(1, totalCount));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.selectedIndex.update((i) => (i - 1 + totalCount) % Math.max(1, totalCount));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const idx = this.selectedIndex();
      if (idx < list.length) {
        this.chooseDoc(list[idx].title);
      } else if (this.query().trim()) {
        this.chooseDoc(this.query().trim());
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.close.emit();
    }
  }

  protected chooseDoc(title: string): void {
    this.selectDoc.emit(title);
  }
}
