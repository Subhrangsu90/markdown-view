import {
  Component,
  output,
  inject,
  computed,
  signal,
  viewChild,
  ElementRef,
  AfterViewInit,
  HostListener,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DocumentStore, MarkdownDocument, MdIcon, ThemeService } from 'md-core';

export interface CommandItem {
  id: string;
  title: string;
  category: 'action' | 'document';
  icon: string;
  shortcut?: string;
  action: () => void;
  document?: MarkdownDocument;
}

@Component({
  selector: 'app-command-palette',
  standalone: true,
  imports: [FormsModule, MdIcon],
  templateUrl: './command-palette.html',
  styleUrl: './command-palette.css',
})
export class CommandPalette implements AfterViewInit {
  private readonly store = inject(DocumentStore);
  private readonly themeService = inject(ThemeService);

  readonly close = output<void>();
  readonly openGraph = output<void>();
  readonly openHistory = output<void>();
  readonly openLockModal = output<void>();
  readonly openTemplates = output<void>();
  readonly toggleZen = output<void>();
  readonly toggleFind = output<void>();
  readonly toggleToc = output<void>();
  readonly setViewMode = output<'edit' | 'preview' | 'split'>();
  readonly setFolderViewMode = output<'editor' | 'kanban' | 'table'>();
  readonly exportHtml = output<void>();
  readonly exportZip = output<void>();

  protected readonly searchInputRef = viewChild<ElementRef<HTMLInputElement>>('searchInput');
  protected readonly searchQuery = signal<string>('');
  protected readonly selectedIndex = signal<number>(0);

  /** Predefined actions list */
  private readonly actions: CommandItem[] = [
    {
      id: 'new-note',
      title: 'Create New Document',
      category: 'action',
      icon: 'plus',
      action: () => {
        this.store.create('Untitled');
        this.close.emit();
      },
    },
    {
      id: 'open-graph',
      title: 'Open Interactive Knowledge Graph',
      category: 'action',
      icon: 'graph',
      shortcut: 'Ctrl+G',
      action: () => {
        this.close.emit();
        this.openGraph.emit();
      },
    },
    {
      id: 'view-history',
      title: 'Open Document Version History (Time Machine)',
      category: 'action',
      icon: 'history',
      shortcut: 'Ctrl+H',
      action: () => {
        this.close.emit();
        this.openHistory.emit();
      },
    },
    {
      id: 'lock-note',
      title: 'Encrypt / Lock Document with Password',
      category: 'action',
      icon: 'lock',
      action: () => {
        this.close.emit();
        this.openLockModal.emit();
      },
    },
    {
      id: 'kanban-view',
      title: 'Open Notion-Style Kanban Board View',
      category: 'action',
      icon: 'kanban',
      action: () => {
        this.close.emit();
        this.setFolderViewMode.emit('kanban');
      },
    },
    {
      id: 'table-view',
      title: 'Open Database Table View',
      category: 'action',
      icon: 'table-view',
      action: () => {
        this.close.emit();
        this.setFolderViewMode.emit('table');
      },
    },
    {
      id: 'editor-view',
      title: 'Return to Document Editor View',
      category: 'action',
      icon: 'edit',
      action: () => {
        this.close.emit();
        this.setFolderViewMode.emit('editor');
      },
    },
    {
      id: 'toggle-split',
      title: 'Switch to Live Split View',
      category: 'action',
      icon: 'split-view',
      shortcut: 'Ctrl+\\',
      action: () => {
        this.setViewMode.emit('split');
        this.close.emit();
      },
    },
    {
      id: 'toggle-edit',
      title: 'Switch to Editor-Only View',
      category: 'action',
      icon: 'edit',
      shortcut: 'Ctrl+E',
      action: () => {
        this.setViewMode.emit('edit');
        this.close.emit();
      },
    },
    {
      id: 'toggle-preview',
      title: 'Switch to Full Preview View',
      category: 'action',
      icon: 'preview',
      shortcut: 'Ctrl+P',
      action: () => {
        this.setViewMode.emit('preview');
        this.close.emit();
      },
    },
    {
      id: 'toggle-theme',
      title: 'Toggle Theme (Dark / Light)',
      category: 'action',
      icon: 'sun',
      action: () => {
        this.themeService.toggleTheme();
        this.close.emit();
      },
    },
    {
      id: 'toggle-zen',
      title: 'Toggle Distraction-Free Focus (Zen) Mode',
      category: 'action',
      icon: 'zen',
      shortcut: 'F11',
      action: () => {
        this.close.emit();
        this.toggleZen.emit();
      },
    },
    {
      id: 'open-templates',
      title: 'Browse Starter Templates Library',
      category: 'action',
      icon: 'template',
      shortcut: 'Ctrl+J',
      action: () => {
        this.close.emit();
        this.openTemplates.emit();
      },
    },
    {
      id: 'find-replace',
      title: 'Find & Replace in Document',
      category: 'action',
      icon: 'search',
      shortcut: 'Ctrl+F',
      action: () => {
        this.close.emit();
        this.toggleFind.emit();
      },
    },
    {
      id: 'table-of-contents',
      title: 'Open Document Outline (TOC)',
      category: 'action',
      icon: 'toc',
      shortcut: 'Ctrl+O',
      action: () => {
        this.close.emit();
        this.toggleToc.emit();
      },
    },
    {
      id: 'export-html',
      title: 'Export Active Document as Standalone HTML',
      category: 'action',
      icon: 'html',
      action: () => {
        this.close.emit();
        this.exportHtml.emit();
      },
    },
    {
      id: 'export-zip',
      title: 'Export Workspace as ZIP Archive',
      category: 'action',
      icon: 'zip',
      action: () => {
        this.close.emit();
        this.exportZip.emit();
      },
    },
  ];

  /** Unified list of matching items */
  protected readonly filteredItems = computed<CommandItem[]>(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const docs = this.store.sortedDocuments();

    // Matching actions
    const matchedActions = this.actions.filter((a) => {
      if (!q) return true;
      return a.title.toLowerCase().includes(q);
    });

    // Matching documents
    const docItems: CommandItem[] = docs
      .filter((d) => {
        if (!q) return true;
        return (
          d.title.toLowerCase().includes(q) ||
          (d.folder && d.folder.toLowerCase().includes(q)) ||
          (!d.isLocked && d.content.toLowerCase().includes(q))
        );
      })
      .map((d) => ({
        id: `doc-${d.id}`,
        title: d.title,
        category: 'document',
        icon: d.icon || 'document',
        document: d,
        action: () => {
          this.store.select(d.id);
          this.setFolderViewMode.emit('editor');
          this.close.emit();
        },
      }));

    if (!q) {
      // When empty: show top actions + 6 most recent notes
      return [...matchedActions.slice(0, 7), ...docItems.slice(0, 6)];
    }

    return [...matchedActions, ...docItems];
  });

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.searchInputRef()?.nativeElement?.focus();
    }, 50);
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent): void {
    const items = this.filteredItems();
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.selectedIndex.update((i) => (i + 1) % Math.max(1, items.length));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.selectedIndex.update((i) => (i - 1 + items.length) % Math.max(1, items.length));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const current = items[this.selectedIndex()];
      if (current) {
        current.action();
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.close.emit();
    }
  }

  protected selectItem(item: CommandItem): void {
    item.action();
  }
}
