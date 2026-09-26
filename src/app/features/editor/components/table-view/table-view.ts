import { Component, input, output, inject, computed } from '@angular/core';
import {
  DocumentStore,
  MarkdownDocument,
  MdIcon,
  parseFrontmatter,
  extractDocumentTags,
  TimeAgoPipe,
} from 'md-core';

@Component({
  selector: 'app-table-view',
  standalone: true,
  imports: [MdIcon, TimeAgoPipe],
  templateUrl: './table-view.html',
  styleUrl: './table-view.css',
})
export class TableView {
  private readonly store = inject(DocumentStore);

  readonly folderFilter = input<string | null>(null);
  readonly openDoc = output<string>();

  protected readonly targetDocs = computed(() => {
    const folder = this.folderFilter();
    const all = this.store.sortedDocuments();
    if (!folder) return all;
    return all.filter((d) => d.folder?.toLowerCase() === folder.toLowerCase());
  });

  protected getDocStatus(doc: MarkdownDocument): string {
    const { data } = parseFrontmatter(doc.content);
    return (data['status'] || 'Draft').toString();
  }

  protected getDocTags(doc: MarkdownDocument): string[] {
    return extractDocumentTags(doc.content, doc.tags);
  }

  protected getDocWordCount(doc: MarkdownDocument): number {
    const trimmed = doc.content.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }

  protected selectDoc(docId: string): void {
    this.store.select(docId);
    this.openDoc.emit(docId);
  }

  protected changeStatus(doc: MarkdownDocument, event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.store.updateFrontmatter(doc.id, 'status', select.value);
  }

  protected createNewRow(): void {
    const folder = this.folderFilter() || undefined;
    const doc = this.store.create('Untitled Task', '---\nstatus: "Backlog"\n---\n\n# Untitled\n\n', folder);
    this.selectDoc(doc.id);
  }
}
