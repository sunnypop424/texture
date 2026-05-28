import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Download } from 'lucide-react';
import { Button } from '../../components/Button';
import { useFragmentStore } from '../../lib/fragmentStore';
import { useSpaceStore } from '../../lib/spaceStore';
import { useIdentityStore } from '../../lib/identity';

const NOTIF_KEY = 'gyeol:notif-time:v1';

function readNotifTime(): string {
  if (typeof window === 'undefined') return '21:00';
  try {
    return window.localStorage.getItem(NOTIF_KEY) || '21:00';
  } catch {
    return '21:00';
  }
}

function writeNotifTime(value: string): void {
  try {
    window.localStorage.setItem(NOTIF_KEY, value);
  } catch {
    // ignore
  }
}

export function SettingsPage() {
  const navigate = useNavigate();
  const me = useIdentityStore((s) => s.user);
  const setDisplayName = useIdentityStore((s) => s.setDisplayName);
  const updateMemberDisplayName = useSpaceStore((s) => s.updateMemberDisplayName);
  const fragments = useFragmentStore((s) => s.fragments);
  const spaces = useSpaceStore((s) => s.spaces);

  const [draftName, setDraftName] = useState(me.displayName);
  useEffect(() => setDraftName(me.displayName), [me.displayName]);

  const [notifTime, setNotifTime] = useState<string>(() => readNotifTime());
  useEffect(() => {
    writeNotifTime(notifTime);
  }, [notifTime]);

  const commitName = () => {
    const trimmed = draftName.trim();
    if (!trimmed) {
      setDraftName(me.displayName);
      return;
    }
    if (trimmed === me.displayName) return;
    setDisplayName(trimmed);
    updateMemberDisplayName(me.id, trimmed);
  };

  const handleExport = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      identity: me,
      spaces,
      fragments: fragments.map((f) => ({
        ...f,
        thumbUrl: f.hasLocalMedia ? undefined : f.thumbUrl,
      })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gyeol-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="stack-5">
      <header className="detail-header">
        <button className="detail-header__back" aria-label="뒤로" onClick={() => navigate(-1)}>
          <ChevronLeft size={20} strokeWidth={1.5} />
        </button>
        <span className="detail-header__title">설정</span>
        <span aria-hidden style={{ width: 32 }} />
      </header>

      <SettingsSection title="나" hint="공유 공간에서 다른 멤버에게 이 이름이 보여요.">
        <SettingsRow
          label="이름"
          right={
            <input
              type="text"
              className="settings__input"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                if (e.key === 'Escape') {
                  setDraftName(me.displayName);
                  (e.target as HTMLInputElement).blur();
                }
              }}
              maxLength={20}
              placeholder="이름"
            />
          }
        />
      </SettingsSection>

      <SettingsSection
        title="알림"
        hint="설정한 시간대에 부드러운 알림이 와요. (현재는 시간 선택만 — 실제 발송은 후속에서 연결돼요.)"
      >
        <SettingsRow
          label="하루 한 번"
          right={
            <input
              type="time"
              className="settings__time"
              value={notifTime}
              onChange={(e) => setNotifTime(e.target.value)}
            />
          }
        />
      </SettingsSection>

      <SettingsSection
        title="데이터"
        hint={`${fragments.length}개의 결, ${spaces.length}개의 공간이 저장돼 있어요. 미디어 blob은 내보내기에 포함되지 않아요.`}
      >
        <SettingsRow
          label="내 결 내보내기"
          right={
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExport}
              leadingIcon={<Download size={14} strokeWidth={1.75} aria-hidden />}
            >
              JSON
            </Button>
          }
        />
      </SettingsSection>

      <SettingsSection title="결에 대해">
        <SettingsRow label="버전" value="0.1.0" />
        <SettingsRow label="태그라인" value="가만히 쌓이는, 보통의 날들." />
      </SettingsSection>
    </div>
  );
}

interface SettingsSectionProps {
  title: string;
  hint?: string;
  children: React.ReactNode;
}

function SettingsSection({ title, hint, children }: SettingsSectionProps) {
  return (
    <section className="settings__section">
      <h2 className="settings__section-title">{title}</h2>
      <div className="settings__rows">{children}</div>
      {hint && <p className="settings__hint">{hint}</p>}
    </section>
  );
}

interface SettingsRowProps {
  label: string;
  value?: string;
  right?: React.ReactNode;
}

function SettingsRow({ label, value, right }: SettingsRowProps) {
  return (
    <div className="settings__row">
      <span className="settings__label">{label}</span>
      {right ? (
        <div className="settings__right">{right}</div>
      ) : (
        value && <span className="settings__value">{value}</span>
      )}
    </div>
  );
}
