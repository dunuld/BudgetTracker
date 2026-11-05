import { Injectable, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'auto';

const STORAGE_KEY = 'budget-tracker-theme';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly _mode = signal<ThemeMode>(this.load());

  readonly mode = this._mode.asReadonly();

  constructor() {
    this.apply(this._mode());
    // React to system preference changes when in auto mode
    if (typeof window.matchMedia === 'function') {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (this._mode() === 'auto') {
          this.apply('auto');
        }
      });
    }
  }

  setMode(mode: ThemeMode) {
    this._mode.set(mode);
    localStorage.setItem(STORAGE_KEY, mode);
    this.apply(mode);
  }

  // Cycle: light → dark → auto → light
  toggle() {
    const current = this._mode();
    const next: ThemeMode = current === 'light' ? 'dark' : current === 'dark' ? 'auto' : 'light';
    this.setMode(next);
  }

  private load(): ThemeMode {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'auto') {
      return stored;
    }
    return 'auto';
  }

  private apply(mode: ThemeMode) {
    const html = document.documentElement;
    if (mode === 'auto' && typeof window.matchMedia === 'function') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      html.setAttribute('data-theme', isDark ? 'dark' : 'light');
    } else if (mode === 'auto') {
      /* no matchMedia — default to light */
      html.setAttribute('data-theme', 'light');
    } else {
      html.setAttribute('data-theme', mode);
    }
  }
}
