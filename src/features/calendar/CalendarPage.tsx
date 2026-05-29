import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { CalendarCell } from '../../components/CalendarCell';
import { YearAgoCard } from '../../components/YearAgoCard';
import { SpaceChip } from '../../components/SpaceChip';
import { useViewSpaceFragments } from '../../lib/useViewSpaceFragments';
import { useSpaceStore } from '../../lib/spaceStore';
import { getTodayDate, toDayKey } from '../../lib/today';

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

export function CalendarPage() {
  const navigate = useNavigate();
  const fragments = useViewSpaceFragments();
  const spaces = useSpaceStore((s) => s.spaces);
  const today = useMemo(() => getTodayDate(), []);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

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

  const yearAgoKey = toDayKey(new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()));
  const yearAgo = fragments.find((f) => f.dayDate === yearAgoKey) ?? null;
  const todayKey = toDayKey(today);

  const onTodaysMonth =
    cursor.getFullYear() === today.getFullYear() &&
    cursor.getMonth() === today.getMonth();

  return (
    <div className="stack-4">
      <div className="cal-top">
        <SpaceChip mode="view" />
        <button
          className="icon-btn"
          aria-label="결 검색"
          onClick={() => navigate('/search')}
        >
          <Search size={18} strokeWidth={1.75} />
        </button>
      </div>

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
            onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
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
            const key = toDayKey(d);
            return (
              <CalendarCell
                key={d.toISOString()}
                date={d}
                hasRecord={recordedDays.has(key)}
                dotColor={dotByDay.get(key)?.color}
                isToday={key === todayKey}
                isOutsideMonth={d.getMonth() !== cursor.getMonth()}
                onSelect={(date) => navigate(`/days/${toDayKey(date)}`)}
              />
            );
          })}
        </div>
      </div>

      {recordedDays.size === 0 ? (
        <div className="empty">
          아직 기록한 날이 없어요.
          <br />
          <button className="empty__link" onClick={() => navigate('/')}>
            오늘 첫 결을 남겨보세요.
          </button>
        </div>
      ) : (
        yearAgo && <YearAgoCard fragment={yearAgo} />
      )}
    </div>
  );
}
