import {
  Injectable,
  signal,
  computed,
  effect,
  inject,
  PLATFORM_ID,
  DestroyRef,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { IndexedDbService } from './indexed-db.service';

export type Theme = 'dark' | 'light' | 'system';
export type ResolvedTheme = 'dark' | 'light';

const THEME_STORAGE_KEY = 'md-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly destroyRef = inject(DestroyRef);
  private readonly indexedDb = inject(IndexedDbService);

  /** User preference: 'dark', 'light', or 'system' */
  private readonly _theme = signal<Theme>(this.getInitialTheme());

  /** Detected system preference */
  private readonly _systemPrefersDark = signal<boolean>(this.detectSystemPrefersDark());

  /** Public readonly theme signal */
  readonly theme = this._theme.asReadonly();

  /** Actual applied theme: 'dark' or 'light' */
  readonly resolvedTheme = computed<ResolvedTheme>(() => {
    const pref = this._theme();
    if (pref === 'system') {
      return this._systemPrefersDark() ? 'dark' : 'light';
    }
    return pref;
  });

  /** Whether the active resolved theme is dark */
  readonly isDark = computed(() => this.resolvedTheme() === 'dark');

  constructor() {
    if (this.isBrowser) {
      // Async load from IndexedDB settings store
      this.indexedDb.getSetting<Theme>('theme').then((savedTheme) => {
        if (savedTheme && (savedTheme === 'dark' || savedTheme === 'light' || savedTheme === 'system')) {
          if (savedTheme !== this._theme()) {
            this._theme.set(savedTheme);
          }
        }
      }).catch(() => {});

      // Listen for system theme changes
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (e: MediaQueryListEvent) => {
        this._systemPrefersDark.set(e.matches);
      };

      mediaQuery.addEventListener('change', listener);
      this.destroyRef.onDestroy(() => {
        mediaQuery.removeEventListener('change', listener);
      });

      // Synchronize DOM attributes, localStorage and IndexedDB
      effect(() => {
        const theme = this._theme();
        const resolved = this.resolvedTheme();

        try {
          localStorage.setItem(THEME_STORAGE_KEY, theme);
        } catch {
          // ignore
        }
        this.indexedDb.setSetting('theme', theme).catch(() => {});

        const root = document.documentElement;
        root.setAttribute('data-theme', resolved);

        if (resolved === 'dark') {
          root.classList.add('dark');
          root.classList.remove('light');
        } else {
          root.classList.add('light');
          root.classList.remove('dark');
        }
      });
    }
  }

  /** Set a specific theme */
  setTheme(theme: Theme): void {
    this._theme.set(theme);
  }

  /** Toggle between dark and light themes */
  toggleTheme(): void {
    const nextTheme: Theme = this.resolvedTheme() === 'dark' ? 'light' : 'dark';
    this.setTheme(nextTheme);
  }

  private getInitialTheme(): Theme {
    if (!this.isBrowser) return 'dark';
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    if (saved === 'dark' || saved === 'light' || saved === 'system') {
      return saved;
    }
    return 'dark';
  }

  private detectSystemPrefersDark(): boolean {
    if (!this.isBrowser) return true;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
}
