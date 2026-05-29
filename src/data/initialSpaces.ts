import type { Space } from '../types/space';

export const PERSONAL_SPACE_ID = 'personal';
/** Calendar/Lookback의 기본 뷰 — 모든 공간을 가로질러 '내가 작성한' 결만 보여주는 가상 공간 */
export const ALL_SPACES_ID = 'all';

/**
 * 공유 공간 식별용 흙빛 hue 팔레트.
 * prompt category 10색과는 hue family를 의도적으로 분리해 시각 혼동 방지.
 */
export const SPACE_HUES = [
  '#C9A14A', // 황동
  '#5B9C97', // 청록
  '#9A6E94', // 자주
  '#D89472', // 살구
  '#6E89A0', // 회청
  '#7A8C5C', // 올리브
] as const;

/** 기존 색들을 보고 사용되지 않은 hue 우선, 다 쓰였으면 순환. */
export function pickNextHue(existingSpaces: Space[]): string {
  const used = new Set(
    existingSpaces.map((s) => s.color).filter((c): c is string => !!c),
  );
  const unused = SPACE_HUES.find((h) => !used.has(h));
  if (unused) return unused;
  const sharedCount = existingSpaces.filter((s) => !s.isPersonal).length;
  return SPACE_HUES[sharedCount % SPACE_HUES.length];
}

/** 모든 사용자가 시작하는 상태 — 개인 공간 하나, 결 없음, 결제 없음. */
export const initialSpaces: Space[] = [
  {
    id: PERSONAL_SPACE_ID,
    name: '내 결',
    isPersonal: true,
    createdBy: 'me',
    createdAt: '2026-05-20T00:00:00',
    members: [
      { userId: 'me', displayName: '나', role: 'owner', joinedAt: '2026-05-20T00:00:00' },
    ],
  },
];
