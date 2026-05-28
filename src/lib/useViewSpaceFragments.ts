import { useMemo } from 'react';
import { useFragmentStore } from './fragmentStore';
import { useSpaceStore } from './spaceStore';
import { useIdentityStore } from './identity';
import { ALL_SPACES_ID } from '../data/initialSpaces';
import type { Fragment } from '../types/fragment';

/**
 * Calendar / Lookback / Daily 의 회고 컨텍스트 데이터.
 * viewSpaceId == 'all' → 모든 공간에서 내가 작성한 결
 * viewSpaceId == <specific> → 그 공간의 모든 멤버 결
 */
export function useViewSpaceFragments(): Fragment[] {
  const fragments = useFragmentStore((s) => s.fragments);
  const viewSpaceId = useSpaceStore((s) => s.viewSpaceId);
  const meId = useIdentityStore((s) => s.user.id);

  return useMemo(() => {
    if (viewSpaceId === ALL_SPACES_ID) {
      return fragments.filter((f) => f.authorId === meId);
    }
    return fragments.filter((f) => f.spaceId === viewSpaceId);
  }, [fragments, viewSpaceId, meId]);
}
