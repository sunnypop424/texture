import { useMemo, useState } from 'react';
import { DayHeader } from '../../components/DayHeader';
import { PromptChip } from '../../components/PromptChip';
import { CaptureEntry } from '../../components/CaptureEntry';
import { MediaToggle } from '../../components/MediaToggle';
import { FragmentItem } from '../../components/FragmentItem';
import { CaptureSheet, type CaptureDraft } from '../../components/CaptureSheet';
import { SpaceChip } from '../../components/SpaceChip';
import { WeekRecapCard } from '../../components/WeekRecapCard';
import { Toast } from '../../components/Toast';
import { useFragmentStore } from '../../lib/fragmentStore';
import { useSpaceStore } from '../../lib/spaceStore';
import { useActiveSpaceFragments } from '../../lib/useActiveSpaceFragments';
import { useDailyPrompt } from '../../lib/useDailyPrompt';
import { useOnboarding } from '../../lib/useOnboarding';
import { getCurrentUser } from '../../lib/identity';
import { saveMedia } from '../../lib/mediaStore';
import { getTodayDate, getTodayKey, nowIsoLocal } from '../../lib/today';
import type { Fragment, MediaType } from '../../types/fragment';

export function TodayPage() {
  const today = useMemo(() => getTodayDate(), []);
  const todayKey = useMemo(() => getTodayKey(), []);

  const fragments = useActiveSpaceFragments();
  const pendingIds = useFragmentStore((s) => s.pendingIds);
  const recentlyAddedId = useFragmentStore((s) => s.recentlyAddedId);
  const addFragment = useFragmentStore((s) => s.add);
  const activeSpaceId = useSpaceStore((s) => s.activeSpaceId);

  const { onboarded, markOnboarded } = useOnboarding();
  // 온보딩(welcome) 중엔 매 진입마다 무작위, 그 뒤엔 하루 고정.
  const { prompt, dismiss } = useDailyPrompt(todayKey, { random: !onboarded });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetType, setSheetType] = useState<MediaType>('photo');
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const todays = fragments
    .filter((f) => f.dayDate === todayKey)
    .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));

  const openCapture = (type: MediaType) => {
    setSheetType(type);
    setSheetOpen(true);
  };

  const handleSave = async (draft: CaptureDraft) => {
    const me = getCurrentUser();
    const fragmentId = `local-${Date.now()}`;
    let thumbUrl = draft.previewUrl;
    let hasLocalMedia = false;

    if (draft.mediaBlob) {
      thumbUrl = await saveMedia(fragmentId, draft.mediaBlob);
      hasLocalMedia = true;
    }

    const next: Fragment = {
      id: fragmentId,
      type: draft.type,
      title: draft.title,
      capturedAt: nowIsoLocal(),
      dayDate: todayKey,
      thumbUrl,
      hasLocalMedia: hasLocalMedia || undefined,
      spaceId: activeSpaceId,
      authorId: me.id,
    };
    addFragment(next);
    setSheetOpen(false);
    setSavedMsg('오늘의 결을 남겼어요');
    if (!onboarded) markOnboarded();
  };

  return (
    <div className="stack-4">
      <SpaceChip />
      <DayHeader date={today} showTodayTag />

      {!onboarded && <WelcomeNote />}

      {prompt && (
        <PromptChip
          category={prompt.category}
          message={prompt.message}
          onDismiss={dismiss}
        />
      )}

      <CaptureEntry onTap={() => openCapture('photo')} />

      <MediaToggle onSelect={openCapture} />

      {onboarded && todays.length > 0 && (
        <section>
          <div className="section-sub" style={{ marginBottom: 'var(--space-2)' }}>
            오늘 남긴 결 {todays.length}
          </div>
          <div>
            {todays.map((f) => (
              <FragmentItem
                key={f.id}
                fragment={f}
                pending={pendingIds.has(f.id)}
                appear={f.id === recentlyAddedId}
              />
            ))}
          </div>
        </section>
      )}

      {onboarded && <WeekRecapCard />}

      <CaptureSheet
        open={sheetOpen}
        initialType={sheetType}
        onClose={() => setSheetOpen(false)}
        onSave={handleSave}
      />

      <Toast message={savedMsg} onDone={() => setSavedMsg(null)} />
    </div>
  );
}

function WelcomeNote() {
  return (
    <div className="welcome">
      <p className="welcome__greeting">환영해요.</p>
      <p className="welcome__line">지금, 무엇이든 한 결을 가볍게 남겨주세요.</p>
    </div>
  );
}
