import { Component, output, inject, computed, signal } from '@angular/core';
import { DocumentStore, MarkdownDocument, MdIcon } from 'md-core';

@Component({
  selector: 'app-backlinks-panel',
  standalone: true,
  imports: [MdIcon],
  templateUrl: './backlinks-panel.html',
  styleUrl: './backlinks-panel.css',
})
export class BacklinksPanel {
  private readonly store = inject(DocumentStore);

  readonly close = output<void>();
  readonly navigateDoc = output<string>();

  protected readonly activeDoc = computed(() => this.store.activeDocument());
  protected readonly isCollapsed = signal<boolean>(false);

  /** Linked References (documents linking to active note) */
  protected readonly linkedReferences = computed(() => {
    const doc = this.activeDoc();
    if (!doc) return [];
    return this.store.getLinkedReferences(doc.id);
  });

  /** Unlinked Mentions (documents mentioning active note title) */
  protected readonly unlinkedMentions = computed(() => {
    const doc = this.activeDoc();
    if (!doc) return [];
    return this.store.getUnlinkedMentions(doc.id);
  });

  protected readonly totalCount = computed(() => {
    return this.linkedReferences().length + this.unlinkedMentions().length;
  });

  protected openDocument(docId: string): void {
    this.store.select(docId);
    this.navigateDoc.emit(docId);
  }

  protected linkMention(sourceDoc: MarkdownDocument): void {
    const active = this.activeDoc();
    if (!active) return;

    // Replace the first mention of active title with [[active.title]]
    const regex = new RegExp(active.title, 'i');
    const newContent = sourceDoc.content.replace(regex, `[[${active.title}]]`);
    this.store.updateContent(newContent);
  }
}
