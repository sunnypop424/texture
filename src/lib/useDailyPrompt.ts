import { useCallback, useMemo, useState } from 'react';
import { pickRandomPrompt, type DailyPrompt } from '../data/prompts';

const KEY_PREFIX = 'jogak:prompt-dismissed:';

function readDismissed(dayKey: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(KEY_PREFIX + dayKey) === '1';
  } catch {
    return false;
  }
}

function writeDismissed(dayKey: string): void {
  try {
    window.localStorage.setItem(KEY_PREFIX + dayKey, '1');
  } catch {
    // ignore (private mode, quota exceeded, etc.)
  }
}

export interface UseDailyPromptResult {
  prompt: DailyPrompt | null;
  dismiss: () => void;
}

export function useDailyPrompt(dayKey: string): UseDailyPromptResult {
  const [dismissed, setDismissed] = useState<boolean>(() => readDismissed(dayKey));

  // 새로고침/재진입할 때마다 새 무작위 prompt. dismiss된 날엔 null.
  const prompt = useMemo<DailyPrompt | null>(
    () => (dismissed ? null : pickRandomPrompt()),
    [dayKey, dismissed],
  );

  const dismiss = useCallback(() => {
    writeDismissed(dayKey);
    setDismissed(true);
  }, [dayKey]);

  return { prompt, dismiss };
}
