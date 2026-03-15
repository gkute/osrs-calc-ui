import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'system' | 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>(
    (localStorage.getItem('osrs-theme') as Theme) ?? 'system'
  );

  constructor() {
    effect(() => {
      const t = this.theme();
      localStorage.setItem('osrs-theme', t);
    });
  }

  get themeClass(): string {
    return this.theme() === 'light' ? 'theme-light'
      : this.theme() === 'dark' ? 'theme-dark'
      : '';
  }

  setTheme(theme: Theme): void {
    this.theme.set(theme);
  }
}
