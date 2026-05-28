import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CalendarCell } from '../../components/CalendarCell';
import { YearAgoCard } from '../../components/YearAgoCard';
import { SpaceChip } from '../../components/SpaceChip';
import { useViewSpaceFragments } from '../../lib/useViewSpaceFragments';
import { useSpaceStore } from '../../lib/spaceStore';

const TODAY = new Date('2026-05-28T00:00:00');
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function buildMonth(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const startDate = new Date(year, month, 1 - startDay);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    return d;
  });
}

function toKey(d: Date): string {
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function CalendarPage() {
  const navigate = useNavigate();
  const fragments = useViewSpaceFragments();
  const spaces = useSpaceStore((s) => s.spaces);
  const [cursor, setCursor] = useState(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1));

  /** 각 dayKey 의 dot 색 — 그 날 가장 최근 결의 공간 색. 개인 공간이면 undefined → mint 기본값. */
  const dotByDay = useMemo(() => {
    const byDay = new Map<string, { latestAt: string; color?: string }>();
    for (const f of fragments) {
      const cur = byDay.get(f.dayDate);
      if (cur && cur.latestAt >= f.capturedAt) continue;
      const space = spaces.find((sp) => sp.id === f.spaceId);
      byDay.set(f.dayDate, {
        latestAt: f.capturedAt,
        color: space && !space.isPersonal ? space.color : undefined,
      });
    }
    return byDay;
  }, [fragments, spaces]);

  const recordedDays = useMemo(() => {
    const s = new Set<string>();
    for (const f of fragments) s.add(f.dayDate);
    return s;
  }, [fragments]);

  const days = useMemo(
    () => buildMonth(cursor.getFullYear(), cursor.getMonth()),
    [cursor],
  );

  const yearAgoKey = `${TODAY.getFullYear() - 1}-${(TODAY.getMonth() + 1).toString().padStart(2, '0')}-${TODAY.getDate().toString().padStart(2, '0')}`;
  const yearAgo = fragments.find((f) => f.dayDate === yearAgoKey) ?? null;
  const todayKey = toKey(TODAY);

  const onTodaysMonth =
    cursor.getFullYear() === TODAY.getFullYear() &&
    cursor.getMonth() === TODAY.getMonth();

  return (
    <div className="stack-4">
      <SpaceChip mode="view" />

      <header className="month-nav">
        <button
          className="month-nav__btn"
          aria-label="이전 달"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
        >
          <ChevronLeft size={18} strokeWidth={1.5} />
        </button>
        <h1 className="month-nav__title">
          {cursor.getFullYear()}년 {cursor.getMonth() + 1}월
        </h1>
        <button
          className="month-nav__btn"
          aria-label="다음 달"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
        >
          <ChevronRight size={18} strokeWidth={1.5} />
        </button>
      </header>

      {!onTodaysMonth && (
        <div className="month-jump">
          <button
            className="month-jump__btn"
            onClick={() => setCursor(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1))}
          >
            오늘로 가기
          </button>
        </div>
      )}

      <div>
        <div className="cal" role="grid" style={{ marginBottom: '6px' }}>
          {WEEKDAYS.map((w) => (
            <div key={w} className="cal__weekday">{w}</div>
          ))}
        </div>
        <div className="cal">
          {days.map((d) => {
            const key = toKey(d);
            return (
              <CalendarCell
                key={d.toISOString()}
                date={d}
                hasRecord={recordedDays.has(key)}
                dotColor={dotByDay.get(key)?.color}
                isToday={key === todayKey}
                isOutsideMonth={d.getMonth() !== cursor.getMonth()}
                onSelect={(date) => navigate(`/days/${toKey(date)}`)}
              />
            );
          })}
        </div>
      </div>

      {yearAgo && <YearAgoCard fragment={yearAgo} />}
    </div>
  );
}
