import type { MarkdownModuleConfig } from 'ngx-markdown';
import { MARKED_OPTIONS } from 'ngx-markdown';

export const MARKDOWN_CONFIG: MarkdownModuleConfig = {
  markedOptions: {
    provide: MARKED_OPTIONS,
    useValue: {
      gfm: true,
      breaks: true,
    },
  },
};
