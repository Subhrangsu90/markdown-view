import { Component, output, HostListener } from '@angular/core';
import { MdIcon } from 'md-core';

@Component({
  selector: 'app-shortcuts-modal',
  standalone: true,
  imports: [MdIcon],
  templateUrl: './shortcuts-modal.html',
  styleUrl: './shortcuts-modal.css',
})
export class ShortcutsModal {
  readonly close = output<void>();

  @HostListener('window:keydown.escape')
  onEscape(): void {
    this.close.emit();
  }
}
