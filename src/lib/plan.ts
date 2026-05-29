import type { Space } from '../types/space';
import { useSpaceStore } from './spaceStore';

/**
 * 무료/Plus 정책을 한 곳에 모은다(향후 결제 게이팅의 단일 스위치).
 *
 * 원칙(§14):
 * - 캡처·열람·회고·기본 동기화(백업)·복원·공유는 무료. (§14.2 추억 인질 금지 — 복원은 항상 무료)
 * - Plus(공간별)가 파는 것은 "백업 여부"가 아니라 원본 화질·영속성·공유 규모·깊이.
 *
 * 결제 인프라는 아직 비범위(§15.2)라 현재는 모두 무료 동작. Plus 델타는 결제가 붙을 때
 * 이 모듈의 분기만 활성화하면 된다.
 */

// 공유방 인원은 사실상 고정하지 않는다 — 가까운 소수 모델이라 실제론 적게 모이고,
// 미디어는 멤버별 첫 1회만 받고 캐시되므로 비용도 안 터진다. 50은 안전 천장.
export const MAX_MEMBERS = 50;

const GB = 1024 ** 3;
// 클라우드 보관 용량 한도(가설 — 초기 데이터로 조정). 초과 시 "더 올리기"만 막고
// 과거 열람·복원은 항상 무료(§14.3 추억 인질 금지).
export const FREE_PERSONAL_QUOTA_BYTES = 2 * GB; // 개인 공간 무료 백업 용량
export const FREE_SHARED_QUOTA_BYTES = 1 * GB; // 공유 공간 1개당 무료 용량
export const PLUS_QUOTA_BYTES = 50 * GB; // Plus(개인/그룹) 용량

/** 이 공간의 클라우드 보관 용량 한도(바이트). */
export function quotaBytes(space: Space | null | undefined): number {
  if (isPlus(space)) return PLUS_QUOTA_BYTES;
  return space?.isPersonal ? FREE_PERSONAL_QUOTA_BYTES : FREE_SHARED_QUOTA_BYTES;
}

/** 바이트를 사람이 읽는 단위로(용량 표시용). */
export function formatBytes(n: number): string {
  if (!n || n <= 0) return '0MB';
  const mb = n / 1024 ** 2;
  if (mb < 1024) return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)}MB`;
  const gb = mb / 1024;
  return `${gb < 10 ? gb.toFixed(1) : Math.round(gb)}GB`;
}

export type MediaQuality = 'standard' | 'original';

/** 이 공간이 Plus인지. (Space.plan 유무로 판단) */
export function isPlus(space: Space | null | undefined): boolean {
  return !!space?.plan;
}

/** 공유방 최대 인원 — 무료/Plus 동일 50(사실상 비제한). */
export function maxMembers(_space?: Space | null): number {
  return MAX_MEMBERS;
}

/** 미디어 보관 화질 — 무료 표준(다운스케일) / Plus 원본. */
export function mediaQuality(space: Space | null | undefined): MediaQuality {
  return isPlus(space) ? 'original' : 'standard';
}

/** 지금 캡처 대상(활성) 공간이 원본 화질을 보관하는지(Plus). 다운스케일 생략 판단용. */
export function activeSpaceKeepsOriginal(): boolean {
  const s = useSpaceStore.getState();
  const active = s.spaces.find((sp) => sp.id === s.activeSpaceId);
  return mediaQuality(active) === 'original';
}

/** 클라우드 동기화(기본 백업)는 항상 무료 — 공유·멀티기기의 토대. */
export function cloudSyncEnabled(): boolean {
  return true;
}

/** 복원은 항상 무료 — 본인 과거를 인질로 잡지 않는다(§14.2). */
export function restoreEnabled(): boolean {
  return true;
}
