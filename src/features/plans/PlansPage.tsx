import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  BookOpen,
  CalendarDays,
  Heart,
  Bell,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '../../components/Button';

interface ComparisonRow {
  label: string;
  free: string;
  plus: string;
}

const COMPARISON: ComparisonRow[] = [
  { label: '매일 기록·전 매체', free: '무제한', plus: '무제한' },
  { label: '캘린더·주간 회고', free: '기본', plus: '심화 (연간 회고, 검색·태그)' },
  { label: '미디어 보관', free: '표준 화질', plus: '원본 화질 영구' },
  { label: '공유방', free: '1팀 (최대 3인)', plus: '무제한 (최대 6인)' },
  { label: '자동 영상 내보내기', free: '—', plus: 'HD' },
  { label: '1년 전 오늘·테마', free: '—', plus: '포함' },
];

interface PrintItem {
  icon: LucideIcon;
  label: string;
  hint: string;
}

const PRINT_ITEMS: PrintItem[] = [
  { icon: BookOpen, label: '포토북', hint: '1년 치 결을 모은 한 권' },
  { icon: BookOpen, label: '연말 “올해의 책”', hint: '한 해를 닫는 책 한 권' },
  { icon: CalendarDays, label: '벽 캘린더', hint: '12장의 결, 매달 한 장' },
  { icon: Heart, label: '커플 다이어리', hint: '공유 공간을 종이로' },
];

export function PlansPage() {
  const navigate = useNavigate();

  return (
    <div className="stack-5">
      <header className="detail-header">
        <button className="detail-header__back" aria-label="뒤로" onClick={() => navigate(-1)}>
          <ChevronLeft size={20} strokeWidth={1.5} />
        </button>
        <span className="detail-header__title">결 플랜</span>
        <span aria-hidden style={{ width: 32 }} />
      </header>

      <FreeForeverHero />

      <PlusPersonalCard />

      <GroupPairCard />

      <PrintTeaserCard />

      <Guardrails />
    </div>
  );
}

function FreeForeverHero() {
  return (
    <section className="plans-hero" aria-label="항상 무료인 기록 습관">
      <div className="plans-hero__label">항상 무료 — 기록 습관</div>
      <p className="plans-hero__line">
        매일 기록 · 캘린더 · 기본 회고 · 공유 1팀.<br />
        결을 남기고 돌아보는 일은 영원히 무료예요.
      </p>
    </section>
  );
}

function PlusPersonalCard() {
  return (
    <section className="plan-card" aria-label="Plus 개인 구독">
      <header className="plan-card__head">
        <div className="plan-card__title">Plus · 개인</div>
        <div className="plan-card__price">
          <span className="plan-card__price-main">₩4,900</span>
          <span className="plan-card__price-unit"> /월</span>
          <span className="plan-card__price-sep" aria-hidden> · </span>
          <span className="plan-card__price-main">₩39,000</span>
          <span className="plan-card__price-unit"> /년</span>
        </div>
        <p className="plan-card__sub">기록의 깊이와 영속성을 여는 구독.</p>
      </header>

      <div className="plan-table" role="table" aria-label="무료와 Plus 비교">
        <div className="plan-table__head" role="row">
          <span className="plan-table__cell plan-table__cell--label" role="columnheader">
            기능
          </span>
          <span className="plan-table__cell plan-table__cell--free" role="columnheader">
            무료 · 기록
          </span>
          <span className="plan-table__cell plan-table__cell--plus" role="columnheader">
            Plus · 개인
          </span>
        </div>
        {COMPARISON.map((row) => (
          <div className="plan-table__row" role="row" key={row.label}>
            <span className="plan-table__cell plan-table__cell--label" role="cell">
              {row.label}
            </span>
            <span className="plan-table__cell plan-table__cell--free" role="cell">
              {row.free}
            </span>
            <span className="plan-table__cell plan-table__cell--plus" role="cell">
              {row.plus}
            </span>
          </div>
        ))}
      </div>

      <footer className="plan-card__foot">
        <Button
          variant="secondary"
          className="btn--block"
          leadingIcon={<Bell size={14} strokeWidth={1.75} aria-hidden />}
          disabled
        >
          곧 만나요 · 알림 받기
        </Button>
        <p className="plan-card__note">
          아직 준비 중이에요. 지금 누르셔도 결제는 진행되지 않아요.
        </p>
      </footer>
    </section>
  );
}

function GroupPairCard() {
  return (
    <section className="plan-card" aria-label="Plus 그룹 페어 플랜">
      <header className="plan-card__head">
        <div className="plan-card__title">Plus · 그룹·페어</div>
        <div className="plan-card__price">
          <span className="plan-card__price-main">₩7,900</span>
          <span className="plan-card__price-unit"> /월</span>
        </div>
        <p className="plan-card__sub">한 명이 결제하면 공유방 전원이 혜택을 받아요.</p>
      </header>

      <p className="plan-card__body">
        한 사람만 결제하면 공유방의 <strong>모든 멤버</strong>가 Plus 혜택을 함께 누려요.
        각자 따로 결제하지 않아도 돼요.
      </p>

      <footer className="plan-card__foot">
        <Button variant="secondary" className="btn--block" disabled>
          곧 만나요
        </Button>
      </footer>
    </section>
  );
}

function PrintTeaserCard() {
  return (
    <section className="plan-card" aria-label="프린트 커머스">
      <header className="plan-card__head">
        <div className="plan-card__title">프린트 커머스</div>
        <div className="plan-card__price">
          <span className="plan-card__price-main">₩25,000–50,000</span>
          <span className="plan-card__price-unit"> · 일회성</span>
        </div>
        <p className="plan-card__sub">1년 치 결을 손에 잡히는 물건으로.</p>
      </header>

      <ul className="plan-feature-list">
        {PRINT_ITEMS.map(({ icon: Icon, label, hint }) => (
          <li className="plan-feature-list__item" key={label}>
            <span className="plan-feature-list__glyph" aria-hidden>
              <Icon size={16} strokeWidth={1.5} />
            </span>
            <span className="plan-feature-list__body">
              <span className="plan-feature-list__label">{label}</span>
              <span className="plan-feature-list__hint">{hint}</span>
            </span>
          </li>
        ))}
      </ul>

      <footer className="plan-card__foot">
        <Button variant="secondary" className="btn--block" disabled>
          곧 만나요
        </Button>
      </footer>
    </section>
  );
}

function Guardrails() {
  return (
    <section className="plans-guardrails" aria-label="결의 약속">
      <h3 className="plans-guardrails__title">결의 약속</h3>
      <ul className="plans-guardrails__list">
        <li>매일 기록하는 습관 자체는 영원히 무료예요.</li>
        <li>이미 남긴 결은 페이월 없이 항상 볼 수 있어요.</li>
        <li>업그레이드는 가치를 느낀 순간에만 조용히 권유해요.</li>
        <li>광고도, 데이터 판매도, 공개 피드도 없어요.</li>
      </ul>
    </section>
  );
}
