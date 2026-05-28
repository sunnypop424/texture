import { useCallback, useState } from 'react';

const KEY = 'gyeol:onboarded';

function readOnboarded(): boolean {
  if (typeof window === 'undefined') return true; // SSR/safe default — 온보딩 안 보임
  try {
    return window.localStorage.getItem(KEY) === '1';
  } catch {
    return true; // private mode 등 — 온보딩 안 보임
  }
}

function writeOnboarded(): void {
  try {
    window.localStorage.setItem(KEY, '1');
  } catch {
    // ignore (quota, private mode 등)
  }
}

export interface UseOnboardingResult {
  /** 이미 첫 캡처를 마쳤는지 여부 */
  onboarded: boolean;
  /** 첫 캡처 성공 직후 호출 — Day 0 변형이 즉시 일반 UI로 전환됨 */
  markOnboarded: () => void;
}

export function useOnboarding(): UseOnboardingResult {
  const [onboarded, setOnboarded] = useState<boolean>(() => readOnboarded());

  const markOnboarded = useCallback(() => {
    writeOnboarded();
    setOnboarded(true);
  }, []);

  return { onboarded, markOnboarded };
}
