/**
 * 화면 테마(라이트/다크/시스템). 외형 설정일 뿐, §14.1의 유료 '장식 테마'와는 별개 — 늘 무료.
 * `<html data-theme="...">` 속성으로 적용하고, CSS 토큰이 그에 맞춰 바뀐다.
 * 'system'은 OS의 prefers-color-scheme를 따른다.
 */
export type Theme = 'light' | 'dark' | 'system';

const KEY = 'gyeol:theme';

export function readTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  try {
    const v = window.localStorage.getItem(KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    // ignore
  }
  return 'system';
}

export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme;
}

export function writeTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(KEY, theme);
  } catch {
    // ignore
  }
  applyTheme(theme);
}
