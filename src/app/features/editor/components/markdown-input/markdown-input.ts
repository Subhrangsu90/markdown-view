import {
  Component,
  input,
  output,
  effect,
  viewChild,
  ElementRef,
} from '@angular/core';
import { ToolbarAction } from 'md-core';

@Component({
  selector: 'app-markdown-input',
  templateUrl: './markdown-input.html',
  styleUrl: './markdown-input.css',
})
export class MarkdownInput {
  readonly content = input<string>('');
  readonly toolbarAction = input<ToolbarAction | null>(null);
  readonly contentChange = output<string>();
  readonly scrollEvent = output<Event>();

  private readonly textareaRef = viewChild<ElementRef<HTMLTextAreaElement>>('textarea');

  scrollToRatio(ratio: number): void {
    const textarea = this.textareaRef()?.nativeElement;
    if (textarea) {
      textarea.scrollTop = ratio * (textarea.scrollHeight - textarea.clientHeight);
    }
  }

  protected onScroll(event: Event): void {
    this.scrollEvent.emit(event);
  }

  constructor() {
    // React to toolbar actions
    effect(() => {
      const action = this.toolbarAction();
      if (action) {
        this.applyAction(action);
      }
    });
  }

  protected onInput(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.contentChange.emit(value);
  }

  protected onKeyDown(event: KeyboardEvent): void {
    const textarea = this.textareaRef()?.nativeElement;
    if (!textarea) return;

    // Tab key: insert spaces
    if (event.key === 'Tab') {
      event.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;
      const spaces = '  ';

      textarea.value = value.substring(0, start) + spaces + value.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + spaces.length;
      this.contentChange.emit(textarea.value);
    }

    // Enter key: auto-indent
    if (event.key === 'Enter') {
      const start = textarea.selectionStart;
      const value = textarea.value;
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const currentLine = value.substring(lineStart, start);

      // Match leading whitespace and list markers
      const match = currentLine.match(/^(\s*(?:[-*+]\s?(?:\[[ x]\]\s?)?|\d+\.\s?)?)/);
      if (match && match[1]) {
        const indent = match[1];
        // Check if the line is just the marker (empty content)
        const lineContent = currentLine.substring(indent.length).trim();
        if (!lineContent && indent.trim()) {
          // Remove the marker
          event.preventDefault();
          textarea.value = value.substring(0, lineStart) + '\n' + value.substring(start);
          textarea.selectionStart = textarea.selectionEnd = lineStart + 1;
          this.contentChange.emit(textarea.value);
          return;
        }

        event.preventDefault();
        // Increment ordered list numbers
        let nextIndent = indent;
        const orderedMatch = indent.match(/^(\s*)(\d+)\.\s/);
        if (orderedMatch) {
          const num = parseInt(orderedMatch[2], 10);
          nextIndent = `${orderedMatch[1]}${num + 1}. `;
        }
        // Reset checkbox state
        nextIndent = nextIndent.replace('[x]', '[ ]');

        textarea.value = value.substring(0, start) + '\n' + nextIndent + value.substring(start);
        textarea.selectionStart = textarea.selectionEnd = start + 1 + nextIndent.length;
        this.contentChange.emit(textarea.value);
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
