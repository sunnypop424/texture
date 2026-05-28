export type PromptCategory =
  | 'music'
  | 'sky'
  | 'people'
  | 'food'
  | 'feeling'
  | 'object'
  | 'place'
  | 'sound'
  | 'time'
  | 'light';

export interface DailyPrompt {
  id: string;
  category: PromptCategory;
  message: string;
}

// 모두 명확한 의문형으로. "~인가요?", "~어땠나요?", "~무엇인가요?", "~있나요?"
export const PROMPTS: DailyPrompt[] = [
  // 음악
  { id: 'music-1', category: 'music', message: '지금 듣고 있는 노래는 무엇인가요?' },
  { id: 'music-2', category: 'music', message: '오늘 자꾸 떠오른 멜로디가 있나요?' },
  { id: 'music-3', category: 'music', message: '오늘 처음 들었던 곡은 무엇이었나요?' },

  // 하늘 · 풍경
  { id: 'sky-1', category: 'sky', message: '오늘 본 하늘은 어땠나요?' },
  { id: 'sky-2', category: 'sky', message: '오늘 잠깐 멈춰 바라본 풍경이 있었나요?' },
  { id: 'sky-3', category: 'sky', message: '지금 창밖은 어떤 색인가요?' },

  // 사람
  { id: 'people-1', category: 'people', message: '오늘 가장 떠오른 사람은 누구인가요?' },
  { id: 'people-2', category: 'people', message: '오늘 들은 따뜻한 한 마디가 있었나요?' },
  { id: 'people-3', category: 'people', message: '오늘 잠깐이라도 함께 있었던 사람은 누구인가요?' },

  // 음식
  { id: 'food-1', category: 'food', message: '오늘 가장 좋았던 한 입은 무엇이었나요?' },
  { id: 'food-2', category: 'food', message: '오늘 마신 커피나 차는 어땠나요?' },
  { id: 'food-3', category: 'food', message: '오늘 하루를 마무리한 음식은 무엇인가요?' },

  // 감정
  { id: 'feeling-1', category: 'feeling', message: '지금 마음에 가장 가까운 단어는 무엇인가요?' },
  { id: 'feeling-2', category: 'feeling', message: '오늘 가장 오래 머문 감정은 무엇이었나요?' },
  { id: 'feeling-3', category: 'feeling', message: '지금 이 순간을 한 줄로 표현하면 어떤가요?' },

  // 사물
  { id: 'object-1', category: 'object', message: '오늘 가장 오래 손에 쥐었던 건 무엇인가요?' },
  { id: 'object-2', category: 'object', message: '오늘 새로 들인 작은 무언가가 있나요?' },

  // 장소
  { id: 'place-1', category: 'place', message: '오늘 잠깐 머물렀던 작은 장소는 어디인가요?' },
  { id: 'place-2', category: 'place', message: '오늘 길을 걷다 본 장면이 있었나요?' },

  // 소리
  { id: 'sound-1', category: 'sound', message: '지금 들리는 소리는 무엇인가요?' },
  { id: 'sound-2', category: 'sound', message: '오늘 가장 좋게 들린 소리는 무엇이었나요?' },

  // 시간
  { id: 'time-1', category: 'time', message: '오늘 가장 천천히 흐른 순간은 언제였나요?' },
  { id: 'time-2', category: 'time', message: '지금 이 시간을 한 단어로 표현하면 무엇인가요?' },

  // 빛
  { id: 'light-1', category: 'light', message: '오늘 빛이 가장 예뻤던 순간은 언제였나요?' },
  { id: 'light-2', category: 'light', message: '오늘 햇살은 어디로 들어왔나요?' },
];

/**
 * PROMPTS에서 매번 무작위로 하나를 뽑는다.
 * 캐시 없음 — 같은 페이지 안에서 useMemo로 마운트 동안만 안정적,
 * 새로고침/재진입할 때마다 새로운 prompt가 노출된다.
 */
export function pickRandomPrompt(): DailyPrompt {
  return PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
}
