import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Navbar } from './shared/components/navbar/navbar';
import { ThemeService, Theme } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly themeService = inject(ThemeService);
  showSettings = signal(false);

  get themeClass(): string {
    return this.themeService.themeClass;
  }

  get selectedTheme(): Theme {
    return this.themeService.theme();
  }

  set selectedTheme(value: Theme) {
    this.themeService.setTheme(value);
  }

  toggleSettings(): void {
    this.showSettings.update(v => !v);
  }
}
