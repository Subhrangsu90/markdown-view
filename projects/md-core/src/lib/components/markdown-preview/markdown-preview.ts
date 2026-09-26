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
  computed,
} from '@angular/core';
import { isPlatformBrowser, KeyValuePipe } from '@angular/common';
import { MarkdownComponent } from 'ngx-markdown';
import { DocumentStore } from '../../services/document-store';
import { parseFrontmatter } from '../../models/frontmatter.util';

const ALERT_SVGS: Record<string, string> = {
  note: '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1.5a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"/></svg>',
  tip: '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M8 1.5c-2.363 0-4 1.69-4 3.75 0 .984.424 1.625.984 2.304l.214.253c.223.264.47.556.673.848.284.411.537.896.621 1.49a.75.75 0 0 1-1.484.211c-.04-.282-.163-.547-.37-.847a8.456 8.456 0 0 0-.542-.68c-.084-.1-.173-.205-.268-.32C3.201 7.75 2.5 6.766 2.5 5.25 2.5 2.31 4.863 0 8 0s5.5 2.31 5.5 5.25c0 1.516-.701 2.5-1.328 3.25-.095.115-.184.22-.268.319-.18.213-.362.43-.542.681-.207.3-.33.565-.37.847a.751.751 0 0 1-1.485-.212c.084-.593.337-1.078.621-1.489.203-.292.45-.584.673-.848.075-.088.147-.173.213-.253.561-.679.985-1.32.985-2.304 0-2.06-1.637-3.75-4-3.75ZM5.75 12h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1 0-1.5Zm1 3h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1 0-1.5Z"/></svg>',
  important:
    '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v9.5A1.75 1.75 0 0 1 14.25 13H8.06l-2.573 2.573A1.458 1.458 0 0 1 3 14.543V13H1.75A1.75 1.75 0 0 1 0 11.25Zm1.75-.25a.25.25 0 0 0-.25.25v9.5c0 .138.112.25.25.25h2a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.749.749 0 0 1 .53-.22h6.5a.25.25 0 0 0 .25-.25v-9.5a.25.25 0 0 0-.25-.25Zm7 2.25v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 9a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"/></svg>',
  warning:
    '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"/></svg>',
  caution:
    '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M4.47.22A.749.749 0 0 1 5 0h6c.199 0 .389.079.53.22l4.25 4.25c.141.14.22.331.22.53v6a.749.749 0 0 1-.22.53l-4.25 4.25A.749.749 0 0 1 11 16H5a.749.749 0 0 1-.53-.22L.22 11.53A.749.749 0 0 1 0 11V5c0-.199.079-.389.22-.53Zm.84 1.28L1.5 5.31v5.38l3.81 3.81h5.38l3.81-3.81V5.31L10.69 1.5ZM8 4a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 2 0Z"/></svg>',
};

const ALERT_TITLES: Record<string, string> = {
  note: 'Note',
  tip: 'Tip',
  important: 'Important',
  warning: 'Warning',
  caution: 'Caution',
  info: 'Note',
  success: 'Success',
  done: 'Done',
  check: 'Done',
  danger: 'Caution',
  error: 'Caution',
  fail: 'Caution',
  hint: 'Tip',
  attention: 'Warning',
};

const ALERT_TYPE_MAP: Record<string, string> = {
  note: 'note',
  info: 'note',
  tip: 'tip',
  hint: 'tip',
  success: 'tip',
  done: 'tip',
  check: 'tip',
  important: 'important',
  warning: 'warning',
  attention: 'warning',
  caution: 'caution',
  danger: 'caution',
  error: 'caution',
  fail: 'caution',
};

@Component({
  selector: 'md-markdown-preview',
  standalone: true,
  imports: [MarkdownComponent, KeyValuePipe],
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

  protected readonly isArray = Array.isArray;

  /** Preprocesses content for frontmatter separation and [[Wikilinks]] */
  protected readonly parsedContent = computed(() => {
    const raw = this.content();
    const { data, body } = parseFrontmatter(raw);

    // Transform [[Title]] and [[Title|Alias]] into [Alias](wikilink:Title)
    const wikilinkTransformed = body.replace(
      /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
      (_, title, alias) => {
        const text = (alias || title).trim();
        const linkTarget = title.trim();
        return `[${text}](wikilink:${encodeURIComponent(linkTarget)})`;
      },
    );

    return {
      frontmatter: Object.keys(data).length > 0 ? data : null,
      body: wikilinkTransformed,
    };
  });

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
    this.enhanceTags();
    await this.enhanceMermaid();
    await this.enhanceMath();
  }

  /**
   * Highlights inline #tags with interactive pills.
   */
  private enhanceTags(): void {
    const container = this.previewContainer()?.nativeElement;
    if (!container) return;

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const nodesToReplace: { node: Text; parent: Node; matches: RegExpExecArray[] }[] = [];
    const tagRegex = /(?:^|\s)#([a-zA-Z0-9_\-]+)(?=\s|[.,;:!?]|$)/g;

    let currentNode = walker.nextNode();
    while (currentNode) {
      const parent = currentNode.parentElement;
      // Do not replace inside code blocks, math, links, or already processed tags
      if (
        parent &&
        !parent.closest('pre') &&
        !parent.closest('code') &&
        !parent.closest('.katex') &&
        !parent.closest('a') &&
        !parent.closest('.tag-pill')
      ) {
        const text = currentNode.nodeValue || '';
        let match: RegExpExecArray | null;
        const matches: RegExpExecArray[] = [];
        while ((match = tagRegex.exec(text)) !== null) {
          if (!/^\d+$/.test(match[1])) {
            matches.push(match);
          }
        }
        if (matches.length > 0) {
          nodesToReplace.push({ node: currentNode as Text, parent, matches });
        }
      }
      currentNode = walker.nextNode();
    }

    for (const { node, parent } of nodesToReplace) {
      const text = node.nodeValue || '';
      const fragment = document.createDocumentFragment();
      let lastIndex = 0;
      const re = /(^|\s)#([a-zA-Z0-9_\-]+)(?=\s|[.,;:!?]|$)/g;
      let m: RegExpExecArray | null;

      while ((m = re.exec(text)) !== null) {
        const full = m[0];
        const prefix = m[1];
        const tag = m[2];
        const matchStart = m.index;

        if (matchStart > lastIndex) {
          fragment.appendChild(document.createTextNode(text.substring(lastIndex, matchStart)));
        }

        if (prefix) {
          fragment.appendChild(document.createTextNode(prefix));
        }

        const pill = document.createElement('span');
        pill.className = 'tag-pill';
        pill.textContent = `#${tag}`;
        pill.setAttribute('data-tag', tag.toLowerCase());
        fragment.appendChild(pill);

        lastIndex = matchStart + full.length;
      }

      if (lastIndex < text.length) {
        fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
      }

      parent.replaceChild(fragment, node);
    }
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

      // Handle [[Wikilinks]]
      if (rawHref.startsWith('wikilink:')) {
        link.classList.add('wikilink');
        const targetTitle = decodeURIComponent(rawHref.replace('wikilink:', ''));
        const matched = this.store.findByPathOrTitle(targetTitle);

        if (!matched) {
          link.classList.add('wikilink-new');
          link.setAttribute('title', `Click to create new page: "${targetTitle}"`);
        } else {
          link.setAttribute('title', `Navigate to "${matched.title}"`);
        }

        link.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (matched) {
            this.store.select(matched.id);
            this.documentNavigate.emit({ docId: matched.id, title: matched.title });
          } else {
            const newDoc = this.store.create(targetTitle, `# ${targetTitle}\n\n`);
            this.documentNavigate.emit({ docId: newDoc.id, title: newDoc.title });
          }
        });
        return;
      }

      // External links
      if (
        /^https?:\/\//i.test(rawHref) ||
        rawHref.startsWith('mailto:') ||
        rawHref.startsWith('tel:')
      ) {
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

      const isBadgeContainer =
        imgs.some((img) => {
          const src = img.getAttribute('src') || '';
          const alt = img.getAttribute('alt') || '';
          return (
            /shields\.io|badge|badgen|codecov|travis-ci|circleci|workflows\/.*\/badge/i.test(src) ||
            /license|build|test|coverage|version|npm|prs|stars|status|downloads/i.test(alt)
          );
        }) ||
        (p.childNodes.length > 0 &&
          Array.from(p.childNodes).every((node) => {
            if (node.nodeType === Node.TEXT_NODE) return !node.textContent?.trim();
            if (node.nodeType === Node.ELEMENT_NODE) {
              const el = node as HTMLElement;
              return (
                el.tagName === 'BR' ||
                el.tagName === 'IMG' ||
                (el.tagName === 'A' && !!el.querySelector('img'))
              );
            }
            return false;
          }) &&
          imgs.length >= 2);

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
      if (bq.classList.contains('markdown-alert') || bq.classList.contains('notion-callout')) {
        return;
      }

      const firstP = bq.querySelector('p');
      if (!firstP) return;

      const html = firstP.innerHTML.trim();
      const alertRegex =
        /^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION|INFO|SUCCESS|DONE|CHECK|DANGER|ERROR|FAIL|HINT|ATTENTION)\]([^\n<]*)(?:<br\s*\/?>|\n)?([\s\S]*)$/i;
      const match = html.match(alertRegex);

      if (!match) return;

      const rawType = match[1].toLowerCase();
      const customTitle = match[2]?.trim();
      const remainder = match[3] ?? '';

      const standardType = ALERT_TYPE_MAP[rawType] || 'note';
      const defaultTitle = ALERT_TITLES[rawType] || 'Note';

      // Clean leading and trailing <br> tags from remainder
      let cleanedRemainder = remainder
        .replace(/^(\s*<br\s*\/?>\s*)+/i, '')
        .replace(/(\s*<br\s*\/?>\s*)+$/i, '')
        .trim();

      // Determine display title vs inline content
      let displayTitle = defaultTitle;
      if (customTitle) {
        if (cleanedRemainder || bq.querySelectorAll('p, ul, ol, pre').length > 1) {
          displayTitle = customTitle;
        } else {
          // If only customTitle was provided without subsequent body, use default title and make customTitle the body
          displayTitle = defaultTitle;
          cleanedRemainder = customTitle;
        }
      }

      const svgIcon = ALERT_SVGS[standardType] || ALERT_SVGS['note'];

      bq.classList.add(
        'markdown-alert',
        `markdown-alert-${standardType}`,
        'notion-callout',
        `callout-${standardType}`,
      );

      // Update or remove first paragraph
      if (cleanedRemainder) {
        firstP.innerHTML = cleanedRemainder;
      } else {
        firstP.remove();
      }

      // Collect remaining children into content wrapper
      const contentWrapper = document.createElement('div');
      contentWrapper.className = 'markdown-alert-content';
      while (bq.firstChild) {
        contentWrapper.appendChild(bq.firstChild);
      }

      // Build alert title row
      const titleDiv = document.createElement('div');
      titleDiv.className = 'markdown-alert-title';

      const iconSpan = document.createElement('span');
      iconSpan.className = 'alert-icon';
      iconSpan.innerHTML = svgIcon;

      const nameSpan = document.createElement('span');
      nameSpan.className = 'alert-name';
      nameSpan.textContent = displayTitle;

      titleDiv.appendChild(iconSpan);
      titleDiv.appendChild(nameSpan);

      bq.appendChild(titleDiv);
      if (contentWrapper.hasChildNodes()) {
        bq.appendChild(contentWrapper);
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
      const isDark =
        document.documentElement.classList.contains('dark') ||
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
      const mathCodes = container.querySelectorAll<HTMLElement>(
        'code.language-math, code.language-latex',
      );
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
        container.querySelectorAll<HTMLElement>('p, blockquote, li, td, th'),
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

      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
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
        },
      });

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
              frag.appendChild(
                document.createTextNode(text.slice(lastIndex, match.index) + prefix),
              );
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
