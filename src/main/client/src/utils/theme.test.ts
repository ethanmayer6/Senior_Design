import { describe, expect, it } from 'vitest';
import { getSavedThemePreferences, initializeTheme, setThemePreferences } from './theme';

describe('theme utilities', () => {
  it('returns default preferences when nothing is stored', () => {
    expect(getSavedThemePreferences()).toEqual({
      darkMode: false,
      themePreset: 'default',
      fontScale: 'medium',
      reducedMotion: false,
    });
  });

  it('falls back to defaults for invalid stored data', () => {
    window.localStorage.setItem('courseflow_theme_preferences', 'not-json');

    expect(getSavedThemePreferences()).toEqual({
      darkMode: false,
      themePreset: 'default',
      fontScale: 'medium',
      reducedMotion: false,
    });
  });

  it('persists preferences and applies the matching document classes', () => {
    setThemePreferences({
      darkMode: true,
      themePreset: 'ocean',
      fontScale: 'large',
      reducedMotion: true,
    });

    expect(window.localStorage.getItem('courseflow_theme_preferences')).toContain('"themePreset":"ocean"');
    expect(document.documentElement.classList.contains('dark-mode')).toBe(true);
    expect(document.documentElement.classList.contains('theme-ocean')).toBe(true);
    expect(document.documentElement.classList.contains('font-large')).toBe(true);
    expect(document.documentElement.classList.contains('reduced-motion')).toBe(true);
  });

  it('initializes classes from saved preferences', () => {
    window.localStorage.setItem(
      'courseflow_theme_preferences',
      JSON.stringify({
        darkMode: false,
        themePreset: 'forest',
        fontScale: 'small',
        reducedMotion: false,
      }),
    );

    initializeTheme();

    expect(document.documentElement.classList.contains('theme-forest')).toBe(true);
    expect(document.documentElement.classList.contains('font-small')).toBe(true);
    expect(document.documentElement.classList.contains('dark-mode')).toBe(false);
  });
});
