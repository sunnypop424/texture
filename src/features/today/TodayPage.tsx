import { useState } from 'react';
import { DayHeader } from '../../components/DayHeader';
import { PromptChip } from '../../components/PromptChip';
import { CaptureEntry } from '../../components/CaptureEntry';
import { MediaToggle } from '../../components/MediaToggle';
import { FragmentItem } from '../../components/FragmentItem';
import { CaptureSheet, type CaptureDraft } from '../../components/CaptureSheet';
import { SpaceChip } from '../../components/SpaceChip';
import { useFragmentStore } from '../../lib/fragmentStore';
import { useSpaceStore } from '../../lib/spaceStore';
import { useActiveSpaceFragments } from '../../lib/useActiveSpaceFragments';
import { useDailyPrompt } from '../../lib/useDailyPrompt';
import { useOnboarding } from '../../lib/useOnboarding';
import { getCurrentUser } from '../../lib/identity';
import { saveMedia } from '../../lib/mediaStore';
import type { Fragment, MediaType } from '../../types/fragment';

const TODAY = new Date('2026-05-28T00:00:00');
const TODAY_KEY = '2026-05-28';

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function nowIsoLocal(): string {
  const d = new Date();
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

export function TodayPage() {
  const fragments = useActiveSpaceFragments();
  const pendingIds = useFragmentStore((s) => s.pendingIds);
  const recentlyAddedId = useFragmentStore((s) => s.recentlyAddedId);
  const addFragment = useFragmentStore((s) => s.add);
  const activeSpaceId = useSpaceStore((s) => s.activeSpaceId);

  const { prompt, dismiss } = useDailyPrompt(TODAY_KEY);
  const { onboarded, markOnboarded } = useOnboarding();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetType, setSheetType] = useState<MediaType>('photo');

  const todays = fragments
    .filter((f) => f.dayDate === TODAY_KEY)
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
      dayDate: TODAY_KEY,
      thumbUrl,
      hasLocalMedia: hasLocalMedia || undefined,
      spaceId: activeSpaceId,
      authorId: me.id,
    };
    addFragment(next);
    setSheetOpen(false);
    if (!onboarded) markOnboarded();
  };

  return (
    <div className="stack-4">
      <SpaceChip />
      <DayHeader date={TODAY} showTodayTag />

      {!onboarded ? (
        <WelcomeNote />
      ) : (
        prompt && (
          <PromptChip
            category={prompt.category}
            message={prompt.message}
            onDismiss={dismiss}
          />
        )
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

      <CaptureSheet
        open={sheetOpen}
        initialType={sheetType}
        onClose={() => setSheetOpen(false)}
        onSave={handleSave}
      />
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
