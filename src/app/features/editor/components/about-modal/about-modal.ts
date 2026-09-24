import { Component, output, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MdIcon } from 'md-core';

@Component({
  selector: 'app-about-modal',
  standalone: true,
  imports: [CommonModule, MdIcon],
  templateUrl: './about-modal.html',
  styleUrl: './about-modal.css',
})
export class AboutModal {
  readonly close = output<void>();
  readonly openShortcuts = output<void>();

  @HostListener('window:keydown.escape')
  onEscape(): void {
    this.close.emit();
  }
}
