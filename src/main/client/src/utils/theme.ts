import type { FontScale, ThemePreset, UserPreferences } from '../api/usersApi';

const THEME_KEY = 'courseflow_theme_preferences';

const DEFAULT_PREFERENCES: UserPreferences = {
  darkMode: false,
  themePreset: 'default',
  fontScale: 'medium',
  reducedMotion: false,
};

function applyPreferencesClasses(prefs: UserPreferences) {
  const html = document.documentElement;
  if (prefs.darkMode) {
    html.classList.add('dark-mode');
  } else {
    html.classList.remove('dark-mode');
  }

  html.classList.remove('theme-default', 'theme-ocean', 'theme-forest');
  html.classList.add(`theme-${prefs.themePreset}`);

  html.classList.remove('font-small', 'font-medium', 'font-large');
  html.classList.add(`font-${prefs.fontScale}`);

  if (prefs.reducedMotion) {
    html.classList.add('reduced-motion');
  } else {
    html.classList.remove('reduced-motion');
  }
}

export function getSavedThemePreferences(): UserPreferences {
  const raw = localStorage.getItem(THEME_KEY);
  if (!raw) return DEFAULT_PREFERENCES;

  try {
    const parsed = JSON.parse(raw) as Partial<UserPreferences>;
    const themePreset: ThemePreset =
      parsed.themePreset === 'ocean' || parsed.themePreset === 'forest' ? parsed.themePreset : 'default';
    const fontScale: FontScale =
      parsed.fontScale === 'small' || parsed.fontScale === 'large' ? parsed.fontScale : 'medium';
    return {
      darkMode: Boolean(parsed.darkMode),
      themePreset,
      fontScale,
      reducedMotion: Boolean(parsed.reducedMotion),
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function initializeTheme(): void {
  applyPreferencesClasses(getSavedThemePreferences());
}

export function setThemePreferences(prefs: UserPreferences): void {
  localStorage.setItem(THEME_KEY, JSON.stringify(prefs));
  applyPreferencesClasses(prefs);
}
