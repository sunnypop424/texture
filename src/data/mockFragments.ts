import { PERSONAL_SPACE_ID, SHARED_DEMO_SPACE_ID } from './initialSpaces';
import type { Fragment } from '../types/fragment';

// Seed fragments. spaceId/authorId 포함.
export const initialFragments: Fragment[] = [
  // ─── Personal space (내 결) ───
  { id: 'seed-1', type: 'photo', title: '점심 — 회사 앞 국숫집', capturedAt: '2026-05-28T13:02:00', dayDate: '2026-05-28', spaceId: PERSONAL_SPACE_ID, authorId: 'me' },
  { id: 'seed-2', type: 'text', title: '출근길 하늘이 맑았다', capturedAt: '2026-05-28T09:14:00', dayDate: '2026-05-28', spaceId: PERSONAL_SPACE_ID, authorId: 'me' },
  { id: 'seed-3', type: 'photo', title: '퇴근길 노을, 오래 봤다', capturedAt: '2026-05-22T19:40:00', dayDate: '2026-05-22', spaceId: PERSONAL_SPACE_ID, authorId: 'me' },
  { id: 'seed-4', type: 'video', title: '아침 러닝 3초', capturedAt: '2026-05-25T07:22:00', dayDate: '2026-05-25', spaceId: PERSONAL_SPACE_ID, authorId: 'me' },
  { id: 'seed-5', type: 'voice', title: '회의 끝나고 — 음성 메모', capturedAt: '2026-05-26T18:11:00', dayDate: '2026-05-26', spaceId: PERSONAL_SPACE_ID, authorId: 'me' },
  { id: 'seed-6', type: 'photo', title: '점심 산책', capturedAt: '2026-05-12T12:30:00', dayDate: '2026-05-12', spaceId: PERSONAL_SPACE_ID, authorId: 'me' },
  { id: 'seed-7', type: 'text', title: '책 한 페이지', capturedAt: '2026-05-14T22:10:00', dayDate: '2026-05-14', spaceId: PERSONAL_SPACE_ID, authorId: 'me' },
  { id: 'seed-8', type: 'photo', title: '비 오는 창', capturedAt: '2026-05-09T15:00:00', dayDate: '2026-05-09', spaceId: PERSONAL_SPACE_ID, authorId: 'me' },
  { id: 'seed-9', type: 'photo', title: '주말 마켓', capturedAt: '2026-05-03T11:00:00', dayDate: '2026-05-03', spaceId: PERSONAL_SPACE_ID, authorId: 'me' },
  { id: 'seed-10', type: 'text', title: '오늘은 일찍 잤다', capturedAt: '2026-05-18T23:00:00', dayDate: '2026-05-18', spaceId: PERSONAL_SPACE_ID, authorId: 'me' },
  { id: 'seed-y1', type: 'photo', title: '한강에서 자전거 탄 날', capturedAt: '2025-05-28T16:30:00', dayDate: '2025-05-28', spaceId: PERSONAL_SPACE_ID, authorId: 'me' },
  { id: 'seed-jan', type: 'text', title: '새해 첫 한 줄', capturedAt: '2026-01-01T00:01:00', dayDate: '2026-01-01', spaceId: PERSONAL_SPACE_ID, authorId: 'me' },
  { id: 'seed-feb', type: 'photo', title: '봄이 오기 전', capturedAt: '2026-02-14T17:00:00', dayDate: '2026-02-14', spaceId: PERSONAL_SPACE_ID, authorId: 'me' },
  { id: 'seed-mar', type: 'photo', title: '벚꽃', capturedAt: '2026-03-30T14:30:00', dayDate: '2026-03-30', spaceId: PERSONAL_SPACE_ID, authorId: 'me' },
  { id: 'seed-apr', type: 'video', title: '저녁 산책', capturedAt: '2026-04-10T19:00:00', dayDate: '2026-04-10', spaceId: PERSONAL_SPACE_ID, authorId: 'me' },

  // ─── Shared space (민지 & 나) ───
  { id: 'sh-1', type: 'photo', title: '같이 본 카페 창가', capturedAt: '2026-05-28T15:30:00', dayDate: '2026-05-28', spaceId: SHARED_DEMO_SPACE_ID, authorId: 'minji' },
  { id: 'sh-2', type: 'text', title: '오늘 그 영화, 재밌었지?', capturedAt: '2026-05-28T22:10:00', dayDate: '2026-05-28', spaceId: SHARED_DEMO_SPACE_ID, authorId: 'me' },
  { id: 'sh-3', type: 'photo', title: '도시락 — 너 좋아하는 거', capturedAt: '2026-05-25T12:30:00', dayDate: '2026-05-25', spaceId: SHARED_DEMO_SPACE_ID, authorId: 'minji' },
  { id: 'sh-4', type: 'text', title: '주말에 뭐 할까?', capturedAt: '2026-05-23T21:00:00', dayDate: '2026-05-23', spaceId: SHARED_DEMO_SPACE_ID, authorId: 'me' },
  { id: 'sh-5', type: 'photo', title: '걷다가 본 골목', capturedAt: '2026-05-22T17:00:00', dayDate: '2026-05-22', spaceId: SHARED_DEMO_SPACE_ID, authorId: 'minji' },
];
