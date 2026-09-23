import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { SVG_ICONS, resolveIconName, IconName } from './icon-registry';

@Component({
  selector: 'md-icon',
  standalone: true,
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      [attr.fill]="fill()"
      stroke="currentColor"
      [attr.stroke-width]="strokeWidth()"
      stroke-linecap="round"
      stroke-linejoin="round"
      [class]="className()"
      [innerHTML]="safeSvg()"
    ></svg>
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      vertical-align: middle;
      flex-shrink: 0;
    }
    svg {
      display: block;
    }
  `],
})
export class MdIcon {
  private readonly sanitizer = inject(DomSanitizer);

  /** Icon identifier from registry or legacy emoji */
  readonly name = input<string | null | undefined>('document');

  /** Pixel dimensions (width and height) */
  readonly size = input<number | string>(16);

  /** Stroke width (default 2) */
  readonly strokeWidth = input<number | string>(2);

  /** Fill attribute (default none) */
  readonly fill = input<string>('none');

  /** Optional CSS class applied to internal SVG */
  readonly className = input<string>('');

  /** Sanitized inner SVG paths */
  protected readonly safeSvg = computed<SafeHtml>(() => {
    const iconName = resolveIconName(this.name());
    const markup = SVG_ICONS[iconName] || SVG_ICONS['document'];
    return this.sanitizer.bypassSecurityTrustHtml(markup);
  });
}
