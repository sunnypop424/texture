export type MediaType = 'photo' | 'video' | 'text' | 'voice';

export interface Fragment {
  id: string;
  type: MediaType;
  title: string;
  capturedAt: string; // ISO datetime
  dayDate: string;    // YYYY-MM-DD (user local)
  thumbUrl?: string;  // 표시용 URL — 로컬 미디어는 hydrate 시 신선한 object URL로 채워짐
  hasLocalMedia?: boolean; // blob이 mediaStore IDB에 fragment.id 키로 저장돼 있는지
  /** 지난 날에 뒤늦게 채운 결 — 정확한 시각이 없어 '시간 미상'으로 표시한다. */
  backfilled?: boolean;
  spaceId: string;
  authorId: string;
}
