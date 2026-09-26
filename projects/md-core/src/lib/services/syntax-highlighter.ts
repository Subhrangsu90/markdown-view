import Prism from 'prismjs';

// Core dependencies first
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-javascript';

// Web and Application Languages
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-scss';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-toml';
import 'prismjs/components/prism-ini';
import 'prismjs/components/prism-markdown';

// Backend and Systems Languages
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-powershell';
import 'prismjs/components/prism-docker';
import 'prismjs/components/prism-graphql';
import 'prismjs/components/prism-diff';

// Language aliases map
const LANGUAGE_ALIASES: Record<string, string> = {
  ts: 'typescript',
  js: 'javascript',
  py: 'python',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  pwsh: 'powershell',
  ps1: 'powershell',
  yml: 'yaml',
  golang: 'go',
  rs: 'rust',
  cs: 'csharp',
  'c#': 'csharp',
  'c++': 'cpp',
  md: 'markdown',
  dockerfile: 'docker',
  gql: 'graphql',
  html: 'markup',
  xml: 'markup',
  svg: 'markup',
};

/**
 * Ensures global Prism registration on window and exposes manual highlight execution
 */
export function initPrism(): typeof Prism {
  if (typeof window !== 'undefined') {
    (window as any).Prism = Prism;
  }
  return Prism;
}

/**
 * Normalize language identifier using alias mappings
 */
export function normalizeLanguage(rawLang: string): string {
  const lang = (rawLang || '').toLowerCase().trim();
  return LANGUAGE_ALIASES[lang] || lang;
}

/**
 * Highlights a specific code element using PrismJS
 */
export function highlightElement(element: HTMLElement): void {
  const rawClass = element.getAttribute('class') || '';
  const match = rawClass.match(/language-([a-zA-Z0-9_\-#+]+)/i);
  let lang = match ? match[1].toLowerCase() : '';

  // Skip diagrams / math from Prism syntax highlighter
  if (lang === 'mermaid' || lang === 'math' || lang === 'latex' || lang === 'katex') {
    return;
  }

  const normalized = normalizeLanguage(lang);
  if (normalized && normalized !== lang) {
    element.classList.remove(`language-${lang}`);
    element.classList.add(`language-${normalized}`);
    lang = normalized;
  }

  // Ensure parent <pre> also has language class for Prism CSS selector styling
  const pre = element.closest('pre');
  if (pre && lang && !pre.classList.contains(`language-${lang}`)) {
    pre.classList.add(`language-${lang}`);
  }

  try {
    if (lang && Prism.languages[lang]) {
      Prism.highlightElement(element);
    } else if (Prism.languages['clike']) {
      // Graceful fallback for unmapped code blocks
      Prism.highlightElement(element);
    }
  } catch (err) {
    console.warn(`Prism highlighting failed for ${lang}:`, err);
  }
}

/**
 * Highlight all code blocks within a container element
 */
export function highlightAllIn(container: HTMLElement): void {
  initPrism();
  const codeBlocks = container.querySelectorAll<HTMLElement>('pre code');
  codeBlocks.forEach((code) => {
    highlightElement(code);
  });
}
