import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Pencil, Trash2, Camera, Video, Mic, Quote } from 'lucide-react';
import { useFragmentStore } from '../../lib/fragmentStore';
import { useSpaceStore } from '../../lib/spaceStore';
import { useToastStore } from '../../lib/toastStore';
import { enqueueDelete, enqueueUpdate } from '../../lib/syncEngine';
import { useMediaUrl } from '../../lib/useMediaUrl';
import { CaptureSheet, type CaptureDraft } from '../../components/CaptureSheet';
import { ConfirmSheet } from '../../components/ConfirmSheet';
import { PhotoViewer } from '../../components/PhotoViewer';
import { FragmentItem } from '../../components/FragmentItem';
import { saveMedia, removeMedia } from '../../lib/mediaStore';
import type { Fragment } from '../../types/fragment';

const ICON = { photo: Camera, video: Video, text: Quote, voice: Mic } as const;

function formatDateOnly(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function formatFull(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const min = d.getMinutes();
  const ampm = h < 12 ? '오전' : '오후';
  const hh = h % 12 === 0 ? 12 : h % 12;
  const mm = min.toString().padStart(2, '0');
  return `${formatDateOnly(iso)} · ${ampm} ${hh}:${mm}`;
}

export function FragmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fragments = useFragmentStore((s) => s.fragments);
  const pendingIds = useFragmentStore((s) => s.pendingIds);
  const updateFragment = useFragmentStore((s) => s.update);
  const removeFragment = useFragmentStore((s) => s.remove);
  const spaces = useSpaceStore((s) => s.spaces);
  const showToast = useToastStore((s) => s.show);

  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);

  const fragment: Fragment | undefined = fragments.find((f) => f.id === id);

  // 같은 날·같은 공간에 남긴 다른 결 — 조용한 연결.
  const sameDay = useMemo(() => {
    if (!fragment) return [];
    return fragments
      .filter(
        (f) =>
          f.id !== fragment.id &&
          f.dayDate === fragment.dayDate &&
          f.spaceId === fragment.spaceId,
      )
      .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
  }, [fragments, fragment]);

  const mediaUrl = useMediaUrl(fragment); // 클라우드에만 있으면 이때 받아옴(지연 로드)

  if (!fragment) {
    return (
      <div className="stack-4">
        <DetailHeader onBack={() => navigate(-1)} />
        <div className="empty">이 결을 찾을 수 없어요.</div>
      </div>
    );
  }

  const Icon = ICON[fragment.type];
  const pending = pendingIds.has(fragment.id);

  const fragmentSpace = spaces.find((s) => s.id === fragment.spaceId);
  const showAuthor = !!fragmentSpace && !fragmentSpace.isPersonal;
  const authorName = fragmentSpace?.members.find((m) => m.userId === fragment.authorId)?.displayName;

  const handleEdit = async (draft: CaptureDraft) => {
    const patch: Partial<Omit<Fragment, 'id'>> = {
      type: draft.type,
      title: draft.title,
    };
    if (draft.mediaBlob) {
      // 새 미디어 → 기존 blob 정리 후 새로 저장. mediaPath를 비워 동기화가 새 원본을 올리게 함.
      if (fragment.hasLocalMedia) await removeMedia(fragment.id);
      patch.thumbUrl = await saveMedia(fragment.id, draft.mediaBlob);
      patch.hasLocalMedia = true;
      patch.mediaPath = undefined;
      patch.bytes = draft.mediaBlob.size;
    } else if (!draft.previewUrl) {
      // 미디어 제거됨 (다시 선택 후 캔슬 등). mediaPath는 유지 → 동기화가 서버 객체를 지움.
      if (fragment.hasLocalMedia) await removeMedia(fragment.id);
      patch.thumbUrl = undefined;
      patch.hasLocalMedia = false;
      patch.bytes = undefined;
    }
    // 미디어 그대로 유지 (draft.previewUrl 있고 blob 없음) → thumbUrl 안 건드림
    updateFragment(fragment.id, patch);
    void enqueueUpdate(fragment.id); // 수정 내용을 서버에도 반영
    setEditOpen(false);
  };

  const handleDelete = () => {
    // 서버에도 반영되도록 삭제 대기열에 넣고(있다면 미디어 경로 포함) 로컬에서 비운다.
    void enqueueDelete({ id: fragment.id, spaceId: fragment.spaceId, mediaPath: fragment.mediaPath });
    removeFragment(fragment.id);
    setConfirmOpen(false);
    navigate(-1);
    showToast('결을 비웠어요');
  };

  const canViewFull = fragment.type === 'photo' && !!mediaUrl;

  return (
    <div className="stack-4">
      <DetailHeader
        onBack={() => navigate(-1)}
        onEdit={() => setEditOpen(true)}
        onDelete={() => setConfirmOpen(true)}
      />

      <div
        className={`detail-media ${canViewFull ? 'detail-media--clickable' : ''}`}
        onClick={canViewFull ? () => setViewerOpen(true) : undefined}
        role={canViewFull ? 'button' : undefined}
        tabIndex={canViewFull ? 0 : -1}
        aria-label={canViewFull ? '사진 크게 보기' : undefined}
        onKeyDown={(e) => {
          if (canViewFull && e.key === 'Enter') setViewerOpen(true);
        }}
      >
        {mediaUrl ? (
          fragment.type === 'video' ? (
            <video src={mediaUrl} controls />
          ) : fragment.type === 'voice' ? (
            <div className="detail-media__voice">
              <audio src={mediaUrl} controls />
            </div>
          ) : (
            <img src={mediaUrl} alt="" />
          )
        ) : (
          <div className="detail-media__placeholder" aria-hidden>
            <Icon size={36} strokeWidth={1.5} />
          </div>
        )}
      </div>

      <div className="stack-2">
        <div className="detail-title">{fragment.title}</div>
        <div className="detail-meta">
          {fragment.backfilled
            ? `${formatDateOnly(fragment.capturedAt)} · 시간 미상`
            : formatFull(fragment.capturedAt)}
          {fragmentSpace && !fragmentSpace.isPersonal && fragmentSpace.color && (
            <>
              {' · '}
              <span
                className="space-dot space-dot--inline"
                style={{ background: fragmentSpace.color }}
                aria-hidden
              />
              {fragmentSpace.name}
            </>
          )}
          {showAuthor && authorName && <span> · {authorName}</span>}
          {pending && <span> · 저장 중</span>}
        </div>
      </div>

      {sameDay.length > 0 && (
        <section className="detail-related">
          <div className="section-sub">같은 날 남긴 다른 결</div>
          <div>
            {sameDay.map((f) => (
              <FragmentItem
                key={f.id}
                fragment={f}
                onOpen={(fid) => navigate(`/fragments/${fid}`)}
              />
            ))}
          </div>
          <button className="empty__link" onClick={() => navigate(`/days/${fragment.dayDate}`)}>
            이 날 전체 보기
          </button>
        </section>
      )}

      <CaptureSheet
        open={editOpen}
        initialType={fragment.type}
        initialDraft={{
          type: fragment.type,
          title: fragment.title,
          previewUrl: mediaUrl,
        }}
        onClose={() => setEditOpen(false)}
        onSave={handleEdit}
        saveLabel="수정 저장"
      />

      <ConfirmSheet
        open={confirmOpen}
        title="이 결을 비울까요?"
        message="비운 결은 되돌릴 수 없어요."
        confirmLabel="비우기"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />

      {canViewFull && (
        <PhotoViewer
          open={viewerOpen}
          src={mediaUrl!}
          alt={fragment.title}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </div>
  );
}

interface DetailHeaderProps {
  onBack: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

function DetailHeader({ onBack, onEdit, onDelete }: DetailHeaderProps) {
  return (
    <header className="detail-header">
      <button className="detail-header__back" aria-label="뒤로" onClick={onBack}>
        <ChevronLeft size={20} strokeWidth={1.5} />
      </button>
      <span className="detail-header__title">결</span>
      <div className="detail-header__actions">
        {onEdit && (
          <button className="detail-header__action" aria-label="편집" onClick={onEdit}>
            <Pencil size={17} strokeWidth={1.5} />
          </button>
        )}
        {onDelete && (
          <button className="detail-header__action" aria-label="비우기" onClick={onDelete}>
            <Trash2 size={17} strokeWidth={1.5} />
          </button>
        )}
      </div>
    </header>
  );
}
