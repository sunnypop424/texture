import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Camera, Video, Mic, Quote } from 'lucide-react';
import { Button } from '../../components/Button';
import { Sheet } from '../../components/Sheet';
import { useSpaceStore } from '../../lib/spaceStore';
import { useFragmentStore } from '../../lib/fragmentStore';
import { useIdentityStore, getCurrentUser } from '../../lib/identity';
import { acceptInviteRemote } from '../../lib/sharing';
import { pullFromCloud } from '../../lib/syncEngine';
import type { Space } from '../../types/space';
import type { Fragment as FragmentType } from '../../types/fragment';

const ICON = { photo: Camera, video: Video, text: Quote, voice: Mic } as const;

export function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const getInvite = useSpaceStore((s) => s.getInvite);
  const spaces = useSpaceStore((s) => s.spaces);
  const acceptInvite = useSpaceStore((s) => s.acceptInvite);
  const importSpace = useSpaceStore((s) => s.importSpace);
  const setActive = useSpaceStore((s) => s.setActiveSpace);
  const fragments = useFragmentStore((s) => s.fragments);
  const myName = useIdentityStore((s) => s.user.displayName);

  // 같은 기기(초대자)에서 만든 초대는 로컬에 있다. 다른 기기/사용자는 없다 → 서버로 합류.
  const localInvite = token ? getInvite(token) : null;
  const localSpace = localInvite ? spaces.find((s) => s.id === localInvite.spaceId) : null;
  const inviter = localSpace?.members.find((m) => m.userId === localInvite?.invitedBy);
  const localExpired = localInvite ? new Date(localInvite.expiresAt).getTime() < Date.now() : false;

  const [nameOpen, setNameOpen] = useState(false);
  const [joinName, setJoinName] = useState(myName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo<FragmentType[]>(() => {
    if (!localSpace) return [];
    return fragments
      .filter((f) => f.spaceId === localSpace.id)
      .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))
      .slice(0, 4);
  }, [fragments, localSpace]);

  const openNameSheet = () => {
    setJoinName(myName);
    setError(null);
    setNameOpen(true);
  };

  const handleConfirmJoin = async () => {
    if (!token || !joinName.trim()) return;
    // 같은 기기 초대(로컬): 고른 이름으로 합류.
    if (localInvite && localSpace && !localExpired) {
      const result = acceptInvite(localInvite.token, { ...getCurrentUser(), displayName: joinName.trim() });
      setNameOpen(false);
      if (result) {
        setActive(result.id);
        navigate('/');
      }
      return;
    }
    // 다른 기기/사용자: 서버로 합류.
    setBusy(true);
    setError(null);
    const space = await acceptInviteRemote(token, joinName.trim());
    setBusy(false);
    if (!space) {
      setNameOpen(false);
      setError('이 초대 링크는 만료됐거나 더 이상 쓸 수 없어요.');
      return;
    }
    const me = getCurrentUser();
    const withMe: Space = {
      ...space,
      members: space.members.map((m) => (m.userId === me.id ? { ...m, displayName: joinName.trim() } : m)),
    };
    importSpace(withMe);
    setActive(space.id);
    void pullFromCloud(); // 합류한 공간의 결을 불러온다(빈 방 없이 도착)
    setNameOpen(false);
    navigate('/');
  };

  const nameSheet = (
    <Sheet
      open={nameOpen}
      title="이 공간에서 쓸 이름"
      onClose={() => !busy && setNameOpen(false)}
      footer={
        <Button variant="primary" className="btn--block" onClick={handleConfirmJoin} loading={busy} disabled={!joinName.trim()}>
          들어가기
        </Button>
      }
    >
      <div className="create-space">
        <label className="create-space__field">
          <span className="create-space__label">이름</span>
          <input
            type="text"
            className="create-space__input"
            value={joinName}
            onChange={(e) => setJoinName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && joinName.trim() && !busy) void handleConfirmJoin();
            }}
            maxLength={20}
            autoFocus
          />
        </label>
        <p className="create-space__hint">이 공간의 다른 사람에게 이 이름으로 보여요.</p>
      </div>
    </Sheet>
  );

  // ── 같은 기기 초대(미리보기까지) ──
  if (localInvite && localSpace && !localExpired) {
    return (
      <div className="invite-page stack-5">
        <header className="invite-page__header">
          <p className="invite-page__intro">{inviter?.displayName ?? '누군가'}님이 함께 보자고 했어요.</p>
          <h1 className="invite-page__name">{localSpace.name}</h1>
          <p className="invite-page__meta">{localSpace.members.length}명이 함께 쓰는 공간이에요.</p>
        </header>

        {preview.length > 0 && (
          <section>
            <div className="section-sub" style={{ marginBottom: 'var(--space-2)' }}>이 공간에 쌓인 결</div>
            <div className="invite-page__preview">
              {preview.map((f) => {
                const Icon = ICON[f.type];
                return (
                  <div key={f.id} className="invite-page__thumb" aria-label={f.title}>
                    {f.thumbUrl ? <img src={f.thumbUrl} alt="" /> : <Icon size={20} strokeWidth={1.5} aria-hidden />}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <Button variant="primary" className="btn--block" onClick={openNameSheet}>
          들어가기
        </Button>
        {nameSheet}
      </div>
    );
  }

  // ── 다른 기기/사용자 초대(서버로 합류) ──
  if (token && !localInvite) {
    return (
      <div className="invite-page stack-5">
        <header className="invite-page__header">
          <p className="invite-page__intro">함께 보자고 했어요.</p>
          <h1 className="invite-page__name">공유 공간 초대</h1>
          <p className="invite-page__meta">들어가면 이 공간에 쌓인 결을 함께 볼 수 있어요.</p>
        </header>
        {error && <div className="empty">{error}</div>}
        <Button variant="primary" className="btn--block" onClick={openNameSheet} loading={busy}>
          들어가기
        </Button>
        <Button variant="secondary" className="btn--block" onClick={() => navigate('/')} disabled={busy}>
          돌아가기
        </Button>
        {nameSheet}
      </div>
    );
  }

  // ── 만료/잘못된 링크 ──
  return (
    <div className="stack-4">
      <header className="invite-page__header">
        <h1 className="invite-page__name">초대 링크</h1>
      </header>
      <div className="empty">이 초대 링크는 만료됐어요.</div>
      <Button variant="secondary" className="btn--block" onClick={() => navigate('/')}>
        돌아가기
      </Button>
    </div>
  );
}
