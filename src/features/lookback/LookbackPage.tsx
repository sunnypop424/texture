import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Video, Mic, Quote, PenLine, type LucideIcon } from 'lucide-react';
import { Segmented } from '../../components/Segmented';
import { LookbackRow } from '../../components/LookbackRow';
import { SpaceChip } from '../../components/SpaceChip';
import { useViewSpaceFragments } from '../../lib/useViewSpaceFragments';
import { useSpaceStore } from '../../lib/spaceStore';
import { spaceTagFor, type SpaceTag } from '../../lib/useSpaceColor';
import { getTodayDate, parseDayKey } from '../../lib/today';
import type { Fragment, MediaType } from '../../types/fragment';
import type { Space } from '../../types/space';

type Range = 'week' | 'month' | 'year';

const ICON = { photo: Camera, video: Video, text: Quote, voice: Mic } as const;
const MONTH_LABEL = [
  '1월', '2월', '3월', '4월', '5월', '6월',
  '7월', '8월', '9월', '10월', '11월', '12월',
];

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const out = new Date(d);
  out.setDate(d.getDate() - day);
  out.setHours(0, 0, 0, 0);
  return out;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(d.getDate() + n);
  return out;
}

function formatRange(start: Date, end: Date): string {
  const m1 = start.getMonth() + 1;
  const d1 = start.getDate();
  const m2 = end.getMonth() + 1;
  const d2 = end.getDate();
  if (m1 === m2) return `${m1}월 ${d1} – ${d2}일`;
  return `${m1}월 ${d1}일 – ${m2}월 ${d2}일`;
}

function countByType(fragments: Fragment[]): Record<MediaType, number> {
  const c: Record<MediaType, number> = { photo: 0, video: 0, text: 0, voice: 0 };
  for (const f of fragments) c[f.type] += 1;
  return c;
}

function distinctDays(fragments: Fragment[]): number {
  return new Set(fragments.map((f) => f.dayDate)).size;
}

function pickFeatured(fragments: Fragment[]): Fragment | null {
  const withMedia = fragments.find((f) => f.thumbUrl && (f.type === 'photo' || f.type === 'video'));
  if (withMedia) return withMedia;
  return fragments[0] ?? null;
}

export function LookbackPage() {
  const navigate = useNavigate();
  const fragments = useViewSpaceFragments();
  const spaces = useSpaceStore((s) => s.spaces);
  const [range, setRange] = useState<Range>('week');

  return (
    <div className="stack-5">
      <SpaceChip mode="view" />
      <Segmented
        value={range}
        onChange={setRange}
        ariaLabel="회고 범위"
        options={[
          { value: 'week', label: '주' },
          { value: 'month', label: '월' },
          { value: 'year', label: '연' },
        ]}
      />

      {range === 'week' && <WeekView fragments={fragments} spaces={spaces} />}
      {range === 'month' && <MonthView fragments={fragments} spaces={spaces} onPickDay={(d) => navigate(`/days/${d}`)} />}
      {range === 'year' && <YearView fragments={fragments} spaces={spaces} onPickMonth={(d) => navigate(`/days/${d}`)} />}
    </div>
  );
}

function WeekView({ fragments, spaces }: { fragments: Fragment[]; spaces: Space[] }) {
  const weekStart = useMemo(() => startOfWeek(getTodayDate()), []);
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);

  const inRange = useMemo(
    () =>
      fragments.filter((f) => {
        const d = parseDayKey(f.dayDate);
        return d >= weekStart && d <= weekEnd;
      }),
    [fragments, weekStart, weekEnd],
  );

  const grouped = useMemo(() => {
    const m = new Map<string, Fragment[]>();
    for (const f of inRange) {
      const arr = m.get(f.dayDate) ?? [];
      arr.push(f);
      m.set(f.dayDate, arr);
    }
    return Array.from(m.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dayDate, items]) => ({ date: parseDayKey(dayDate), fragments: items }));
  }, [inRange]);

  if (inRange.length === 0) {
    return <div className="empty">한 결이라도 쌓이면 다시 만나요.</div>;
  }

  return (
    <div className="stack-5">
      <header>
        <div className="lookback-period">지난 한 주 · {formatRange(weekStart, weekEnd)}</div>
        <p className="lookback-summary" style={{ marginTop: '4px' }}>
          {inRange.length}개의 순간을 남겼어요
        </p>
      </header>

      <div className="stack-4">
        {grouped.map(({ date, fragments: dayFragments }) => (
          <LookbackRow
            key={date.toISOString()}
            date={date}
            fragments={dayFragments}
            spaces={spaces}
          />
        ))}
      </div>
    </div>
  );
}

function MonthView({
  fragments,
  spaces,
  onPickDay,
}: {
  fragments: Fragment[];
  spaces: Space[];
  onPickDay: (dayDate: string) => void;
}) {
  void onPickDay;
  const today = useMemo(() => getTodayDate(), []);
  const monthStart = useMemo(() => new Date(today.getFullYear(), today.getMonth(), 1), [today]);
  const monthEnd = useMemo(() => new Date(today.getFullYear(), today.getMonth() + 1, 0), [today]);

  const inRange = useMemo(
    () =>
      fragments
        .filter((f) => {
          const d = parseDayKey(f.dayDate);
          return d >= monthStart && d <= monthEnd;
        })
        .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt)),
    [fragments, monthStart, monthEnd],
  );

  const featured = useMemo(() => pickFeatured(inRange), [inRange]);
  const counts = useMemo(() => countByType(inRange), [inRange]);
  const days = distinctDays(inRange);

  const weeks = useMemo(() => {
    const m = new Map<string, Fragment[]>();
    for (const f of inRange) {
      const d = parseDayKey(f.dayDate);
      const ws = startOfWeek(d);
      const key = ws.toISOString().slice(0, 10);
      const arr = m.get(key) ?? [];
      arr.push(f);
      m.set(key, arr);
    }
    return Array.from(m.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, items]) => {
        const ws = parseDayKey(key);
        const we = addDays(ws, 6);
        return { start: ws, end: we, fragments: items };
      });
  }, [inRange]);

  if (inRange.length === 0) {
    return <div className="empty">이번 달엔 아직 결이 비어 있어요.</div>;
  }

  return (
    <div className="stack-5">
      <header>
        <div className="lookback-period">
          {today.getFullYear()}년 {today.getMonth() + 1}월
        </div>
        <p className="lookback-summary" style={{ marginTop: '4px' }}>
          {inRange.length}개의 순간을 남겼어요
        </p>
      </header>

      {featured && (
        <LookbackHero
          fragment={featured}
          tag={spaceTagFor(spaces.find((s) => s.id === featured.spaceId))}
        />
      )}

      <div className="lookback-stats">
        <span>{inRange.length}개의 결</span>
        <span className="lookback-stats__dot" aria-hidden>·</span>
        <span>{days}일에 걸쳐</span>
      </div>

      <MediaBreakdown counts={counts} />

      <section>
        <div className="lookback-section-label">주</div>
        <div className="stack-4">
          {weeks.map((w) => (
            <WeekRow
              key={w.start.toISOString()}
              label={formatRange(w.start, w.end)}
              count={w.fragments.length}
              samples={w.fragments.slice(0, 4)}
              spaces={spaces}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function YearView({
  fragments,
  spaces,
  onPickMonth,
}: {
  fragments: Fragment[];
  spaces: Space[];
  onPickMonth: (dayDate: string) => void;
}) {
  const year = useMemo(() => getTodayDate().getFullYear(), []);

  const yearFragments = useMemo(
    () =>
      fragments
        .filter((f) => parseDayKey(f.dayDate).getFullYear() === year)
        .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt)),
    [fragments, year],
  );

  const featured = useMemo(() => pickFeatured(yearFragments), [yearFragments]);
  const counts = useMemo(() => countByType(yearFragments), [yearFragments]);

  const months = useMemo(() => {
    const buckets: Fragment[][] = Array.from({ length: 12 }, () => []);
    for (const f of yearFragments) buckets[parseDayKey(f.dayDate).getMonth()].push(f);
    return buckets.map((items, i) => ({
      month: i,
      fragments: items,
      cover: pickFeatured(items),
    }));
  }, [yearFragments]);

  const activeMonths = months.filter((m) => m.fragments.length > 0).length;

  if (yearFragments.length === 0) {
    return <div className="empty">올해는 아직 결이 비어 있어요.</div>;
  }

  return (
    <div className="stack-5">
      <header>
        <div className="lookback-period">{year}년</div>
        <p className="lookback-summary" style={{ marginTop: '4px' }}>
          {yearFragments.length}개의 순간을 남겼어요
        </p>
      </header>

      {featured && (
        <LookbackHero
          fragment={featured}
          tag={spaceTagFor(spaces.find((s) => s.id === featured.spaceId))}
        />
      )}

      <div className="lookback-stats">
        <span>{yearFragments.length}개의 결</span>
        <span className="lookback-stats__dot" aria-hidden>·</span>
        <span>{activeMonths}개월에 걸쳐</span>
      </div>

      <MediaBreakdown counts={counts} />

      <section>
        <div className="lookback-section-label">월</div>
        <div className="month-grid">
          {months
            .filter((m) => m.fragments.length > 0)
            .reverse()
            .map((m) => (
              <MonthTile
                key={m.month}
                month={m.month}
                count={m.fragments.length}
                cover={m.cover}
                tag={spaceTagFor(spaces.find((s) => s.id === m.cover?.spaceId))}
                onClick={() => {
                  const first = m.fragments[0];
                  if (first) onPickMonth(first.dayDate);
                }}
              />
            ))}
        </div>
      </section>
    </div>
  );
}

function LookbackHero({
  fragment,
  tag,
}: {
  fragment: Fragment;
  tag: SpaceTag | null;
}) {
  const Icon = ICON[fragment.type];
  const hasMedia =
    !!fragment.thumbUrl && (fragment.type === 'photo' || fragment.type === 'video');
  const d = parseDayKey(fragment.dayDate);
  const dateLabel = `${d.getMonth() + 1}월 ${d.getDate()}일`;

  return (
    <div
      className={`lookback-hero ${hasMedia ? 'lookback-hero--media' : 'lookback-hero--text'}`}
      aria-label={fragment.title}
    >
      {hasMedia ? (
        fragment.type === 'video' ? (
          <video className="lookback-hero__media" src={fragment.thumbUrl} muted playsInline />
        ) : (
          <img className="lookback-hero__media" src={fragment.thumbUrl} alt="" />
        )
      ) : (
        <div className="lookback-hero__quote">
          <Icon className="lookback-hero__quote-icon" size={20} strokeWidth={1.5} aria-hidden />
          <span className="lookback-hero__quote-text">{fragment.title}</span>
        </div>
      )}
      {tag && (
        <div className="lookback-hero__hue">
          <span className="space-dot" style={{ background: tag.color }} aria-hidden />
          <span>{tag.name}</span>
        </div>
      )}
      <div className="lookback-hero__caption">
        <div className="lookback-hero__title">{fragment.title}</div>
        <div className="lookback-hero__meta">{dateLabel}</div>
      </div>
    </div>
  );
}

const BREAKDOWN_ITEMS: ReadonlyArray<{ type: MediaType; label: string; Icon: LucideIcon }> = [
  { type: 'photo', label: '사진', Icon: Camera },
  { type: 'video', label: '영상', Icon: Video },
  { type: 'text', label: '글', Icon: PenLine },
  { type: 'voice', label: '음성', Icon: Mic },
];

function MediaBreakdown({ counts }: { counts: Record<MediaType, number> }) {
  const items = BREAKDOWN_ITEMS.filter(({ type }) => counts[type] > 0);
  if (items.length === 0) return null;
  return (
    <div className="media-breakdown" aria-label="매체별 합계">
      {items.map(({ type, label, Icon }) => (
        <span key={type} className="media-breakdown__item">
          <Icon size={14} strokeWidth={1.5} className="media-breakdown__icon" aria-hidden />
          {label} {counts[type]}
        </span>
      ))}
    </div>
  );
}

function WeekRow({
  label,
  count,
  samples,
  spaces,
}: {
  label: string;
  count: number;
  samples: Fragment[];
  spaces: Space[];
}) {
  return (
    <div className="week-row">
      <div className="week-row__head">
        <span className="week-row__label">{label}</span>
        <span className="week-row__count">{count}개의 결</span>
      </div>
      <div className="week-row__samples">
        {samples.map((f) => {
          const Icon = ICON[f.type];
          const tag = spaceTagFor(spaces.find((s) => s.id === f.spaceId));
          return (
            <div key={f.id} className="week-row__thumb" aria-label={f.title}>
              {f.thumbUrl ? (
                <img src={f.thumbUrl} alt="" />
              ) : (
                <Icon size={18} strokeWidth={1.5} />
              )}
              {tag && (
                <span
                  className="space-dot space-dot--corner"
                  style={{ background: tag.color }}
                  aria-hidden
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MonthTile({
  month,
  count,
  cover,
  tag,
  onClick,
}: {
  month: number;
  count: number;
  cover: Fragment | null;
  tag: SpaceTag | null;
  onClick?: () => void;
}) {
  const hasCover = !!cover?.thumbUrl && (cover.type === 'photo' || cover.type === 'video');
  return (
    <button className="month-tile" onClick={onClick} aria-label={`${MONTH_LABEL[month]} ${count}개`}>
      <div className={`month-tile__cover ${hasCover ? '' : 'month-tile__cover--empty'}`}>
        {hasCover ? (
          cover && cover.type === 'video' ? (
            <video src={cover.thumbUrl} muted playsInline />
          ) : (
            <img src={cover?.thumbUrl} alt="" />
          )
        ) : (
          <span className="month-tile__empty-label">{MONTH_LABEL[month]}</span>
        )}
        <div className="month-tile__overlay">
          <span className="month-tile__label">{MONTH_LABEL[month]}</span>
          <span className="month-tile__count">
            {count}개의 결
            {tag && (
              <>
                {' · '}
                <span
                  className="space-dot space-dot--inline"
                  style={{ background: tag.color }}
                  aria-hidden
                />
                {tag.name}
              </>
            )}
          </span>
        </div>
      </div>
    </button>
  );
}
