import { Component, signal, output, ElementRef, viewChild, afterRenderEffect } from '@angular/core';

@Component({
  selector: 'md-split-view',
  templateUrl: './split-view.html',
  styleUrl: './split-view.css',
})
export class SplitView {
  private readonly containerRef = viewChild.required<ElementRef<HTMLElement>>('container');
  protected readonly leftWidth = signal(50);
  private isDragging = false;

  readonly leftWidthChange = output<number>();

  constructor() {
    afterRenderEffect(() => {
      // Setup listeners on container
      const container = this.containerRef().nativeElement;
      container.addEventListener('mousemove', this.onMouseMove);
      container.addEventListener('mouseup', this.onMouseUp);
      container.addEventListener('mouseleave', this.onMouseUp);
    });
  }

  protected onDividerMouseDown(event: MouseEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }

  private onMouseMove = (event: MouseEvent): void => {
    if (!this.isDragging) return;
    const container = this.containerRef().nativeElement;
    const rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percent = Math.min(Math.max((x / rect.width) * 100, 20), 80);
    this.leftWidth.set(percent);
    this.leftWidthChange.emit(percent);
  };

  private onMouseUp = (): void => {
    this.isDragging = false;
  };
}
