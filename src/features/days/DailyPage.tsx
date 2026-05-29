import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { DayHeader } from '../../components/DayHeader';
import { FragmentItem } from '../../components/FragmentItem';
import { CaptureEntry } from '../../components/CaptureEntry';
import { MediaToggle } from '../../components/MediaToggle';
import { CaptureSheet, type CaptureDraft } from '../../components/CaptureSheet';
import { Toast } from '../../components/Toast';
import { useFragmentStore } from '../../lib/fragmentStore';
import { useSpaceStore } from '../../lib/spaceStore';
import { useViewSpaceFragments } from '../../lib/useViewSpaceFragments';
import { getCurrentUser } from '../../lib/identity';
import { saveMedia } from '../../lib/mediaStore';
import { getTodayDate, getTodayKey, nowIsoLocal, parseDayKey } from '../../lib/today';
import { syncReminder } from '../../lib/notifications';
import type { Fragment, MediaType } from '../../types/fragment';

export function DailyPage() {
  const { dayDate } = useParams<{ dayDate: string }>();
  const navigate = useNavigate();
  const fragments = useViewSpaceFragments();
  const pendingIds = useFragmentStore((s) => s.pendingIds);
  const recentlyAddedId = useFragmentStore((s) => s.recentlyAddedId);
  const addFragment = useFragmentStore((s) => s.add);
  const activeSpaceId = useSpaceStore((s) => s.activeSpaceId);
  const todayKey = useMemo(() => getTodayKey(), []);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetType, setSheetType] = useState<MediaType>('photo');
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const date = dayDate && /^\d{4}-\d{2}-\d{2}$/.test(dayDate) ? parseDayKey(dayDate) : null;
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

  // 미래 날짜에는 기록을 남길 수 없다. 오늘·과거는 백필 가능.
  const isFuture = date.getTime() > getTodayDate().getTime();
  const isToday = dayDate === todayKey;

  const dayFragments = fragments
    .filter((f) => f.dayDate === dayDate)
    .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));

  const openCapture = (type: MediaType) => {
    setSheetType(type);
    setSheetOpen(true);
  };

  const handleSave = async (draft: CaptureDraft) => {
    const me = getCurrentUser();
    // 오프라인 우선 — 클라이언트가 UUID를 발급해 그대로 DB PK로 쓴다.
    const fragmentId = crypto.randomUUID();
    let thumbUrl = draft.previewUrl;
    let hasLocalMedia = false;

    if (draft.mediaBlob) {
      thumbUrl = await saveMedia(fragmentId, draft.mediaBlob);
      hasLocalMedia = true;
    }

    // 오늘은 실제 시각, 과거 백필은 정오 앵커(정렬용) + '시간 미상' 표기.
    const capturedAt = isToday ? nowIsoLocal() : `${dayDate}T12:00:00`;

    const next: Fragment = {
      id: fragmentId,
      type: draft.type,
      title: draft.title,
      capturedAt,
      dayDate,
      thumbUrl,
      hasLocalMedia: hasLocalMedia || undefined,
      bytes: draft.mediaBlob?.size,
      backfilled: isToday ? undefined : true,
      spaceId: activeSpaceId,
      authorId: me.id,
    };
    addFragment(next);
    setSheetOpen(false);
    setSavedMsg(isToday ? '오늘의 결을 남겼어요' : '이 날에 결을 담았어요');
    void syncReminder();
  };

  return (
    <div className="stack-4">
      <header className="detail-header">
        <button className="detail-header__back" aria-label="뒤로" onClick={() => navigate(-1)}>
          <ChevronLeft size={20} strokeWidth={1.5} />
        </button>
        <span className="detail-header__title">하루</span>
        <span aria-hidden style={{ width: 32 }} />
      </header>

      <DayHeader date={date} showTodayTag={isToday} />

      {!isFuture && (
        <>
          <CaptureEntry
            onTap={() => openCapture('photo')}
            label={isToday ? '오늘, 무엇이든 한 결 남겨요' : '이 날에, 무엇이든 한 결 남겨요'}
          />
          <MediaToggle onSelect={openCapture} />
        </>
      )}

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
                appear={f.id === recentlyAddedId}
                onOpen={(id) => navigate(`/fragments/${id}`)}
              />
            ))}
          </div>
        </section>
      ) : (
        <div className="empty">
          {isFuture
            ? '아직 오지 않은 날이에요.'
            : '이 날은 비어 있어요. 기억나는 게 있다면 지금 더해도 돼요.'}
        </div>
      )}

      {!isFuture && (
        <CaptureSheet
          open={sheetOpen}
          initialType={sheetType}
          onClose={() => setSheetOpen(false)}
          onSave={handleSave}
        />
      )}

      <Toast message={savedMsg} onDone={() => setSavedMsg(null)} />
    </div>
  );
}
