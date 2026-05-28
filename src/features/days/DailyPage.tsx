import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { DayHeader } from '../../components/DayHeader';
import { FragmentItem } from '../../components/FragmentItem';
import { useFragmentStore } from '../../lib/fragmentStore';
import { useViewSpaceFragments } from '../../lib/useViewSpaceFragments';

const TODAY_KEY = '2026-05-28';

export function DailyPage() {
  const { dayDate } = useParams<{ dayDate: string }>();
  const navigate = useNavigate();
  const fragments = useViewSpaceFragments();
  const pendingIds = useFragmentStore((s) => s.pendingIds);

  const date = dayDate ? new Date(dayDate) : null;
  const isValid = !!date && !Number.isNaN(date.getTime());

  if (!dayDate || !isValid || !date) {
    return (
      <div className="stack-4">
        <header className="detail-header">
          <button className="detail-header__back" aria-label="뒤로" onClick={() => navigate(-1)}>
            <ChevronLeft size={20} strokeWidth={1.5} />
          </button>
          <span className="detail-header__title">하루</span>
          <span aria-hidden style={{ width: 32 }} />
        </header>
        <div className="empty">잘못된 날짜예요.</div>
      </div>
    );
  }

  const dayFragments = fragments
    .filter((f) => f.dayDate === dayDate)
    .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));

  return (
    <div className="stack-4">
      <header className="detail-header">
        <button className="detail-header__back" aria-label="뒤로" onClick={() => navigate(-1)}>
          <ChevronLeft size={20} strokeWidth={1.5} />
        </button>
        <span className="detail-header__title">하루</span>
        <span aria-hidden style={{ width: 32 }} />
      </header>

      <DayHeader date={date} showTodayTag={dayDate === TODAY_KEY} />

      {dayFragments.length > 0 ? (
        <section>
          <div className="section-sub" style={{ marginBottom: 'var(--space-2)' }}>
            남긴 결 {dayFragments.length}
          </div>
          <div>
            {dayFragments.map((f) => (
              <FragmentItem
                key={f.id}
                fragment={f}
                pending={pendingIds.has(f.id)}
                onOpen={(id) => navigate(`/fragments/${id}`)}
              />
            ))}
          </div>
        </section>
      ) : (
        <div className="empty">이 날엔 아직 결이 없어요.</div>
      )}
    </div>
  );
}
