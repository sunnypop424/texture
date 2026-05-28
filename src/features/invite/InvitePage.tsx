import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Camera, Video, Mic, Quote } from 'lucide-react';
import { Button } from '../../components/Button';
import { useSpaceStore } from '../../lib/spaceStore';
import { useFragmentStore } from '../../lib/fragmentStore';
import { getCurrentUser } from '../../lib/identity';
import type { Fragment } from '../../types/fragment';

const ICON = { photo: Camera, video: Video, text: Quote, voice: Mic } as const;

export function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const getInvite = useSpaceStore((s) => s.getInvite);
  const spaces = useSpaceStore((s) => s.spaces);
  const acceptInvite = useSpaceStore((s) => s.acceptInvite);
  const setActive = useSpaceStore((s) => s.setActiveSpace);
  const fragments = useFragmentStore((s) => s.fragments);

  const invite = token ? getInvite(token) : null;
  const space = invite ? spaces.find((s) => s.id === invite.spaceId) : null;
  const inviter = space?.members.find((m) => m.userId === invite?.invitedBy);
  const expired = invite ? new Date(invite.expiresAt).getTime() < Date.now() : false;

  const preview = useMemo<Fragment[]>(() => {
    if (!space) return [];
    return fragments
      .filter((f) => f.spaceId === space.id)
      .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))
      .slice(0, 4);
  }, [fragments, space]);

  if (!invite || !space || expired) {
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

  const handleAccept = () => {
    const me = getCurrentUser();
    const result = acceptInvite(invite.token, me);
    if (result) {
      setActive(result.id);
      navigate('/');
    }
  };

  return (
    <div className="invite-page stack-5">
      <header className="invite-page__header">
        <p className="invite-page__intro">
          {inviter?.displayName ?? '누군가'}님이 함께 보자고 했어요.
        </p>
        <h1 className="invite-page__name">{space.name}</h1>
        <p className="invite-page__meta">
          {space.members.length}명이 함께 쓰는 공간이에요.
        </p>
      </header>

      {preview.length > 0 && (
        <section>
          <div className="section-sub" style={{ marginBottom: 'var(--space-2)' }}>
            이 공간에 쌓인 결
          </div>
          <div className="invite-page__preview">
            {preview.map((f) => {
              const Icon = ICON[f.type];
              return (
                <div key={f.id} className="invite-page__thumb" aria-label={f.title}>
                  {f.thumbUrl ? (
                    <img src={f.thumbUrl} alt="" />
                  ) : (
                    <Icon size={20} strokeWidth={1.5} aria-hidden />
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <Button variant="primary" className="btn--block" onClick={handleAccept}>
        들어가기
      </Button>
    </div>
  );
}
