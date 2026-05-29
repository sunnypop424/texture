import { useCallback, useMemo, useState } from 'react';
import { pickPromptForDay, pickRandomPrompt, type DailyPrompt } from '../data/prompts';

const KEY_PREFIX = 'gyeol:prompt-dismissed:';

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

export function useDailyPrompt(
  dayKey: string,
  options?: { random?: boolean },
): UseDailyPromptResult {
  const random = options?.random ?? false;
  const [dismissed, setDismissed] = useState<boolean>(() => readDismissed(dayKey));

  // 기본은 하루 고정. random이면 진입(마운트)마다 무작위. dismiss된 날엔 null.
  const prompt = useMemo<DailyPrompt | null>(
    () => (dismissed ? null : random ? pickRandomPrompt() : pickPromptForDay(dayKey)),
    [dayKey, dismissed, random],
  );

  const dismiss = useCallback(() => {
    writeDismissed(dayKey);
    setDismissed(true);
  }, [dayKey]);

  return { prompt, dismiss };
}
