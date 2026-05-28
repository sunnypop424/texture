import { useState, type CSSProperties } from 'react';
import {
  Music,
  Cloud,
  Users,
  Coffee,
  Heart,
  Hand,
  MapPin,
  Volume2,
  Clock,
  Sun,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { PromptCategory } from '../data/prompts';

const CATEGORY_ICON: Record<PromptCategory, LucideIcon> = {
  music: Music,
  sky: Cloud,
  people: Users,
  food: Coffee,
  feeling: Heart,
  object: Hand,
  place: MapPin,
  sound: Volume2,
  time: Clock,
  light: Sun,
};

// 카테고리별 부드러운 흙빛 톤 팔레트.
// bg는 ~5-7% 채도의 연한 틴트, fg는 같은 색조의 더 깊은 톤.
// 채도·명도 범위를 일치시켜 한 화면에서 어떤 prompt가 떠도 톤이 깨지지 않게 함.
const CATEGORY_COLOR: Record<PromptCategory, { bg: string; fg: string }> = {
  music:   { bg: '#E6F5F0', fg: '#1D9E75' }, // 민트
  sky:     { bg: '#E6F0F5', fg: '#3A7AA0' }, // 옅은 하늘
  people:  { bg: '#F5E8E2', fg: '#B85C3A' }, // 따뜻한 코랄
  food:    { bg: '#F5F0E2', fg: '#A07C2E' }, // 옅은 버터
  feeling: { bg: '#F5E6EC', fg: '#A04A6E' }, // 옅은 로즈
  object:  { bg: '#ECF0E6', fg: '#5C7A4A' }, // 옅은 세이지
  place:   { bg: '#ECE6F5', fg: '#6E4AA0' }, // 옅은 라벤더
  sound:   { bg: '#E2F0EC', fg: '#2E7C72' }, // 옅은 청록
  time:    { bg: '#EFEAE2', fg: '#7A6048' }, // 옅은 토프
  light:   { bg: '#F5EFE2', fg: '#9C7B3A' }, // 옅은 모래
};

interface PromptChipProps {
  category: PromptCategory;
  message: string;
  onDismiss: () => void;
}

export function PromptChip({ category, message, onDismiss }: PromptChipProps) {
  const [leaving, setLeaving] = useState(false);
  const Icon = CATEGORY_ICON[category];
  const { bg, fg } = CATEGORY_COLOR[category];

  const style = {
    '--prompt-bg': bg,
    '--prompt-fg': fg,
  } as CSSProperties;

  const close = () => {
    setLeaving(true);
    window.setTimeout(onDismiss, 120);
  };

  return (
    <div
      className={`prompt ${leaving ? 'prompt--leaving' : ''}`}
      style={style}
      data-category={category}
    >
      <Icon className="prompt__icon" size={16} strokeWidth={1.75} aria-hidden />
      <span className="prompt__text">{message}</span>
      <button className="prompt__close" aria-label="이 안내 닫기" onClick={close}>
        <X size={15} strokeWidth={1.75} />
      </button>
    </div>
  );
}
