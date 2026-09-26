import {
  Component,
  output,
  inject,
  computed,
  signal,
  effect,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  DocumentStore,
  DocumentHistoryService,
  DocumentSnapshot,
  MdIcon,
  TimeAgoPipe,
} from 'md-core';

@Component({
  selector: 'app-history-modal',
  standalone: true,
  imports: [DatePipe, MdIcon, TimeAgoPipe],
  templateUrl: './history-modal.html',
  styleUrl: './history-modal.css',
})
export class HistoryModal {
  private readonly store = inject(DocumentStore);
  private readonly historyService = inject(DocumentHistoryService);

  readonly close = output<void>();
  readonly restored = output<string>();

  protected readonly activeDoc = computed(() => this.store.activeDocument());
  protected readonly snapshots = signal<DocumentSnapshot[]>([]);
  protected readonly selectedSnapshot = signal<DocumentSnapshot | null>(null);

  constructor() {
    effect(() => {
      const doc = this.activeDoc();
      if (doc) {
        const list = this.historyService.getSnapshots(doc.id);
        this.snapshots.set(list);
        this.selectedSnapshot.set(list[0] ?? null);
      } else {
        this.snapshots.set([]);
        this.selectedSnapshot.set(null);
      }
    });
  }

  protected selectSnapshot(s: DocumentSnapshot): void {
    this.selectedSnapshot.set(s);
  }

  protected restoreVersion(s: DocumentSnapshot): void {
    const doc = this.activeDoc();
    if (!doc) return;

    if (confirm(`Restore version from ${new Date(s.timestamp).toLocaleTimeString()}? Current unsaved edits will be saved as a new version.`)) {
      // Save current state first
      this.historyService.captureSnapshot(doc, true);
      this.store.updateTitle(doc.id, s.title);
      this.store.updateContent(s.content);
      this.restored.emit(`Restored version from ${new Date(s.timestamp).toLocaleTimeString()}`);
      this.close.emit();
    }
  }
}
