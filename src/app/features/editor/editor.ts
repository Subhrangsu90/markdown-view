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
  TableOfContents,
  TocHeading,
  FileExportService,
  LocalDirectoryService,
  IndexedDbService,
  MdIcon,
  DOCUMENT_ICON_PALETTE,
  resolveIconName,
  DocumentTemplate,
} from 'md-core';
import { FormsModule } from '@angular/forms';
import { Sidebar } from './components/sidebar/sidebar';
import { MarkdownInput, SlashTriggerEvent } from './components/markdown-input/markdown-input';
import { SlashMenu, SlashCommand } from './components/slash-menu/slash-menu';
import { FindReplace } from './components/find-replace/find-replace';
import { ShortcutsModal } from './components/shortcuts-modal/shortcuts-modal';
import { TemplatesModal } from './components/templates-modal/templates-modal';
import { AboutModal } from './components/about-modal/about-modal';
import { CommandPalette } from './components/command-palette/command-palette';
import { KnowledgeGraph } from './components/knowledge-graph/knowledge-graph';
import { HistoryModal } from './components/history-modal/history-modal';
import { EncryptModal } from './components/encrypt-modal/encrypt-modal';
import { WikilinkPopup } from './components/wikilink-popup/wikilink-popup';
import { KanbanView } from './components/kanban-view/kanban-view';
import { TableView } from './components/table-view/table-view';
import { BacklinksPanel } from './components/backlinks-panel/backlinks-panel';

export type ViewMode = 'edit' | 'preview' | 'split';
export type FolderViewMode = 'editor' | 'kanban' | 'table';

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [
    FormsModule,
    Sidebar,
    MarkdownInput,
    Toolbar,
    MarkdownPreview,
    SplitView,
    ThemeToggle,
    TableOfContents,
    SlashMenu,
    FindReplace,
    ShortcutsModal,
    TemplatesModal,
    AboutModal,
    CommandPalette,
    KnowledgeGraph,
    HistoryModal,
    EncryptModal,
    WikilinkPopup,
    KanbanView,
    TableView,
    BacklinksPanel,
    MdIcon,
  ],
  templateUrl: './editor.html',
  styleUrl: './editor.css',
})
export class Editor {
  protected readonly store = inject(DocumentStore);
  protected readonly fileImport = inject(FileImportService);
  protected readonly fileExport = inject(FileExportService);
  protected readonly localDir = inject(LocalDirectoryService);
  protected readonly indexedDb = inject(IndexedDbService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  /** Whether active document contains local IndexedDB images */
  protected readonly activeDocHasImages = computed(() => {
    const content = this.store.activeDocument()?.content;
    return !!content && /assets\/[a-zA-Z0-9_\-\.]+\.(?:png|jpe?g|gif|webp|svg|avif|bmp|ico)/i.test(content);
  });

  protected readonly isMobile = signal(this.detectIsMobile());
  protected readonly viewMode = signal<ViewMode>(this.detectIsMobile() ? 'edit' : 'split');
  protected readonly sidebarOpen = signal(!this.detectIsMobile());
  protected readonly isDragOver = signal(false);
  protected readonly toolbarAction = signal<ToolbarAction | null>(null);
  protected readonly isExportMenuOpen = signal(false);
  protected readonly isFolderMenuOpen = signal(false);
  protected readonly headerNewFolderInput = signal('');
  protected readonly copySuccessMessage = signal<string | null>(null);

  // Advanced features state
  protected readonly isTocOpen = signal(false);
  protected readonly isFindOpen = signal(false);
  protected readonly isShortcutsOpen = signal(false);
  protected readonly isTemplatesOpen = signal(false);
  protected readonly isAboutOpen = signal(false);
  protected readonly isZenMode = signal(false);
  protected readonly isCommandPaletteOpen = signal(false);
  protected readonly isGraphOpen = signal(false);
  protected readonly isHistoryOpen = signal(false);
  protected readonly isEncryptModalOpen = signal(false);
  protected readonly isBacklinksOpen = signal(true);
  protected readonly folderViewMode = signal<FolderViewMode>('editor');

  protected readonly slashState = signal<SlashTriggerEvent>({
    active: false,
    query: '',
    position: { top: 0, left: 0 },
  });

  protected readonly wikilinkState = signal<SlashTriggerEvent>({
    active: false,
    query: '',
    position: { top: 0, left: 0 },
  });

  protected readonly activeFolder = computed(() => this.store.activeDocument()?.folder ?? null);

  // Find & Replace match tracking
  protected readonly findMatches = signal<number[]>([]);
  protected readonly currentMatchIndex = signal<number>(0);
  private lastSearchQuery = '';
  private lastCaseSensitive = false;

  protected readonly inputComponent = viewChild(MarkdownInput);
  protected readonly previewComponent = viewChild(MarkdownPreview);
  protected readonly slashMenuComponent = viewChild(SlashMenu);

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

  protected toggleToc(): void {
    this.isTocOpen.update((v) => !v);
  }

  protected toggleFind(): void {
    this.isFindOpen.update((v) => !v);
    if (!this.isFindOpen()) {
      this.findMatches.set([]);
    }
  }

  protected toggleShortcuts(): void {
    this.isShortcutsOpen.update((v) => !v);
  }

  protected toggleTemplates(): void {
    this.isTemplatesOpen.update((v) => !v);
  }

  protected toggleAbout(): void {
    this.isAboutOpen.update((v) => !v);
  }

  protected toggleZenMode(): void {
    this.isZenMode.update((v) => !v);
  }

  protected toggleCommandPalette(): void {
    this.isCommandPaletteOpen.update((v) => !v);
  }

  protected toggleGraph(): void {
    this.isGraphOpen.update((v) => !v);
  }

  protected toggleHistory(): void {
    this.isHistoryOpen.update((v) => !v);
  }

  protected toggleEncryptModal(): void {
    this.isEncryptModalOpen.update((v) => !v);
  }

  protected toggleBacklinks(): void {
    this.isBacklinksOpen.update((v) => !v);
  }

  protected onFolderViewModeChange(mode: FolderViewMode): void {
    this.folderViewMode.set(mode);
  }

  protected onOpenDocFromMultiView(docId: string): void {
    this.store.select(docId);
    this.folderViewMode.set('editor');
  }

  protected onSelectDocFromGraph(docId: string): void {
    this.store.select(docId);
    this.isGraphOpen.set(false);
    this.folderViewMode.set('editor');
  }

  protected onRestoreHistory(content: string): void {
    this.store.updateContent(content);
    this.isHistoryOpen.set(false);
    this.notifyUser('Document restored from history revision.');
  }

  protected onWikilinkTrigger(event: SlashTriggerEvent): void {
    this.wikilinkState.set(event);
  }

  protected onWikilinkSelect(targetTitle: string): void {
    this.inputComponent()?.insertWikilink(targetTitle);
    this.wikilinkState.set({ active: false, query: '', position: { top: 0, left: 0 } });
  }

  protected onApplyTemplate(template: DocumentTemplate): void {
    const doc = this.store.create(template.title, template.content, template.category);
    this.store.updateIcon(doc.id, template.icon);
    this.isTemplatesOpen.set(false);
    this.notifyUser(`Loaded "${template.title}" template!`);
  }

  protected setViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
  }

  protected onContentChange(content: string): void {
    this.store.updateContent(content);
    if (this.isFindOpen() && this.lastSearchQuery) {
      this.performSearch(this.lastSearchQuery, this.lastCaseSensitive);
    }
  }

  protected onToolbarAction(action: ToolbarAction): void {
    this.toolbarAction.set(action);
  }

  /** Heading clicked in Table of Contents */
  protected onHeadingSelect(heading: TocHeading): void {
    if (this.viewMode() === 'edit' || this.viewMode() === 'split') {
      this.inputComponent()?.scrollToLine(heading.lineIndex);
    }
    if (this.viewMode() === 'preview' || this.viewMode() === 'split') {
      this.previewComponent()?.scrollToHeading(heading.text);
    }
    if (this.isMobile()) {
      this.isTocOpen.set(false);
    }
  }

  /** Inter-document link clicked in preview */
  protected onDocumentNavigate(event: { docId: string; title: string }): void {
    if (event.docId) {
      this.store.select(event.docId);
    }
    this.notifyUser(`Navigated to "${event.title}"`);
  }

  /** Slash menu handling */
  protected onSlashTrigger(event: SlashTriggerEvent): void {
    this.slashState.set(event);
  }

  protected onSlashCommandSelect(cmd: SlashCommand): void {
    this.inputComponent()?.insertSlashCommand(cmd.snippet);
    this.slashState.set({ active: false, query: '', position: { top: 0, left: 0 } });
  }

  /** Find & Replace handlers */
  protected onSearchChange({
    query,
    caseSensitive,
  }: {
    query: string;
    caseSensitive: boolean;
  }): void {
    this.lastSearchQuery = query;
    this.lastCaseSensitive = caseSensitive;
    this.performSearch(query, caseSensitive);
  }

  private performSearch(query: string, caseSensitive: boolean): void {
    if (!query) {
      this.findMatches.set([]);
      this.currentMatchIndex.set(0);
      return;
    }

    const content = this.store.activeDocument()?.content ?? '';
    const matches: number[] = [];
    const flags = caseSensitive ? 'g' : 'gi';
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, flags);

    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      matches.push(match.index);
    }

    this.findMatches.set(matches);
    if (matches.length > 0) {
      this.currentMatchIndex.set(0);
      this.highlightCurrentMatch();
    }
  }

  protected onFindNext(): void {
    const total = this.findMatches().length;
    if (total === 0) return;
    this.currentMatchIndex.update((i) => (i + 1) % total);
    this.highlightCurrentMatch();
  }

  protected onFindPrevious(): void {
    const total = this.findMatches().length;
    if (total === 0) return;
    this.currentMatchIndex.update((i) => (i - 1 + total) % total);
    this.highlightCurrentMatch();
  }

  private highlightCurrentMatch(): void {
    const matches = this.findMatches();
    const idx = this.currentMatchIndex();
    if (matches.length === 0 || idx >= matches.length) return;
    const start = matches[idx];
    const end = start + this.lastSearchQuery.length;
    this.inputComponent()?.selectMatch(start, end);
  }

  protected onReplace({ query, replacement }: { query: string; replacement: string }): void {
    const matches = this.findMatches();
    const idx = this.currentMatchIndex();
    if (matches.length === 0 || idx >= matches.length) return;

    const start = matches[idx];
    const end = start + query.length;
    this.inputComponent()?.replaceMatch(start, end, replacement);
    this.performSearch(query, this.lastCaseSensitive);
  }

  protected onReplaceAll({ query, replacement }: { query: string; replacement: string }): void {
    this.inputComponent()?.replaceAllMatches(query, replacement, this.lastCaseSensitive);
    this.performSearch(query, this.lastCaseSensitive);
    this.notifyUser('Replaced all occurrences!');
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

  /** Cycle document SVG icon */
  protected cycleHeaderIcon(docId: string, currentIcon: string = 'document'): void {
    const resolved = resolveIconName(currentIcon);
    const currentIndex = DOCUMENT_ICON_PALETTE.indexOf(resolved);
    const nextIndex = (currentIndex + 1) % DOCUMENT_ICON_PALETTE.length;
    this.store.updateIcon(docId, DOCUMENT_ICON_PALETTE[nextIndex]);
  }

  /** Export as Markdown file (standard clean relative paths) */
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

  /** Export document and referenced images as a ZIP archive (Obsidian format) */
  protected async exportDocumentZip(): Promise<void> {
    if (!this.isBrowser) return;
    const doc = this.store.activeDocument();
    if (!doc) return;

    this.isExportMenuOpen.set(false);
    await this.fileExport.exportDocumentAsZip(doc);
    this.notifyUser('Exported document & images as ZIP!');
  }

  /** Export document as standalone Markdown with Base64 embedded images */
  protected async exportMarkdownStandalone(): Promise<void> {
    if (!this.isBrowser) return;
    const doc = this.store.activeDocument();
    if (!doc) return;

    this.isExportMenuOpen.set(false);
    await this.fileExport.exportDocumentWithEmbeddedAssets(doc);
    this.notifyUser('Exported standalone Markdown with embedded images!');
  }

  /** Export as styled standalone HTML with self-contained embedded images */
  protected async exportHtml(): Promise<void> {
    if (!this.isBrowser) return;
    const doc = this.store.activeDocument();
    if (!doc) return;

    let renderedBody = this.previewComponent()?.getRenderedHtml() ?? '';
    // Automatically embed any local IndexedDB image assets as Base64 so the HTML file is 100% self-contained
    try {
      renderedBody = await this.indexedDb.replaceAssetReferencesWithBase64(renderedBody);
    } catch (e) {
      console.warn('Failed to embed assets in HTML export:', e);
    }

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
    img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      margin: 16px 0;
    }
    a { color: #2383e2; text-decoration: underline; }
    pre { background: #1c1c1c; border-radius: 8px; padding: 16px; overflow-x: auto; }
    code { font-family: 'JetBrains Mono', monospace; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid rgba(255,255,255,0.1); padding: 10px 14px; text-align: left; }
    th { background: rgba(255,255,255,0.05); }
    blockquote { border-left: 3px solid #2383e2; padding: 12px 18px; margin: 20px 0; background: rgba(35,131,226,0.08); border-radius: 0 8px 8px 0; }
    blockquote.markdown-alert { padding: 14px 18px; margin: 20px 0; border-radius: 6px; }
    .markdown-alert-title { display: flex; align-items: center; gap: 8px; font-weight: 600; margin-bottom: 8px; }
    .markdown-alert-title .alert-icon svg { width: 16px; height: 16px; fill: currentColor; }
    .markdown-alert-content { color: inherit; }
    .markdown-alert-content p { margin: 6px 0; }
    .markdown-alert-note { border-left: 3.5px solid #3b82f6; border-top: 1px solid rgba(59,130,246,0.2); border-right: 1px solid rgba(59,130,246,0.2); border-bottom: 1px solid rgba(59,130,246,0.2); background: rgba(59,130,246,0.08); }
    .markdown-alert-note .markdown-alert-title { color: #60a5fa; }
    .markdown-alert-tip { border-left: 3.5px solid #22c55e; border-top: 1px solid rgba(34,197,94,0.2); border-right: 1px solid rgba(34,197,94,0.2); border-bottom: 1px solid rgba(34,197,94,0.2); background: rgba(34,197,94,0.08); }
    .markdown-alert-tip .markdown-alert-title { color: #4ade80; }
    .markdown-alert-important { border-left: 3.5px solid #a855f7; border-top: 1px solid rgba(168,85,247,0.2); border-right: 1px solid rgba(168,85,247,0.2); border-bottom: 1px solid rgba(168,85,247,0.2); background: rgba(168,85,247,0.08); }
    .markdown-alert-important .markdown-alert-title { color: #c084fc; }
    .markdown-alert-warning { border-left: 3.5px solid #f59e0b; border-top: 1px solid rgba(245,158,11,0.2); border-right: 1px solid rgba(245,158,11,0.2); border-bottom: 1px solid rgba(245,158,11,0.2); background: rgba(245,158,11,0.08); }
    .markdown-alert-warning .markdown-alert-title { color: #fbbf24; }
    .markdown-alert-caution { border-left: 3.5px solid #ef4444; border-top: 1px solid rgba(239,68,68,0.2); border-right: 1px solid rgba(239,68,68,0.2); border-bottom: 1px solid rgba(239,68,68,0.2); background: rgba(239,68,68,0.08); }
    .markdown-alert-caution .markdown-alert-title { color: #f87171; }
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
    this.notifyUser('Exported as standalone HTML with embedded images!');
  }

  /** Export all documents as a structured ZIP archive preserving folders */
  protected async exportAllZip(): Promise<void> {
    if (!this.isBrowser) return;
    this.isExportMenuOpen.set(false);
    await this.fileExport.exportAllAsZip(this.store.documents());
    this.notifyUser('Exported all documents as ZIP!');
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

  /** Copy formatted rich text with images to clipboard (for pasting into Word/Docs/Email) */
  protected async copyRichFormatted(): Promise<void> {
    if (!this.isBrowser) return;
    const doc = this.store.activeDocument();
    if (!doc) return;

    try {
      let html = this.previewComponent()?.getRenderedHtml() ?? '';
      html = await this.indexedDb.replaceAssetReferencesWithBase64(html);

      const blobHtml = new Blob([html], { type: 'text/html' });
      const blobText = new Blob([doc.content], { type: 'text/plain' });
      const item = new ClipboardItem({
        'text/html': blobHtml,
        'text/plain': blobText,
      });

      await navigator.clipboard.write([item]);
      this.isExportMenuOpen.set(false);
      this.notifyUser('Copied formatted document with images to clipboard!');
    } catch {
      await navigator.clipboard.writeText(doc.content);
      this.isExportMenuOpen.set(false);
      this.notifyUser('Copied to clipboard!');
    }
  }

  /** Set or change the local computer folder location */
  protected async connectLocalDirectory(): Promise<void> {
    this.isExportMenuOpen.set(false);
    const success = await this.localDir.connectDirectory();
    if (success) {
      this.notifyUser(`Save location set to: ${this.localDir.connectedDirectoryName()}`);
    }
  }

  /** Save active document directly into the connected local folder */
  protected async saveActiveToLocalDirectory(): Promise<void> {
    const doc = this.store.activeDocument();
    if (!doc) return;
    this.isExportMenuOpen.set(false);
    const success = await this.localDir.saveDocument(doc);
    if (success) {
      this.notifyUser(`Saved "${doc.title}" to local folder!`);
    } else {
      this.notifyUser('Failed to save to local folder. Please check permissions.');
    }
  }

  /** Sync all documents to connected local folder */
  protected async syncAllToLocalDirectory(): Promise<void> {
    this.isExportMenuOpen.set(false);
    const { count, errorCount } = await this.localDir.syncAllDocuments(this.store.documents());
    if (errorCount === 0) {
      this.notifyUser(`Synced all ${count} documents to local folder!`);
    } else {
      this.notifyUser(`Synced ${count} documents (${errorCount} failed).`);
    }
  }

  /** Disconnect the connected local folder */
  protected async disconnectLocalDirectory(): Promise<void> {
    this.isExportMenuOpen.set(false);
    await this.localDir.disconnectDirectory();
    this.notifyUser('Disconnected local folder location.');
  }

  protected toggleExportMenu(): void {
    this.isExportMenuOpen.update((v) => !v);
    this.isFolderMenuOpen.set(false);
  }

  protected toggleFolderMenu(): void {
    this.isFolderMenuOpen.update((v) => !v);
    this.isExportMenuOpen.set(false);
  }

  protected moveToFolder(docId: string, folder: string | null): void {
    this.store.moveToFolder(docId, folder);
    this.isFolderMenuOpen.set(false);
    this.notifyUser(folder ? `Moved to folder "${folder}"` : 'Moved to root pages');
  }

  protected createAndMoveToFolder(docId: string): void {
    const name = this.headerNewFolderInput().trim();
    if (name) {
      this.store.moveToFolder(docId, name);
      this.notifyUser(`Moved to new folder "${name}"`);
    }
    this.headerNewFolderInput.set('');
    this.isFolderMenuOpen.set(false);
  }

  protected notifyUser(message: string): void {
    this.copySuccessMessage.set(message);
    setTimeout(() => {
      this.copySuccessMessage.set(null);
    }, 2500);
  }

  private sanitizeFilename(name: string): string {
    return (
      name.replace(/[^a-zA-Z0-9_\-\u00C0-\u024F\u1E00-\u1EFF]/g, '_').toLowerCase() || 'document'
    );
  }

  // Drag & drop handling (for local markdown file importing)
  protected onDragOver(event: DragEvent): void {
    // Only activate file drop overlay if actual OS files are being dragged
    const types = event.dataTransfer?.types;
    const isFileDrag = types ? Array.from(types).includes('Files') : false;
    if (!isFileDrag) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  protected onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    // Only dismiss if cursor is truly leaving the editor shell container
    const currentTarget = event.currentTarget as HTMLElement;
    const relatedTarget = event.relatedTarget as Node | null;
    if (relatedTarget && currentTarget?.contains(relatedTarget)) {
      return;
    }
    this.isDragOver.set(false);
  }

  protected async onDrop(event: DragEvent): Promise<void> {
    const types = event.dataTransfer?.types;
    const isFileDrag = types ? Array.from(types).includes('Files') : false;
    if (!isFileDrag) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      await this.fileImport.processDroppedItems(event.dataTransfer);
    }
  }

  // Keyboard shortcuts
  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (!this.isBrowser) return;

    // If slash menu is active, forward keys
    if (this.slashState().active && this.slashMenuComponent()) {
      const handled = this.slashMenuComponent()?.handleKeyDown(event);
      if (handled) return;
    }

    // Close wikilink popup on Escape
    if (this.wikilinkState().active && event.key === 'Escape') {
      event.preventDefault();
      this.wikilinkState.set({ active: false, query: '', position: { top: 0, left: 0 } });
      return;
    }

    if (event.ctrlKey || event.metaKey) {
      switch (event.key.toLowerCase()) {
        case 'k':
          event.preventDefault();
          this.toggleCommandPalette();
          break;
        case 'g':
          event.preventDefault();
          this.toggleGraph();
          break;
        case 'h':
          event.preventDefault();
          this.toggleHistory();
          break;
        case 'l':
          event.preventDefault();
          this.toggleEncryptModal();
          break;
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
        case 'o':
          event.preventDefault();
          this.toggleToc();
          break;
        case 'f':
          event.preventDefault();
          this.toggleFind();
          break;
        case '/':
          event.preventDefault();
          this.toggleShortcuts();
          break;
        case 'j':
          event.preventDefault();
          this.toggleTemplates();
          break;
      }
    } else if (event.key === 'Escape') {
      if (this.isCommandPaletteOpen()) {
        this.isCommandPaletteOpen.set(false);
      } else if (this.isGraphOpen()) {
        this.isGraphOpen.set(false);
      } else if (this.isHistoryOpen()) {
        this.isHistoryOpen.set(false);
      } else if (this.isEncryptModalOpen()) {
        this.isEncryptModalOpen.set(false);
      } else if (this.isZenMode()) {
        this.isZenMode.set(false);
      }
    } else if (event.key === 'F11') {
      event.preventDefault();
      this.toggleZenMode();
    } else if (
      event.key === '?' &&
      !['INPUT', 'TEXTAREA'].includes((event.target as HTMLElement).tagName)
    ) {
      event.preventDefault();
      this.toggleShortcuts();
    }
  }
}
