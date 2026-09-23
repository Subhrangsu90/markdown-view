import { Component, output } from '@angular/core';

export interface ToolbarAction {
  type: 'wrap' | 'prefix' | 'insert';
  /** For 'wrap': text before selection. For 'prefix': line prefix. For 'insert': text to insert. */
  before: string;
  /** For 'wrap': text after selection */
  after?: string;
}

@Component({
  selector: 'md-toolbar',
  templateUrl: './toolbar.html',
  styleUrl: './toolbar.css',
})
export class Toolbar {
  readonly formatAction = output<ToolbarAction>();

  bold(): void {
    this.formatAction.emit({ type: 'wrap', before: '**', after: '**' });
  }

  italic(): void {
    this.formatAction.emit({ type: 'wrap', before: '_', after: '_' });
  }

  strikethrough(): void {
    this.formatAction.emit({ type: 'wrap', before: '~~', after: '~~' });
  }

  inlineCode(): void {
    this.formatAction.emit({ type: 'wrap', before: '`', after: '`' });
  }

  heading(level: number): void {
    const prefix = '#'.repeat(level) + ' ';
    this.formatAction.emit({ type: 'prefix', before: prefix });
  }

  bulletList(): void {
    this.formatAction.emit({ type: 'prefix', before: '- ' });
  }

  orderedList(): void {
    this.formatAction.emit({ type: 'prefix', before: '1. ' });
  }

  taskList(): void {
    this.formatAction.emit({ type: 'prefix', before: '- [ ] ' });
  }

  blockquote(): void {
    this.formatAction.emit({ type: 'prefix', before: '> ' });
  }

  link(): void {
    this.formatAction.emit({ type: 'insert', before: '[link text](url)' });
  }

  image(): void {
    this.formatAction.emit({ type: 'insert', before: '![alt text](image-url)' });
  }

  codeBlock(): void {
    this.formatAction.emit({ type: 'insert', before: '\n```\n\n```\n' });
  }

  horizontalRule(): void {
    this.formatAction.emit({ type: 'insert', before: '\n---\n' });
  }

  table(): void {
    this.formatAction.emit({
      type: 'insert',
      before: '\n| Header | Header |\n|--------|--------|\n| Cell   | Cell   |\n',
    });
  }
}
