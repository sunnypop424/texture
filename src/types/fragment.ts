export type MediaType = 'photo' | 'video' | 'text' | 'voice';

export interface Fragment {
  id: string;
  type: MediaType;
  title: string;
  capturedAt: string; // ISO datetime
  dayDate: string;    // YYYY-MM-DD (user local)
  thumbUrl?: string;  // 표시용 URL — 로컬 미디어는 hydrate 시 신선한 object URL로 채워짐
  hasLocalMedia?: boolean; // blob이 mediaStore IDB에 fragment.id 키로 저장돼 있는지
  spaceId: string;
  authorId: string;
}
