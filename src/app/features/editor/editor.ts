import {
  Component,
  inject,
  signal,
  computed,
  viewChild,
  HostListener,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  DocumentStore,
  FileImportService,
  Toolbar,
  ToolbarAction,
  MarkdownPreview,
  SplitView,
  ThemeToggle,
} from 'md-core';
import { Sidebar } from './components/sidebar/sidebar';
import { MarkdownInput } from './components/markdown-input/markdown-input';

export type ViewMode = 'edit' | 'preview' | 'split';

@Component({
  selector: 'app-editor',
  imports: [Sidebar, MarkdownInput, Toolbar, MarkdownPreview, SplitView, ThemeToggle],
  templateUrl: './editor.html',
  styleUrl: './editor.css',
})
export class Editor {
  protected readonly store = inject(DocumentStore);
  protected readonly fileImport = inject(FileImportService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  protected readonly isMobile = signal(this.detectIsMobile());
  protected readonly viewMode = signal<ViewMode>(this.detectIsMobile() ? 'edit' : 'split');
  protected readonly sidebarOpen = signal(!this.detectIsMobile());
  protected readonly isDragOver = signal(false);
  protected readonly toolbarAction = signal<ToolbarAction | null>(null);
  protected readonly isExportMenuOpen = signal(false);
  protected readonly copySuccessMessage = signal<string | null>(null);

  protected readonly inputComponent = viewChild(MarkdownInput);
  protected readonly previewComponent = viewChild(MarkdownPreview);

  private isSyncingScroll = false;

  /** Computed document statistics */
  protected readonly docStats = computed(() => {
    const content = this.store.activeDocument()?.content ?? '';
    const trimmed = content.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const chars = content.length;
    const readingTime = Math.max(1, Math.ceil(words / 200));
    const lines = content ? content.split('\n').length : 1;
    return { words, chars, readingTime, lines };
  });

  private detectIsMobile(): boolean {
    if (!this.isBrowser) return false;
    return window.innerWidth < 768;
  }

  @HostListener('window:resize')
  onResize(): void {
    if (!this.isBrowser) return;
    const mobile = window.innerWidth < 768;
    this.isMobile.set(mobile);
    if (mobile && this.viewMode() === 'split') {
      this.setViewMode('edit');
    }
  }

  protected toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  protected setViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
  }

  protected onContentChange(content: string): void {
    this.store.updateContent(content);
  }

  protected onToolbarAction(action: ToolbarAction): void {
    this.toolbarAction.set(action);
  }

  /** Synchronized scrolling */
  protected onEditorScroll(event: Event): void {
    if (this.viewMode() !== 'split' || this.isSyncingScroll) return;
    const target = event.target as HTMLElement;
    const maxScroll = target.scrollHeight - target.clientHeight;
    if (maxScroll <= 0) return;
    const ratio = target.scrollTop / maxScroll;

    this.isSyncingScroll = true;
    this.previewComponent()?.scrollToRatio(ratio);
    requestAnimationFrame(() => {
      this.isSyncingScroll = false;
    });
  }

  protected onPreviewScroll(event: Event): void {
    if (this.viewMode() !== 'split' || this.isSyncingScroll) return;
    const target = event.target as HTMLElement;
    const maxScroll = target.scrollHeight - target.clientHeight;
    if (maxScroll <= 0) return;
    const ratio = target.scrollTop / maxScroll;

    this.isSyncingScroll = true;
    this.inputComponent()?.scrollToRatio(ratio);
    requestAnimationFrame(() => {
      this.isSyncingScroll = false;
    });
  }

  /** Export as Markdown file */
  protected exportMarkdown(): void {
    if (!this.isBrowser) return;
    const doc = this.store.activeDocument();
    if (!doc) return;

    const blob = new Blob([doc.content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.sanitizeFilename(doc.title)}.md`;
    link.click();
    URL.revokeObjectURL(url);
    this.isExportMenuOpen.set(false);
    this.notifyUser('Exported as Markdown!');
  }

  /** Export as styled standalone HTML */
  protected exportHtml(): void {
    if (!this.isBrowser) return;
    const doc = this.store.activeDocument();
    if (!doc) return;

    const renderedBody = this.previewComponent()?.getRenderedHtml() ?? '';
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${doc.title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/prismjs@1.30.0/themes/prism-tomorrow.min.css">
  <style>
    body {
      background: #191919;
      color: #ebebeb;
      font-family: 'Inter', sans-serif;
      line-height: 1.75;
      padding: 40px 24px;
      margin: 0;
    }
    .content {
      max-width: 860px;
      margin: 0 auto;
    }
    a { color: #2383e2; text-decoration: underline; }
    pre { background: #1c1c1c; border-radius: 8px; padding: 16px; overflow-x: auto; }
    code { font-family: 'JetBrains Mono', monospace; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid rgba(255,255,255,0.1); padding: 10px 14px; text-align: left; }
    th { background: rgba(255,255,255,0.05); }
    blockquote { border-left: 3px solid #2383e2; padding: 12px 18px; margin: 20px 0; background: rgba(35,131,226,0.08); border-radius: 0 8px 8px 0; }
  </style>
</head>
<body>
  <div class="content">
    ${renderedBody}
  </div>
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.sanitizeFilename(doc.title)}.html`;
    link.click();
    URL.revokeObjectURL(url);
    this.isExportMenuOpen.set(false);
    this.notifyUser('Exported as HTML!');
  }

  /** Copy Markdown to clipboard */
  protected copyMarkdown(): void {
    if (!this.isBrowser) return;
    const doc = this.store.activeDocument();
    if (!doc) return;

    navigator.clipboard.writeText(doc.content).then(() => {
      this.isExportMenuOpen.set(false);
      this.notifyUser('Copied Markdown to clipboard!');
    });
  }

  protected toggleExportMenu(): void {
    this.isExportMenuOpen.update((v) => !v);
  }

  private notifyUser(message: string): void {
    this.copySuccessMessage.set(message);
    setTimeout(() => {
      this.copySuccessMessage.set(null);
    }, 2500);
  }

  private sanitizeFilename(name: string): string {
    return name.replace(/[^a-zA-Z0-9_\-\u00C0-\u024F\u1E00-\u1EFF]/g, '_').toLowerCase() || 'document';
  }

  // Drag & drop handling
  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  protected onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  protected async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
    if (event.dataTransfer) {
      await this.fileImport.processDroppedItems(event.dataTransfer);
    }
  }

  // Keyboard shortcuts
  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (!this.isBrowser) return;

    if (event.ctrlKey || event.metaKey) {
      switch (event.key.toLowerCase()) {
        case 'e':
          event.preventDefault();
          this.setViewMode('edit');
          break;
        case 'p':
          event.preventDefault();
          this.setViewMode('preview');
          break;
        case '\\':
          if (!this.isMobile()) {
            event.preventDefault();
            this.setViewMode('split');
          }
          break;
        case 'b':
          event.preventDefault();
          this.sidebarOpen.update((v) => !v);
          break;
      }
    }
  }
}
