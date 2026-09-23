import {
  Component,
  input,
  output,
  viewChild,
  ElementRef,
  PLATFORM_ID,
  inject,
  HostListener,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MarkdownComponent } from 'ngx-markdown';

@Component({
  selector: 'md-markdown-preview',
  imports: [MarkdownComponent],
  templateUrl: './markdown-preview.html',
  styleUrl: './markdown-preview.css',
})
export class MarkdownPreview {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly hostRef = inject(ElementRef<HTMLElement>);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  protected readonly previewContainer = viewChild<ElementRef<HTMLElement>>('previewContainer');

  readonly content = input<string>('');
  readonly scrollEvent = output<Event>();

  @HostListener('scroll', ['$event'])
  onScroll(event: Event): void {
    this.scrollEvent.emit(event);
  }

  scrollToRatio(ratio: number): void {
    const el = this.hostRef.nativeElement;
    if (el) {
      el.scrollTop = ratio * (el.scrollHeight - el.clientHeight);
    }
  }

  getRenderedHtml(): string {
    return this.previewContainer()?.nativeElement?.innerHTML || '';
  }

  protected onReady(): void {
    if (!this.isBrowser) return;
    this.enhanceCodeBlocks();
    this.enhanceCallouts();
  }

  private enhanceCodeBlocks(): void {
    const container = this.previewContainer()?.nativeElement;
    if (!container) return;

    const pres = container.querySelectorAll('pre');
    pres.forEach((pre) => {
      if (pre.querySelector('.code-block-header')) return;

      const code = pre.querySelector('code');
      const rawClass = code?.getAttribute('class') || '';
      const match = rawClass.match(/language-([a-zA-Z0-9_-]+)/);
      const lang = match ? match[1].toUpperCase() : 'CODE';

      const header = document.createElement('div');
      header.className = 'code-block-header';
      header.innerHTML = `
        <span class="code-lang">${lang}</span>
        <button class="copy-code-btn" type="button" title="Copy code">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          <span class="copy-text">Copy</span>
        </button>
      `;

      const copyBtn = header.querySelector('.copy-code-btn');
      copyBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        const codeText = code?.textContent || pre.textContent || '';
        navigator.clipboard.writeText(codeText).then(() => {
          const textSpan = copyBtn.querySelector('.copy-text');
          if (textSpan) textSpan.textContent = 'Copied!';
          copyBtn.classList.add('copied');
          setTimeout(() => {
            if (textSpan) textSpan.textContent = 'Copy';
            copyBtn.classList.remove('copied');
          }, 2000);
        });
      });

      pre.insertBefore(header, pre.firstChild);
    });
  }

  private enhanceCallouts(): void {
    const container = this.previewContainer()?.nativeElement;
    if (!container) return;

    const blockquotes = container.querySelectorAll('blockquote');
    blockquotes.forEach((bq) => {
      const firstP = bq.querySelector('p');
      if (!firstP) return;

      const text = firstP.innerHTML.trim();
      const alertMatch = text.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i);

      if (alertMatch) {
        const type = alertMatch[1].toLowerCase();
        bq.classList.add('notion-callout', `callout-${type}`);
        firstP.innerHTML = text.replace(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i, '').trim();

        const iconDiv = document.createElement('div');
        iconDiv.className = 'callout-icon';
        const icons: Record<string, string> = {
          note: 'ℹ️',
          tip: '💡',
          important: '📌',
          warning: '⚠️',
          caution: '🚨',
        };
        iconDiv.textContent = icons[type] || '💡';
        bq.insertBefore(iconDiv, bq.firstChild);
      }
    });
  }
}
