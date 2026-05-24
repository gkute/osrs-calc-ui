import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  function setup() {
    TestBed.configureTestingModule({});
    return TestBed.inject(ThemeService);
  }

  beforeEach(() => localStorage.clear());
  afterEach(() => TestBed.resetTestingModule());

  it('defaults to system when localStorage is empty', () => {
    const service = setup();
    expect(service.theme()).toBe('system');
  });

  it('reads initial theme from localStorage', () => {
    localStorage.setItem('osrs-theme', 'dark');
    const service = setup();
    expect(service.theme()).toBe('dark');
  });

  it('setTheme updates the theme signal', () => {
    const service = setup();
    service.setTheme('light');
    expect(service.theme()).toBe('light');
  });

  it('themeClass returns "theme-light" for light', () => {
    const service = setup();
    service.setTheme('light');
    expect(service.themeClass).toBe('theme-light');
  });

  it('themeClass returns "theme-dark" for dark', () => {
    const service = setup();
    service.setTheme('dark');
    expect(service.themeClass).toBe('theme-dark');
  });

  it('themeClass returns "" for system', () => {
    const service = setup();
    service.setTheme('system');
    expect(service.themeClass).toBe('');
  });

  it('persists theme to localStorage via effect', () => {
    const service = setup();
    service.setTheme('dark');
    TestBed.flushEffects();
    expect(localStorage.getItem('osrs-theme')).toBe('dark');
  });
});
