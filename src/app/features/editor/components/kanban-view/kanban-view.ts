import { Component, input, output, inject, computed, signal } from '@angular/core';
import {
  DocumentStore,
  MarkdownDocument,
  MdIcon,
  parseFrontmatter,
  setFrontmatterProperty,
  extractDocumentTags,
  TimeAgoPipe,
} from 'md-core';

export interface KanbanColumn {
  id: string;
  title: string;
  color: string;
}

const DEFAULT_COLUMNS: KanbanColumn[] = [
  { id: 'Backlog', title: 'Backlog', color: '#64748b' },
  { id: 'In Progress', title: 'In Progress', color: '#38bdf8' },
  { id: 'Review', title: 'Review', color: '#f59e0b' },
  { id: 'Done', title: 'Done', color: '#10b981' },
];

@Component({
  selector: 'app-kanban-view',
  standalone: true,
  imports: [MdIcon, TimeAgoPipe],
  templateUrl: './kanban-view.html',
  styleUrl: './kanban-view.css',
})
export class KanbanView {
  private readonly store = inject(DocumentStore);

  readonly folderFilter = input<string | null>(null);
  readonly openDoc = output<string>();

  protected readonly columns = signal<KanbanColumn[]>(DEFAULT_COLUMNS);
  protected draggedDocId: string | null = null;

  /** Documents to display */
  protected readonly targetDocs = computed(() => {
    const folder = this.folderFilter();
    const all = this.store.sortedDocuments();
    if (!folder) return all;
    return all.filter((d) => d.folder?.toLowerCase() === folder.toLowerCase());
  });

  /** Cards mapped into columns */
  protected readonly columnCards = computed(() => {
    const docs = this.targetDocs();
    const map = new Map<string, MarkdownDocument[]>();

    for (const col of this.columns()) {
      map.set(col.id, []);
    }

    for (const doc of docs) {
      const { data } = parseFrontmatter(doc.content);
      const rawStatus = (data['status'] || 'Backlog').toString().trim();
      const colKey = this.matchColumn(rawStatus);

      if (!map.has(colKey)) {
        map.set(colKey, []);
      }
      map.get(colKey)!.push(doc);
    }

    return map;
  });

  private matchColumn(status: string): string {
    const norm = status.toLowerCase();
    for (const col of this.columns()) {
      if (col.id.toLowerCase() === norm) return col.id;
    }
    if (norm.includes('progress') || norm.includes('doing') || norm.includes('wip')) return 'In Progress';
    if (norm.includes('review') || norm.includes('test')) return 'Review';
    if (norm.includes('done') || norm.includes('complete') || norm.includes('closed')) return 'Done';
    return 'Backlog';
  }

  protected getDocTags(doc: MarkdownDocument): string[] {
    return extractDocumentTags(doc.content, doc.tags);
  }

  protected getDocWordCount(doc: MarkdownDocument): number {
    const trimmed = doc.content.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }

  protected readonly hoveredColumnId = signal<string | null>(null);
  protected readonly activeDraggedId = signal<string | null>(null);

  protected onDragStart(event: DragEvent, docId: string): void {
    this.draggedDocId = docId;
    this.activeDraggedId.set(docId);
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.setData('application/x-kanban-card', docId);
      event.dataTransfer.setData('text/plain', docId);
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  protected onDragOver(event: DragEvent, columnId: string): void {
    event.preventDefault();
    event.stopPropagation();
    this.hoveredColumnId.set(columnId);
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  protected onDragLeave(event: DragEvent, columnId: string): void {
    event.preventDefault();
    event.stopPropagation();
    const currentTarget = event.currentTarget as HTMLElement;
    const relatedTarget = event.relatedTarget as Node | null;
    if (relatedTarget && currentTarget?.contains(relatedTarget)) {
      return;
    }
    if (this.hoveredColumnId() === columnId) {
      this.hoveredColumnId.set(null);
    }
  }

  protected onDragEnd(event: DragEvent): void {
    event.stopPropagation();
    this.draggedDocId = null;
    this.activeDraggedId.set(null);
    this.hoveredColumnId.set(null);
  }

  protected onDrop(event: DragEvent, columnId: string): void {
    event.preventDefault();
    event.stopPropagation();
    this.hoveredColumnId.set(null);
    const docId =
      this.draggedDocId ||
      event.dataTransfer?.getData('application/x-kanban-card') ||
      event.dataTransfer?.getData('application/x-md-doc') ||
      event.dataTransfer?.getData('text/plain');

    if (!docId) {
      this.activeDraggedId.set(null);
      return;
    }

    this.store.updateFrontmatter(docId, 'status', columnId);
    this.draggedDocId = null;
    this.activeDraggedId.set(null);
  }

  protected addCardToColumn(columnId: string): void {
    const folder = this.folderFilter() || undefined;
    const initialContent = `---\nstatus: "${columnId}"\ntags: []\n---\n\n# Untitled Task\n\n`;
    const doc = this.store.create('Untitled Task', initialContent, folder);
    this.openDoc.emit(doc.id);
  }

  protected selectDoc(docId: string): void {
    this.store.select(docId);
    this.openDoc.emit(docId);
  }
}
