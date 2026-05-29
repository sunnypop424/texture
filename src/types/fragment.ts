export type MediaType = 'photo' | 'video' | 'text' | 'voice';

export interface Fragment {
  id: string;
  type: MediaType;
  title: string;
  capturedAt: string; // ISO datetime
  dayDate: string;    // YYYY-MM-DD (user local)
  thumbUrl?: string;  // 표시용 URL — 로컬 미디어는 hydrate 시 신선한 object URL로 채워짐
  hasLocalMedia?: boolean; // blob이 mediaStore IDB에 fragment.id 키로 저장돼 있는지
  /** Storage에 업로드된 미디어의 경로(서버 보관본). 업로드 성공 시 채워진다. */
  mediaPath?: string;
  /** 미디어 원본 바이트 크기(용량 집계용). 미디어 없으면 미설정. */
  bytes?: number;
  /** 지난 날에 뒤늦게 채운 결 — 정확한 시각이 없어 '시간 미상'으로 표시한다. */
  backfilled?: boolean;
  spaceId: string;
  authorId: string;
}
