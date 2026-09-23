import {
  Component,
  input,
  output,
  effect,
  viewChild,
  ElementRef,
  computed,
  signal,
} from '@angular/core';
import { ToolbarAction } from 'md-core';

export interface SlashTriggerEvent {
  active: boolean;
  query: string;
  position: { top: number; left: number };
}

@Component({
  selector: 'app-markdown-input',
  standalone: true,
  templateUrl: './markdown-input.html',
  styleUrl: './markdown-input.css',
})
export class MarkdownInput {
  readonly content = input<string>('');
  readonly toolbarAction = input<ToolbarAction | null>(null);
  readonly contentChange = output<string>();
  readonly scrollEvent = output<Event>();
  readonly slashTrigger = output<SlashTriggerEvent>();

  protected readonly textareaRef = viewChild<ElementRef<HTMLTextAreaElement>>('textarea');
  protected readonly gutterRef = viewChild<ElementRef<HTMLElement>>('gutter');

  protected readonly lineCount = computed(() => {
    const raw = this.content();
    return raw ? raw.split('\n').length : 1;
  });

  protected readonly lines = computed(() => {
    const count = this.lineCount();
    return Array.from({ length: count }, (_, i) => i + 1);
  });

  constructor() {
    effect(() => {
      const action = this.toolbarAction();
      if (action) {
        this.applyAction(action);
      }
    });
  }

  scrollToRatio(ratio: number): void {
    const textarea = this.textareaRef()?.nativeElement;
    if (textarea) {
      textarea.scrollTop = ratio * (textarea.scrollHeight - textarea.clientHeight);
    }
  }

  scrollToLine(lineIndex: number): void {
    const textarea = this.textareaRef()?.nativeElement;
    if (!textarea) return;

    const totalHeight = textarea.scrollHeight;
    const count = this.lineCount();
    const ratio = Math.min(1, Math.max(0, lineIndex / count));
    textarea.scrollTop = ratio * (totalHeight - textarea.clientHeight);

    // Focus and highlight the line
    const lines = textarea.value.split('\n');
    let charOffset = 0;
    for (let i = 0; i < lineIndex && i < lines.length; i++) {
      charOffset += lines[i].length + 1;
    }
    textarea.focus();
    const targetLineLength = lines[lineIndex]?.length || 0;
    textarea.setSelectionRange(charOffset, charOffset + targetLineLength);
  }

  insertSlashCommand(snippet: string): void {
    const textarea = this.textareaRef()?.nativeElement;
    if (!textarea) return;

    const pos = textarea.selectionStart;
    const value = textarea.value;
    const lineStart = value.lastIndexOf('\n', pos - 1) + 1;

    // Replace the slash command prefix with snippet
    const newValue = value.substring(0, lineStart) + snippet + value.substring(pos);
    textarea.value = newValue;
    const newPos = lineStart + snippet.length;
    textarea.selectionStart = textarea.selectionEnd = newPos;
    textarea.focus();
    this.contentChange.emit(newValue);

    this.slashTrigger.emit({ active: false, query: '', position: { top: 0, left: 0 } });
  }

  selectMatch(start: number, end: number): void {
    const textarea = this.textareaRef()?.nativeElement;
    if (!textarea) return;
    textarea.focus();
    textarea.setSelectionRange(start, end);

    // Scroll selection into view
    const totalChars = textarea.value.length || 1;
    const ratio = start / totalChars;
    textarea.scrollTop = ratio * (textarea.scrollHeight - textarea.clientHeight);
  }

  replaceMatch(start: number, end: number, replacement: string): void {
    const textarea = this.textareaRef()?.nativeElement;
    if (!textarea) return;

    const value = textarea.value;
    const newValue = value.substring(0, start) + replacement + value.substring(end);
    textarea.value = newValue;
    textarea.selectionStart = textarea.selectionEnd = start + replacement.length;
    this.contentChange.emit(newValue);
  }

  replaceAllMatches(query: string, replacement: string, caseSensitive: boolean): void {
    const textarea = this.textareaRef()?.nativeElement;
    if (!textarea || !query) return;

    const value = textarea.value;
    const flags = caseSensitive ? 'g' : 'gi';
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, flags);
    const newValue = value.replace(regex, replacement);
    textarea.value = newValue;
    this.contentChange.emit(newValue);
  }

  protected onScroll(event: Event): void {
    const textarea = event.target as HTMLElement;
    const gutter = this.gutterRef()?.nativeElement;
    if (gutter) {
      gutter.scrollTop = textarea.scrollTop;
    }
    this.scrollEvent.emit(event);
  }

  protected onInput(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    const value = textarea.value;
    this.contentChange.emit(value);
    this.checkSlashCommand(textarea);
  }

  private checkSlashCommand(textarea: HTMLTextAreaElement): void {
    const pos = textarea.selectionStart;
    const value = textarea.value;
    const lineStart = value.lastIndexOf('\n', pos - 1) + 1;
    const currentLine = value.substring(lineStart, pos);

    if (currentLine.startsWith('/')) {
      const query = currentLine.substring(1);
      // Approximate line position inside editor
      const linesBefore = value.substring(0, lineStart).split('\n').length - 1;
      const lineHeight = 25.375;
      const topOffset = Math.max(10, linesBefore * lineHeight - textarea.scrollTop + 60);

      this.slashTrigger.emit({
        active: true,
        query,
        position: { top: Math.min(topOffset, 400), left: 90 },
      });
    } else {
      this.slashTrigger.emit({
        active: false,
        query: '',
        position: { top: 0, left: 0 },
      });
    }
  }

  protected onKeyDown(event: KeyboardEvent): void {
    const textarea = this.textareaRef()?.nativeElement;
    if (!textarea) return;

    if (event.key === 'Tab') {
      event.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;
      const spaces = '  ';

      textarea.value = value.substring(0, start) + spaces + value.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + spaces.length;
      this.contentChange.emit(textarea.value);
      return;
    }

    if (event.key === 'Enter') {
      const start = textarea.selectionStart;
      const value = textarea.value;
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const currentLine = value.substring(lineStart, start);

      const match = currentLine.match(/^(\s*(?:[-*+]\s?(?:\[[ x]\]\s?)?|\d+\.\s?)?)/);
      if (match && match[1]) {
        const indent = match[1];
        const lineContent = currentLine.substring(indent.length).trim();
        if (!lineContent && indent.trim()) {
          event.preventDefault();
          textarea.value = value.substring(0, lineStart) + '\n' + value.substring(start);
          textarea.selectionStart = textarea.selectionEnd = lineStart + 1;
          this.contentChange.emit(textarea.value);
          return;
        }

        event.preventDefault();
        let nextIndent = indent;
        const orderedMatch = indent.match(/^(\s*)(\d+)\.\s/);
        if (orderedMatch) {
          const num = parseInt(orderedMatch[2], 10);
          nextIndent = `${orderedMatch[1]}${num + 1}. `;
        }
        nextIndent = nextIndent.replace('[x]', '[ ]');

        textarea.value = value.substring(0, start) + '\n' + nextIndent + value.substring(start);
        textarea.selectionStart = textarea.selectionEnd = start + 1 + nextIndent.length;
        this.contentChange.emit(textarea.value);
        return;
      }
    }
  }

  private applyAction(action: ToolbarAction): void {
    const textarea = this.textareaRef()?.nativeElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    const selected = value.substring(start, end);

    let newValue: string;
    let newCursorPos: number;

    switch (action.type) {
      case 'wrap': {
        const before = action.before;
        const after = action.after ?? '';
        newValue = value.substring(0, start) + before + selected + after + value.substring(end);
        newCursorPos = selected ? start + before.length + selected.length + after.length : start + before.length;
        break;
      }
      case 'prefix': {
        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        newValue = value.substring(0, lineStart) + action.before + value.substring(lineStart);
        newCursorPos = start + action.before.length;
        break;
      }
      case 'insert': {
        newValue = value.substring(0, start) + action.before + value.substring(end);
        newCursorPos = start + action.before.length;
        break;
      }
      default:
        return;
    }

    textarea.value = newValue;
    textarea.selectionStart = textarea.selectionEnd = newCursorPos;
    textarea.focus();
    this.contentChange.emit(newValue);
  }
}
