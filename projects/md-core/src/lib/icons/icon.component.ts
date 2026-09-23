import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { SVG_ICONS, resolveIconName, IconName } from './icon-registry';

@Component({
  selector: 'md-icon',
  standalone: true,
  template: `
    <span
      class="md-icon-inner"
      [innerHTML]="safeSvg()"
    ></span>
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
    .md-icon-inner {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
    }
    :host ::ng-deep svg {
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

  /** Sanitized complete SVG string safe for both browser and SSR Domino */
  protected readonly safeSvg = computed<SafeHtml>(() => {
    const iconName = resolveIconName(this.name());
    const markup = SVG_ICONS[iconName] || SVG_ICONS['document'];
    const s = this.size();
    const sw = this.strokeWidth();
    const f = this.fill();
    const cls = this.className() ? ` class="${this.className()}"` : '';
    const svgStr = `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="${f}" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"${cls}>${markup}</svg>`;
    return this.sanitizer.bypassSecurityTrustHtml(svgStr);
  });
}
