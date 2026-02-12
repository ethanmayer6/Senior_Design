const THEME_KEY = 'courseflow_dark_mode';

function applyDarkClass(enabled: boolean) {
  const html = document.documentElement;
  if (enabled) {
    html.classList.add('dark-mode');
  } else {
    html.classList.remove('dark-mode');
  }
}

export function getSavedDarkMode(): boolean {
  return localStorage.getItem(THEME_KEY) === 'true';
}

export function initializeTheme(): void {
  applyDarkClass(getSavedDarkMode());
}

export function setDarkMode(enabled: boolean): void {
  localStorage.setItem(THEME_KEY, String(enabled));
  applyDarkClass(enabled);
}
