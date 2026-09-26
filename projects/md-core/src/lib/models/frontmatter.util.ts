/**
 * Utility for parsing and modifying YAML frontmatter in Markdown documents.
 */

export interface ParsedFrontmatter {
  data: Record<string, any>;
  body: string;
  hasFrontmatter: boolean;
}

/**
 * Extracts and parses YAML frontmatter from document content.
 */
export function parseFrontmatter(content: string): ParsedFrontmatter {
  if (!content) {
    return { data: {}, body: '', hasFrontmatter: false };
  }

  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    return { data: {}, body: content, hasFrontmatter: false };
  }

  const rawYaml = match[1];
  const body = content.slice(match[0].length);
  const data: Record<string, any> = {};

  const lines = rawYaml.split('\n');
  let currentKey = '';
  let inArray = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // List item in array
    if (inArray && trimmed.startsWith('- ')) {
      const val = cleanValue(trimmed.slice(2));
      if (Array.isArray(data[currentKey])) {
        data[currentKey].push(val);
      }
      continue;
    }

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx > 0) {
      const key = trimmed.slice(0, colonIdx).trim();
      const rawVal = trimmed.slice(colonIdx + 1).trim();

      currentKey = key;

      if (!rawVal) {
        // Multi-line list starter
        inArray = true;
        data[key] = [];
      } else if (rawVal.startsWith('[') && rawVal.endsWith(']')) {
        // Inline array: [tag1, tag2]
        inArray = false;
        const items = rawVal
          .slice(1, -1)
          .split(',')
          .map((s) => cleanValue(s.trim()))
          .filter(Boolean);
        data[key] = items;
      } else {
        inArray = false;
        data[key] = cleanValue(rawVal);
      }
    }
  }

  return { data, body, hasFrontmatter: true };
}

function cleanValue(raw: string): any {
  const unquoted = raw.replace(/^["'](.*)["']$/, '$1').trim();
  if (unquoted === 'true') return true;
  if (unquoted === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(unquoted)) return Number(unquoted);
  return unquoted;
}

/**
 * Updates or sets a frontmatter property in Markdown text.
 */
export function setFrontmatterProperty(content: string, key: string, value: any): string {
  const { data, body, hasFrontmatter } = parseFrontmatter(content);
  data[key] = value;

  // Re-serialize frontmatter
  let yaml = '---\n';
  for (const [k, v] of Object.entries(data)) {
    if (Array.isArray(v)) {
      yaml += `${k}: [${v.map((item) => (typeof item === 'string' ? `"${item}"` : item)).join(', ')}]\n`;
    } else if (typeof v === 'string') {
      yaml += `${k}: "${v.replace(/"/g, '\\"')}"\n`;
    } else {
      yaml += `${k}: ${v}\n`;
    }
  }
  yaml += '---\n';

  return `${yaml}${body}`;
}

/**
 * Extracts all tags from both YAML frontmatter and inline `#tag` mentions.
 * Ignores markdown headings (`# Heading`).
 */
export function extractDocumentTags(content: string, explicitTags?: string[]): string[] {
  const tagSet = new Set<string>();

  if (explicitTags) {
    for (const t of explicitTags) {
      if (t?.trim()) tagSet.add(t.trim().replace(/^#/, '').toLowerCase());
    }
  }

  const { data, body } = parseFrontmatter(content);
  if (data['tags']) {
    if (Array.isArray(data['tags'])) {
      for (const t of data['tags']) {
        if (typeof t === 'string' && t.trim()) {
          tagSet.add(t.trim().replace(/^#/, '').toLowerCase());
        }
      }
    } else if (typeof data['tags'] === 'string') {
      data['tags']
        .split(',')
        .map((s) => s.trim().replace(/^#/, '').toLowerCase())
        .filter(Boolean)
        .forEach((t) => tagSet.add(t));
    }
  }

  // Scan inline body tags: #tagname (must be preceded by whitespace or start of line,
  // and followed by whitespace or punctuation, not followed by space which is a heading)
  const inlineRegex = /(?:^|\s)#([a-zA-Z0-9_\-]+)(?=\s|[.,;:!?]|$)/g;
  let match: RegExpExecArray | null;
  while ((match = inlineRegex.exec(body)) !== null) {
    const rawTag = match[1].trim().toLowerCase();
    // Exclude single numbers or hex colors
    if (rawTag && !/^\d+$/.test(rawTag) && rawTag.length > 1) {
      tagSet.add(rawTag);
    }
  }

  return Array.from(tagSet).sort();
}
