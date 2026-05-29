import { describe, it, expect } from 'vitest';
import { pickPromptForDay, PROMPTS } from './prompts';

describe('pickPromptForDay', () => {
  it('같은 날짜 키는 항상 같은 prompt를 준다 (셔플 안 함)', () => {
    const a = pickPromptForDay('2026-05-29');
    const b = pickPromptForDay('2026-05-29');
    expect(a.id).toBe(b.id);
  });

  it('항상 PROMPTS 안의 유효한 항목을 준다', () => {
    for (const key of ['2026-01-01', '2026-05-29', '2025-12-31', '2026-07-15']) {
      expect(PROMPTS).toContainEqual(pickPromptForDay(key));
    }
  });

  it('서로 다른 날짜는 (대체로) 다른 prompt를 준다', () => {
    const keys = Array.from({ length: 14 }, (_, i) => `2026-06-${String(i + 1).padStart(2, '0')}`);
    const ids = new Set(keys.map((k) => pickPromptForDay(k).id));
    // 14일 중 최소 절반 이상은 서로 다른 prompt면 충분히 분산된 것.
    expect(ids.size).toBeGreaterThanOrEqual(7);
  });
});
