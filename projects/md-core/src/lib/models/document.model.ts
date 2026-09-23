export interface MarkdownDocument {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  path?: string;
  parentId?: string | null;
  icon?: string;
  isFavorite?: boolean;
  tags?: string[];
}

export function createDocument(
  title: string = 'Untitled',
  content: string = '',
  parentId?: string | null,
  icon: string = '📄',
): MarkdownDocument {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title,
    content,
    createdAt: now,
    updatedAt: now,
    parentId: parentId ?? null,
    icon,
    isFavorite: false,
    tags: [],
  };
}

