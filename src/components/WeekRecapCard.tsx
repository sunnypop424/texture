import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, X } from 'lucide-react';
import { useViewSpaceFragments } from '../lib/useViewSpaceFragments';
import { getTodayDate, parseDayKey, toDayKey } from '../lib/today';

/** 대여섯 결이 쌓이면 아하 모먼트(주간 회고)를 자동으로 띄운다. (§11.1 Day 4–7) */
const RECAP_THRESHOLD = 5;
const DISMISS_KEY = 'gyeol:recap-dismissed-week:v1';

function startOfWeek(d: Date): Date {
  const out = new Date(d);
  out.setDate(d.getDate() - d.getDay());
  out.setHours(0, 0, 0, 0);
  return out;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(d.getDate() + n);
  return out;
}

function readDismissed(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(DISMISS_KEY);
  } catch {
    return null;
  }
}

/**
 * 이번 주 결이 일정 수 이상 쌓이면 Today에 떠오르는 '돌아보기' 진입 카드.
 * 자격 미달이거나 이번 주에 닫았으면 아무것도 렌더하지 않는다.
 */
export function WeekRecapCard() {
  const navigate = useNavigate();
  const fragments = useViewSpaceFragments();

  const weekStartKey = useMemo(() => toDayKey(startOfWeek(getTodayDate())), []);
  const [dismissedWeek, setDismissedWeek] = useState<string | null>(() => readDismissed());

  const count = useMemo(() => {
    const start = parseDayKey(weekStartKey);
    const end = addDays(start, 6);
    return fragments.filter((f) => {
      const d = parseDayKey(f.dayDate);
      return d >= start && d <= end;
    }).length;
  }, [fragments, weekStartKey]);

  if (count < RECAP_THRESHOLD) return null;
  if (dismissedWeek === weekStartKey) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, weekStartKey);
    } catch {
      // ignore
    }
    setDismissedWeek(weekStartKey);
  };

  return (
    <section className="recap" aria-label="지난 한 주 돌아보기">
      <button className="recap__open" onClick={() => navigate('/lookback')}>
        <span className="recap__icon" aria-hidden>
          <History size={18} strokeWidth={1.5} />
        </span>
        <span className="recap__body">
          <span className="recap__label">지난 한 주</span>
          <span className="recap__line">{count}개의 순간을 남겼어요</span>
        </span>
      </button>
      <button className="recap__close" aria-label="이 카드 닫기" onClick={dismiss}>
        <X size={16} strokeWidth={1.75} />
      </button>
    </section>
  );
}
