import {
  Component,
  input,
  output,
  viewChild,
  ElementRef,
  PLATFORM_ID,
  inject,
  HostListener,
  effect,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MarkdownComponent } from 'ngx-markdown';
import { DocumentStore } from '../../services/document-store';

@Component({
  selector: 'md-markdown-preview',
  standalone: true,
  imports: [MarkdownComponent],
  templateUrl: './markdown-preview.html',
  styleUrl: './markdown-preview.css',
})
export class MarkdownPreview {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly hostRef = inject(ElementRef<HTMLElement>);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly store = inject(DocumentStore);
  protected readonly previewContainer = viewChild<ElementRef<HTMLElement>>('previewContainer');

  readonly content = input<string>('');
  readonly scrollEvent = output<Event>();
  readonly contentChange = output<string>();
  readonly documentNavigate = output<{ docId: string; title: string }>();

  constructor() {
    effect(() => {
      // Re-run enhancements whenever document content updates
      this.content();
      if (this.isBrowser) {
        setTimeout(() => this.onReady(), 50);
      }
    });
  }

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

  scrollToHeading(text: string): void {
    const container = this.previewContainer()?.nativeElement;
    if (!container) return;
    const clean = text.trim().toLowerCase();
    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    for (let i = 0; i < headings.length; i++) {
      const h = headings[i];
      if (h.textContent?.trim().toLowerCase().includes(clean)) {
        h.scrollIntoView({ behavior: 'smooth', block: 'start' });
        break;
      }
    }
  }

  getRenderedHtml(): string {
    return this.previewContainer()?.nativeElement?.innerHTML || '';
  }

  protected async onReady(): Promise<void> {
    if (!this.isBrowser) return;
    this.enhanceCodeBlocks();
    this.enhanceCallouts();
    this.enhanceCheckboxes();
    this.enhanceLinksAndHeadings();
    this.enhanceBadges();
    await this.enhanceMermaid();
    await this.enhanceMath();
  }

  /**
   * Generates IDs on headings and enables interactive in-page anchor links and
   * inter-document page navigation (e.g. [Local setup](14-local-development-setup.md))
   */
  private enhanceLinksAndHeadings(): void {
    const container = this.previewContainer()?.nativeElement;
    if (!container) return;

    // 1. Ensure all headings have deterministic GFM IDs
    const headings = container.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6');
    headings.forEach((heading) => {
      if (!heading.id) {
        const text = heading.textContent || '';
        const slug = text
          .toLowerCase()
          .trim()
          .replace(/<[^>]+>/g, '')
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-');
        heading.id = slug;
      }
    });

    // 2. Intercept and handle all links
    const links = container.querySelectorAll<HTMLAnchorElement>('a[href]');
    links.forEach((link) => {
      const rawHref = link.getAttribute('href') || '';
      if (!rawHref) return;

      // External links
      if (/^https?:\/\//i.test(rawHref) || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:')) {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
        return;
      }

      // Internal in-page anchor links (e.g. #contents or #1-overview-and-goals)
      if (rawHref.startsWith('#')) {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const anchor = rawHref.substring(1);
          this.scrollToAnchor(anchor);
        });
        return;
      }

      // Inter-document links (e.g. 14-local-development-setup.md, ./setup.md, ../other)
      link.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const [filePart, anchorPart] = rawHref.split('#');
        const matched = this.store.findByPathOrTitle(filePart);
        if (matched) {
          this.store.select(matched.id);
          this.documentNavigate.emit({ docId: matched.id, title: matched.title });
          if (anchorPart) {
            setTimeout(() => {
              this.scrollToAnchor(anchorPart);
            }, 150);
          }
        } else {
          console.warn(`[MarkdownView] Linked document not found in store: "${filePart}"`);
        }
      });
    });
  }

  /**
   * Enhances badge images (Shields.io, GitHub Actions, Codecov, etc.)
   * Displays them as sleek inline rows rather than vertically stacked blocks with heavy margins.
   */
  private enhanceBadges(): void {
    const container = this.previewContainer()?.nativeElement;
    if (!container) return;

    const paragraphs = container.querySelectorAll<HTMLElement>('p');
    paragraphs.forEach((p) => {
      const imgs = Array.from(p.querySelectorAll<HTMLImageElement>('img'));
      if (imgs.length === 0) return;

      const isBadgeContainer = imgs.some((img) => {
        const src = img.getAttribute('src') || '';
        const alt = img.getAttribute('alt') || '';
        return (
          /shields\.io|badge|badgen|codecov|travis-ci|circleci|workflows\/.*\/badge/i.test(src) ||
          /license|build|test|coverage|version|npm|prs|stars|status|downloads/i.test(alt)
        );
      }) || (
        p.childNodes.length > 0 &&
        Array.from(p.childNodes).every((node) => {
          if (node.nodeType === Node.TEXT_NODE) return !node.textContent?.trim();
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            return el.tagName === 'BR' || el.tagName === 'IMG' || (el.tagName === 'A' && !!el.querySelector('img'));
          }
          return false;
        }) &&
        imgs.length >= 2
      );

      if (isBadgeContainer) {
        p.classList.add('markdown-badge-row');
        // Remove intervening <br> tags inserted by breaks: true
        p.querySelectorAll('br').forEach((br) => br.remove());
        imgs.forEach((img) => {
          img.classList.add('markdown-badge');
          const link = img.closest('a');
          if (link) {
            link.classList.add('markdown-badge-link');
          }
        });
      } else {
        // Also tag individual badge images in any paragraph so they don't render as giant blocks
        imgs.forEach((img) => {
          const src = img.getAttribute('src') || '';
          const alt = img.getAttribute('alt') || '';
          if (
            /shields\.io|badge|badgen|codecov|travis-ci|circleci|workflows\/.*\/badge/i.test(src) ||
            /license|build|test|coverage|version|npm|prs|stars|status|downloads/i.test(alt)
          ) {
            img.classList.add('markdown-badge');
            const link = img.closest('a');
            if (link) link.classList.add('markdown-badge-link');
          }
        });
      }
    });
  }

  private scrollToAnchor(targetId: string): void {
    const container = this.previewContainer()?.nativeElement;
    if (!container) return;

    const clean = decodeURIComponent(targetId).toLowerCase().trim();
    // 1. Try exact element ID
    try {
      const byId = container.querySelector(`[id="${CSS.escape(clean)}"]`);
      if (byId) {
        byId.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    } catch {
      // Fall through to slug matching if CSS.escape fails on complex strings
    }

    // 2. Try normalized slug comparison on headings
    const cleanNorm = clean.replace(/[^\w]/g, '');
    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    for (let i = 0; i < headings.length; i++) {
      const h = headings[i];
      const hNorm = (h.textContent || '').toLowerCase().replace(/[^\w]/g, '');
      if (hNorm.includes(cleanNorm) || cleanNorm.includes(hNorm)) {
        h.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
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

      // Skip mermaid and math blocks from generic code header
      if (lang === 'MERMAID' || lang === 'MATH' || lang === 'LATEX') return;

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

  /**
   * Interactive checkboxes:
   * Clicking a rendered checkbox toggles the corresponding - [ ] / - [x] in the markdown source!
   */
  private enhanceCheckboxes(): void {
    const container = this.previewContainer()?.nativeElement;
    if (!container) return;

    const checkboxes = container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    checkboxes.forEach((cb, index) => {
      cb.removeAttribute('disabled');
      cb.style.cursor = 'pointer';

      cb.addEventListener('change', (e) => {
        e.stopPropagation();
        this.toggleCheckboxInMarkdown(index);
      });
    });
  }

  private toggleCheckboxInMarkdown(targetIndex: number): void {
    const raw = this.content();
    let count = 0;
    const taskRegex = /^(\s*[-*+]\s+\[)([ xX])(\]\s+.*)$/gm;

    const updated = raw.replace(taskRegex, (fullMatch, prefix, checked, suffix) => {
      if (count === targetIndex) {
        count++;
        const newChecked = checked === ' ' ? 'x' : ' ';
        return `${prefix}${newChecked}${suffix}`;
      }
      count++;
      return fullMatch;
    });

    if (updated !== raw) {
      this.contentChange.emit(updated);
    }
  }

  /**
   * Render Mermaid code blocks as SVG diagrams
   */
  private async enhanceMermaid(): Promise<void> {
    const container = this.previewContainer()?.nativeElement;
    if (!container) return;

    const mermaidCodes = container.querySelectorAll<HTMLElement>('code.language-mermaid');
    if (mermaidCodes.length === 0) return;

    try {
      const mermaidModule = await import('mermaid');
      const mermaid = mermaidModule.default ?? mermaidModule;
      const isDark = document.documentElement.classList.contains('dark') ||
        window.matchMedia('(prefers-color-scheme: dark)').matches;

      mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? 'dark' : 'default',
        securityLevel: 'loose',
        fontFamily: 'Inter, sans-serif',
      });

      for (let i = 0; i < mermaidCodes.length; i++) {
        const codeEl = mermaidCodes[i];
        const pre = codeEl.closest('pre');
        if (!pre || pre.dataset['mermaidRendered']) continue;

        pre.dataset['mermaidRendered'] = 'true';
        const codeText = codeEl.textContent?.trim() || '';
        const id = `mermaid-diag-${Date.now()}-${i}`;

        try {
          const { svg } = await mermaid.render(id, codeText);
          const diagramWrapper = document.createElement('div');
          diagramWrapper.className = 'mermaid-diagram-card';
          diagramWrapper.innerHTML = svg;
          pre.replaceWith(diagramWrapper);
        } catch {
          // Keep raw block if syntax error in diagram
        }
      }
    } catch {
      // Mermaid failed to load dynamically
    }
  }

  /**
   * Render KaTeX LaTeX math formulas (block $$, inline $, and code blocks)
   */
  private async enhanceMath(): Promise<void> {
    const container = this.previewContainer()?.nativeElement;
    if (!container) return;

    try {
      const katexModule = await import('katex');
      const katex = katexModule.default ?? katexModule;
      if (this.isBrowser) {
        (window as any).katex = katex;
      }

      // 1. Math code blocks (```math or ```latex)
      const mathCodes = container.querySelectorAll<HTMLElement>('code.language-math, code.language-latex');
      mathCodes.forEach((codeEl) => {
        const pre = codeEl.closest('pre');
        if (pre && !pre.dataset['mathRendered']) {
          pre.dataset['mathRendered'] = 'true';
          const formula = codeEl.textContent?.trim() || '';
          const mathDiv = document.createElement('div');
          mathDiv.className = 'katex-block-wrapper';
          try {
            katex.render(formula, mathDiv, { displayMode: true, throwOnError: false });
            pre.replaceWith(mathDiv);
          } catch {
            // Keep original if render fails
          }
        }
      });

      // 2. Block math ($$ ... $$)
      const blockMathRegex = /\$\$([\s\S]+?)\$\$/g;
      const blockCandidates = Array.from(
        container.querySelectorAll<HTMLElement>('p, blockquote, li, td, th')
      );

      for (const el of blockCandidates) {
        if (el.closest('.katex-block-wrapper, pre, code')) continue;
        if (!el.innerHTML.includes('$$')) continue;

        // Clean up <br> tags inserted by Markdown line-breaks and unescape HTML entities
        const normalized = el.innerHTML
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'");

        if (blockMathRegex.test(normalized)) {
          blockMathRegex.lastIndex = 0;
          let hasMatch = false;

          const renderedHtml = normalized.replace(blockMathRegex, (match, formula) => {
            const clean = formula.trim();
            if (!clean) return match;
            try {
              hasMatch = true;
              const rendered = katex.renderToString(clean, {
                displayMode: true,
                throwOnError: false,
              });
              return `<div class="katex-block-wrapper">${rendered}</div>`;
            } catch {
              return match;
            }
          });

          if (hasMatch) {
            const temp = document.createElement('div');
            temp.innerHTML = renderedHtml;

            // If the element only contained the math block, replace element itself
            if (
              temp.children.length === 1 &&
              temp.firstElementChild?.classList.contains('katex-block-wrapper') &&
              temp.textContent?.trim() === ''
            ) {
              el.replaceWith(temp.firstElementChild);
            } else if (el.tagName.toLowerCase() === 'p') {
              // Valid HTML: <p> cannot contain <div> in DOM, unwrap cleanly
              el.replaceWith(...Array.from(temp.childNodes));
            } else {
              el.innerHTML = renderedHtml;
            }
          }
        }
      }

      // 3. Inline math ($ ... $)
      const inlineMathRegex = /(^|[^\\])\$([^\s\$](?:[^\$\n\r]*?[^\s\$])?)\$/g;

      const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode(node) {
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            const tag = parent.tagName.toLowerCase();
            if (['pre', 'code', 'script', 'style', 'textarea', 'input'].includes(tag)) {
              return NodeFilter.FILTER_REJECT;
            }
            if (parent.closest('.katex, .katex-block-wrapper, .mermaid-diagram-card')) {
              return NodeFilter.FILTER_REJECT;
            }
            if (node.nodeValue && node.nodeValue.includes('$')) {
              return NodeFilter.FILTER_ACCEPT;
            }
            return NodeFilter.FILTER_SKIP;
          }
        }
      );

      const replacements: { node: Text; fragment: DocumentFragment }[] = [];
      let textNode = walker.nextNode() as Text | null;

      while (textNode) {
        const text = textNode.nodeValue || '';
        if (text.includes('$')) {
          inlineMathRegex.lastIndex = 0;
          let match: RegExpExecArray | null;
          let lastIndex = 0;
          let hasInline = false;
          const frag = document.createDocumentFragment();

          while ((match = inlineMathRegex.exec(text)) !== null) {
            const prefix = match[1];
            const formula = match[2].trim();
            const matchStart = match.index + prefix.length;
            const matchEnd = match.index + match[0].length;

            // Skip currency amounts like $10, $5.99, $1000
            if (/^\d+(?:[.,]\d+)?(?:\s*(?:million|billion|k|m|usd))?$/i.test(formula)) {
              continue;
            }

            hasInline = true;
            if (matchStart > lastIndex) {
              frag.appendChild(document.createTextNode(text.slice(lastIndex, match.index) + prefix));
            } else if (prefix) {
              frag.appendChild(document.createTextNode(prefix));
            }

            try {
              const span = document.createElement('span');
              span.className = 'katex-inline-wrapper';
              span.innerHTML = katex.renderToString(formula, {
                displayMode: false,
                throwOnError: false,
              });
              frag.appendChild(span);
            } catch {
              frag.appendChild(document.createTextNode(`$${formula}$`));
            }

            lastIndex = matchEnd;
          }

          if (hasInline) {
            if (lastIndex < text.length) {
              frag.appendChild(document.createTextNode(text.slice(lastIndex)));
            }
            replacements.push({ node: textNode, fragment: frag });
          }
        }
        textNode = walker.nextNode() as Text | null;
      }

      for (const { node, fragment } of replacements) {
        node.parentNode?.replaceChild(fragment, node);
      }
    } catch (err) {
      console.error('KaTeX rendering error:', err);
    }
  }
}
