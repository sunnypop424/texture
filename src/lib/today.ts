// 결의 모든 "오늘"·`day_date`는 기기 로컬 시각이 진실의 원천이다.
// UTC 파싱(`new Date('YYYY-MM-DD')`)을 통한 자정 경계 어긋남을 막기 위해 항상 이 유틸을 거친다.

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

/** Date → 'YYYY-MM-DD' (디바이스 로컬 필드 기준). */
export function toDayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 'YYYY-MM-DD' → 로컬 자정 Date. `new Date(key)`의 UTC 파싱 회피. */
export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** 디바이스 로컬 '오늘'의 자정 Date. */
export function getTodayDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** 디바이스 로컬 '오늘' 키 ('YYYY-MM-DD'). */
export function getTodayKey(): string {
  return toDayKey(getTodayDate());
}

/** 디바이스 로컬 현재 시각의 ISO-like 문자열 (타임존 suffix 없음 — `capturedAt`에 사용). */
export function nowIsoLocal(): string {
  const d = new Date();
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

/** `base` 기준 n일 이동 (양수=미래, 음수=과거). 로컬 자정 정렬. */
export function shiftDays(base: Date, n: number): Date {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + n);
}
