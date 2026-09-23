import { Component, output, HostListener } from '@angular/core';

@Component({
  selector: 'app-shortcuts-modal',
  standalone: true,
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
