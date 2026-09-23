import { Component, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-find-replace',
  standalone: true,
  templateUrl: './find-replace.html',
  styleUrl: './find-replace.css',
})
export class FindReplace {
  readonly currentMatch = input<number>(0);
  readonly totalMatches = input<number>(0);

  readonly searchChange = output<{ query: string; caseSensitive: boolean }>();
  readonly findNext = output<void>();
  readonly findPrevious = output<void>();
  readonly replace = output<{ query: string; replacement: string }>();
  readonly replaceAll = output<{ query: string; replacement: string }>();
  readonly close = output<void>();

  protected readonly searchQuery = signal('');
  protected readonly replaceQuery = signal('');
  protected readonly caseSensitive = signal(false);
  protected readonly showReplace = signal(true);

  onSearchInput(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    this.searchQuery.set(query);
    this.searchChange.emit({ query, caseSensitive: this.caseSensitive() });
  }

  toggleCaseSensitive(): void {
    this.caseSensitive.update((v) => !v);
    this.searchChange.emit({
      query: this.searchQuery(),
      caseSensitive: this.caseSensitive(),
    });
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close.emit();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (event.shiftKey) {
        this.findPrevious.emit();
      } else {
        this.findNext.emit();
      }
    }
  }

  onReplace(): void {
    if (!this.searchQuery()) return;
    this.replace.emit({
      query: this.searchQuery(),
      replacement: this.replaceQuery(),
    });
  }

  onReplaceAll(): void {
    if (!this.searchQuery()) return;
    this.replaceAll.emit({
      query: this.searchQuery(),
      replacement: this.replaceQuery(),
    });
  }
}
