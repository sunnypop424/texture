import { describe, it, expect } from 'vitest';
import { pickNextHue, SPACE_HUES } from './initialSpaces';
import type { Space } from '../types/space';

function space(partial: Partial<Space>): Space {
  return {
    id: partial.id ?? 's',
    name: partial.name ?? '공간',
    isPersonal: partial.isPersonal ?? false,
    createdBy: 'me',
    createdAt: '2026-05-01T00:00:00',
    members: [],
    color: partial.color,
  };
}

describe('pickNextHue', () => {
  it('공간이 없으면 첫 hue를 준다', () => {
    expect(pickNextHue([])).toBe(SPACE_HUES[0]);
  });

  it('색 없는 개인 공간만 있으면 첫 hue를 준다', () => {
    expect(pickNextHue([space({ isPersonal: true, color: undefined })])).toBe(SPACE_HUES[0]);
  });

  it('이미 쓰인 색은 건너뛰고 다음 미사용 hue를 준다', () => {
    const used = [space({ color: SPACE_HUES[0] }), space({ color: SPACE_HUES[1] })];
    expect(pickNextHue(used)).toBe(SPACE_HUES[2]);
  });

  it('모든 hue가 쓰이면 공유 공간 수 기준으로 순환한다', () => {
    const all = SPACE_HUES.map((c) => space({ color: c }));
    // sharedCount === SPACE_HUES.length → index = length % length = 0
    expect(pickNextHue(all)).toBe(SPACE_HUES[SPACE_HUES.length % SPACE_HUES.length]);
  });
});
