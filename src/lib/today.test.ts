import { describe, it, expect } from 'vitest';
import {
  toDayKey,
  parseDayKey,
  getTodayDate,
  getTodayKey,
  nowIsoLocal,
  shiftDays,
} from './today';

describe('toDayKey', () => {
  it('로컬 날짜를 YYYY-MM-DD로 제로패딩해 만든다', () => {
    expect(toDayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toDayKey(new Date(2026, 11, 31))).toBe('2026-12-31');
  });
});

describe('parseDayKey', () => {
  it('로컬 자정 Date로 파싱한다 (UTC 어긋남 없음)', () => {
    const d = parseDayKey('2026-01-05');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(5);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
  });

  it('타임존과 무관하게 키의 날짜를 그대로 보존한다', () => {
    // new Date('2026-01-05')는 UTC 자정 → 음수 오프셋 지역에선 1/4로 밀린다.
    // parseDayKey는 항상 키에 적힌 날짜(5일)를 유지해야 한다.
    expect(parseDayKey('2026-01-05').getDate()).toBe(5);
    expect(parseDayKey('2026-03-01').getMonth()).toBe(2);
  });
});

describe('toDayKey ↔ parseDayKey 라운드트립', () => {
  it('키 → Date → 키가 동일하다', () => {
    for (const key of ['2026-01-01', '2026-02-28', '2025-12-31', '2026-07-15']) {
      expect(toDayKey(parseDayKey(key))).toBe(key);
    }
  });
});

describe('shiftDays', () => {
  it('월 경계를 정확히 넘는다', () => {
    expect(toDayKey(shiftDays(new Date(2026, 0, 31), 1))).toBe('2026-02-01');
  });

  it('연 경계를 음수로 넘는다', () => {
    expect(toDayKey(shiftDays(new Date(2026, 0, 1), -1))).toBe('2025-12-31');
  });

  it('0이면 같은 날', () => {
    expect(toDayKey(shiftDays(new Date(2026, 4, 28), 0))).toBe('2026-05-28');
  });
});

describe('nowIsoLocal', () => {
  it('타임존 suffix 없는 로컬 ISO-like 문자열을 만든다', () => {
    const iso = nowIsoLocal();
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
    expect(iso.endsWith('Z')).toBe(false);
  });

  it('날짜부가 오늘 키와 일치한다', () => {
    expect(nowIsoLocal().slice(0, 10)).toBe(getTodayKey());
  });
});

describe('getTodayDate / getTodayKey', () => {
  it('서로 일관된다', () => {
    expect(toDayKey(getTodayDate())).toBe(getTodayKey());
  });

  it('getTodayDate는 자정으로 정규화된다', () => {
    const d = getTodayDate();
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
  });
});
