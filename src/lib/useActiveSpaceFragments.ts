import { useMemo } from 'react';
import { useFragmentStore } from './fragmentStore';
import { useSpaceStore } from './spaceStore';
import type { Fragment } from '../types/fragment';

/**
 * 현재 활성 공간(activeSpaceId)에 속한 결들만 반환.
 * 모든 페이지(오늘/캘린더/돌아보기/일일/단일 뷰)에서 이 훅을 통해 데이터를 받는다.
 */
export function useActiveSpaceFragments(): Fragment[] {
  const fragments = useFragmentStore((s) => s.fragments);
  const activeSpaceId = useSpaceStore((s) => s.activeSpaceId);
  return useMemo(
    () => fragments.filter((f) => f.spaceId === activeSpaceId),
    [fragments, activeSpaceId],
  );
}
