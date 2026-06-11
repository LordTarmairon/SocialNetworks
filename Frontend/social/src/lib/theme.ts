export type Theme = 'light' | 'dark';

const KEY = 'sn_theme';

export function getTheme(): Theme {
  return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light';
}

/** Aplica el tema al <html> (atributo data-theme) y lo persiste. */
export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(KEY, theme);
}

/** Alterna entre claro y oscuro y devuelve el nuevo tema. */
export function toggleTheme(): Theme {
  const next: Theme = getTheme() === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  return next;
}
