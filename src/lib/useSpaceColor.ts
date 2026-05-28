import { useSpaceStore } from './spaceStore';
import type { Space } from '../types/space';

export interface SpaceTag {
  color: string;
  name: string;
}

/**
 * fragment가 속한 공유 공간의 색·이름을 반환.
 * 개인 공간 또는 알 수 없는 공간이면 null — 호출자는 dot/라벨을 그리지 않는다.
 */
export function useSpaceTag(spaceId: string | undefined): SpaceTag | null {
  const space = useSpaceStore((s) =>
    spaceId ? s.spaces.find((sp) => sp.id === spaceId) : undefined,
  );
  return spaceTagFor(space);
}

export function spaceTagFor(space: Space | undefined | null): SpaceTag | null {
  if (!space) return null;
  if (space.isPersonal) return null;
  if (!space.color) return null;
  return { color: space.color, name: space.name };
}
