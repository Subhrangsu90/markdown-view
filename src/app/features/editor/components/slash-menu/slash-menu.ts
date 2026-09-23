import {
  Component,
  input,
  output,
  signal,
  computed,
  HostListener,
  ElementRef,
  inject,
} from '@angular/core';
import { MdIcon, IconName } from 'md-core';

export interface SlashCommand {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  category: 'Basic' | 'Lists' | 'Advanced';
  snippet: string;
}

const COMMANDS: SlashCommand[] = [
  {
    id: 'h1',
    title: 'Heading 1',
    description: 'Large section heading',
    icon: 'h1',
    category: 'Basic',
    snippet: '# ',
  },
  {
    id: 'h2',
    title: 'Heading 2',
    description: 'Medium section heading',
    icon: 'h2',
    category: 'Basic',
    snippet: '## ',
  },
  {
    id: 'h3',
    title: 'Heading 3',
    description: 'Small section heading',
    icon: 'h3',
    category: 'Basic',
    snippet: '### ',
  },
  {
    id: 'todo',
    title: 'To-do List',
    description: 'Track tasks with interactive checkboxes',
    icon: 'check-square',
    category: 'Lists',
    snippet: '- [ ] ',
  },
  {
    id: 'bullet',
    title: 'Bulleted List',
    description: 'Create a simple bulleted list',
    icon: 'list',
    category: 'Lists',
    snippet: '- ',
  },
  {
    id: 'numbered',
    title: 'Numbered List',
    description: 'Create an ordered sequence',
    icon: 'list-ordered',
    category: 'Lists',
    snippet: '1. ',
  },
  {
    id: 'callout-note',
    title: 'Callout: Note',
    description: 'Informational highlight box',
    icon: 'info',
    category: 'Advanced',
    snippet: '> [!NOTE]\n> ',
  },
  {
    id: 'callout-tip',
    title: 'Callout: Tip',
    description: 'Helpful advice or best practice',
    icon: 'bulb',
    category: 'Advanced',
    snippet: '> [!TIP]\n> ',
  },
  {
    id: 'callout-warning',
    title: 'Callout: Warning',
    description: 'Important warning or caution box',
    icon: 'warning',
    category: 'Advanced',
    snippet: '> [!WARNING]\n> ',
  },
  {
    id: 'code',
    title: 'Code Block',
    description: 'Syntax-highlighted code block',
    icon: 'code',
    category: 'Advanced',
    snippet: '```typescript\n// write code here\n```\n',
  },
  {
    id: 'table',
    title: 'Table',
    description: 'Grid layout table with columns',
    icon: 'table',
    category: 'Advanced',
    snippet: '| Feature | Status | Notes |\n|---|---|---|\n| Item 1 | Active | Details |\n| Item 2 | Done | Done |\n',
  },
  {
    id: 'math',
    title: 'Math Formula (KaTeX)',
    description: 'Display LaTeX mathematical equation',
    icon: 'math',
    category: 'Advanced',
    snippet: '```math\n\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}\n```\n',
  },
  {
    id: 'mermaid',
    title: 'Mermaid Diagram',
    description: 'Interactive flowchart or sequence diagram',
    icon: 'flowchart',
    category: 'Advanced',
    snippet: '```mermaid\ngraph TD\n  Start[Start] --> Process[Do Work]\n  Process --> Finish[Complete]\n```\n',
  },
  {
    id: 'quote',
    title: 'Quote',
    description: 'Capture a memorable quote',
    icon: 'quote',
    category: 'Basic',
    snippet: '> ',
  },
  {
    id: 'divider',
    title: 'Divider',
    description: 'Visually separate content sections',
    icon: 'minus',
    category: 'Basic',
    snippet: '\n---\n\n',
  },
];

@Component({
  selector: 'app-slash-menu',
  standalone: true,
  imports: [MdIcon],
  templateUrl: './slash-menu.html',
  styleUrl: './slash-menu.css',
})
export class SlashMenu {
  private readonly elementRef = inject(ElementRef);

  readonly query = input<string>('');
  readonly position = input<{ top: number; left: number }>({ top: 0, left: 0 });
  readonly selectCommand = output<SlashCommand>();
  readonly closeMenu = output<void>();

  protected readonly selectedIndex = signal(0);

  protected readonly filteredCommands = computed(() => {
    const q = this.query().toLowerCase().trim();
    if (!q) return COMMANDS;
    return COMMANDS.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q),
    );
  });

  onSelect(command: SlashCommand): void {
    this.selectCommand.emit(command);
  }

  handleKeyDown(event: KeyboardEvent): boolean {
    const list = this.filteredCommands();
    if (list.length === 0) return false;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.selectedIndex.update((i) => (i + 1) % list.length);
      return true;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.selectedIndex.update((i) => (i - 1 + list.length) % list.length);
      return true;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const selected = list[this.selectedIndex()];
      if (selected) {
        this.onSelect(selected);
      }
      return true;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeMenu.emit();
      return true;
    }
    return false;
  }
}
