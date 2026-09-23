import { Component, input, output, computed } from '@angular/core';

export interface TocHeading {
  id: string;
  level: number;
  text: string;
  lineIndex: number;
}

@Component({
  selector: 'md-table-of-contents',
  standalone: true,
  templateUrl: './table-of-contents.html',
  styleUrl: './table-of-contents.css',
})
export class TableOfContents {
  readonly content = input<string>('');
  readonly headingClick = output<TocHeading>();

  readonly headings = computed<TocHeading[]>(() => {
    const raw = this.content();
    if (!raw) return [];

    const lines = raw.split('\n');
    const result: TocHeading[] = [];
    let inCodeBlock = false;

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        return;
      }
      if (inCodeBlock) return;

      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2].trim().replace(/[*_~`]/g, '');
        const id = text
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-');

        result.push({
          id,
          level,
          text,
          lineIndex: index,
        });
      }
    });

    return result;
  });

  onSelect(heading: TocHeading, event: Event): void {
    event.preventDefault();
    this.headingClick.emit(heading);
  }
}
