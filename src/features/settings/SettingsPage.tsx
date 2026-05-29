import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import JSZip from 'jszip';
import { ChevronLeft, ChevronRight, CloudUpload, CloudDownload, Download } from 'lucide-react';
import { Button } from '../../components/Button';
import { Segmented } from '../../components/Segmented';
import { StorageBar } from '../../components/StorageBar';
import { quotaBytes } from '../../lib/plan';
import { PERSONAL_SPACE_ID } from '../../data/initialSpaces';
import { useFragmentStore } from '../../lib/fragmentStore';
import { useSpaceStore } from '../../lib/spaceStore';
import { useIdentityStore } from '../../lib/identity';
import { loadMediaBlob } from '../../lib/mediaStore';
import { flush, pullFromCloud } from '../../lib/syncEngine';
import { readTheme, writeTheme, type Theme } from '../../lib/theme';
import { isCloudEnabled } from '../../lib/supabase';
import {
  getAuthInfo, linkEmail, signInWithEmail, signOutCloud, linkKakao, signInWithKakao,
  type AuthInfo,
} from '../../lib/auth';
import {
  getNotifTime, setNotifTime as persistNotifTime, notifEnabled, setNotifEnabled,
  requestNotifPermission, syncReminder, notifSupported,
} from '../../lib/notifications';

/** contentType → 파일 확장자(내보내기 ZIP의 미디어 파일명용). */
function extForType(type: string): string {
  if (type.includes('jpeg') || type.includes('jpg')) return 'jpg';
  if (type.includes('png')) return 'png';
  if (type.includes('webp')) return 'webp';
  if (type.includes('gif')) return 'gif';
  if (type.includes('mp4')) return 'mp4';
  if (type.includes('webm')) return 'webm';
  if (type.includes('quicktime') || type.includes('mov')) return 'mov';
  if (type.includes('mpeg') || type.includes('mp3')) return 'mp3';
  if (type.includes('wav')) return 'wav';
  if (type.includes('ogg')) return 'ogg';
  return 'bin';
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

  const [notifTime, setNotifTime] = useState<string>(() => getNotifTime());
  const [notifOn, setNotifOn] = useState<boolean>(() => notifEnabled());
  const [notifMsg, setNotifMsg] = useState<string | null>(null);

  const changeNotifTime = (value: string) => {
    setNotifTime(value);
    persistNotifTime(value);
    void syncReminder();
  };

  const toggleNotif = async () => {
    if (notifOn) {
      setNotifEnabled(false);
      setNotifOn(false);
      setNotifMsg(null);
      void syncReminder(); // 예약 취소
      return;
    }
    const granted = await requestNotifPermission();
    if (!granted) {
      setNotifMsg(
        notifSupported()
          ? '알림 권한이 필요해요. 기기 설정에서 허용해 주세요.'
          : '알림은 앱(설치본)에서 동작해요. 웹에서는 미리 설정만 저장돼요.',
      );
      // 웹: 설정만 저장(설치본에서 활성). 네이티브 거부: 끔 유지.
      if (!notifSupported()) {
        setNotifEnabled(true);
        setNotifOn(true);
      }
      return;
    }
    setNotifEnabled(true);
    setNotifOn(true);
    setNotifMsg(null);
    void syncReminder();
  };

  const [theme, setTheme] = useState<Theme>(() => readTheme());
  const changeTheme = (next: Theme) => {
    setTheme(next);
    writeTheme(next);
  };

  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [dataMsg, setDataMsg] = useState<string | null>(null);

  // ── 계정(이메일 연결/복원) ──
  const cloudOn = isCloudEnabled();
  const personalSpace = spaces.find((s) => s.isPersonal);
  const personalUsed = fragments.reduce(
    (sum, f) => (f.spaceId === PERSONAL_SPACE_ID ? sum + (f.bytes ?? 0) : sum),
    0,
  );
  const [authInfo, setAuthInfo] = useState<AuthInfo | null>(null);
  const [emailDraft, setEmailDraft] = useState('');
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountMsg, setAccountMsg] = useState<string | null>(null);
  // 'link' = 이 기기 기록을 이메일에 잇기(처음). 'restore' = 쓰던 계정 불러오기(다른/새 기기).
  const [accountMode, setAccountMode] = useState<'link' | 'restore'>('link');
  useEffect(() => {
    if (!cloudOn) return;
    void getAuthInfo().then(setAuthInfo);
  }, [cloudOn]);

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailDraft.trim());

  const handleLinkEmail = async () => {
    setAccountBusy(true);
    setAccountMsg(null);
    const res = await linkEmail(emailDraft.trim());
    setAccountBusy(false);
    setAccountMsg(res.ok ? '확인 메일을 보냈어요. 메일의 링크를 누르면 이 이메일로 저장돼요.' : `연결에 실패했어요: ${res.error ?? ''}`);
  };

  const handleSignIn = async () => {
    setAccountBusy(true);
    setAccountMsg(null);
    const res = await signInWithEmail(emailDraft.trim());
    setAccountBusy(false);
    setAccountMsg(res.ok ? '로그인 링크를 보냈어요. 메일의 링크를 누르면 그 계정의 기록을 불러와요.' : `로그인에 실패했어요: ${res.error ?? ''}`);
  };

  const handleKakao = async () => {
    setAccountBusy(true);
    setAccountMsg(null);
    const res = accountMode === 'link' ? await linkKakao() : await signInWithKakao();
    // 성공 시 카카오로 이동(리다이렉트) — 실패할 때만 안내.
    if (!res.ok) {
      setAccountBusy(false);
      setAccountMsg(`카카오 연결에 실패했어요: ${res.error ?? ''} (카카오 로그인이 아직 준비 중일 수 있어요.)`);
    }
  };

  const handleSignOut = async () => {
    setAccountBusy(true);
    await signOutCloud();
    setAuthInfo(await getAuthInfo());
    setAccountBusy(false);
    setAccountMsg('로그아웃했어요. 이 기기에 남긴 기록은 그대로 볼 수 있어요.');
  };

  const submitAccount = accountMode === 'link' ? handleLinkEmail : handleSignIn;

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

  // ── 무료 내보내기: 내 모든 결을 ZIP으로 내려받는다 (결제 무관) ──
  // 미디어는 base64 인라인 대신 ZIP 안에 파일당 바이너리로 담는다(영상까지 안전·효율적).
  const exportAll = async () => {
    setExporting(true);
    setDataMsg(null);
    try {
      const zip = new JSZip();
      const mediaDir = zip.folder('media');
      const manifestFragments = await Promise.all(
        fragments.map(async (f) => {
          // 휴대 불가능한 런타임 값(objectURL)은 빼고(undefined는 JSON에서 생략됨), 미디어는 파일 참조로 대체.
          const meta = { ...f, thumbUrl: undefined };
          if (!f.hasLocalMedia) return meta;
          const blob = await loadMediaBlob(f.id);
          if (!blob) return { ...meta, hasLocalMedia: false };
          const file = `${f.id}.${extForType(blob.type)}`;
          mediaDir?.file(file, blob); // 바이너리 그대로
          return { ...meta, mediaFile: `media/${file}` };
        }),
      );
      const manifest = {
        format: 'gyeol-export',
        version: 1,
        exportedAt: new Date().toISOString(),
        author: me,
        spaces,
        fragments: manifestFragments,
      };
      zip.file('manifest.json', JSON.stringify(manifest, null, 2));

      const out = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      const url = URL.createObjectURL(out);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gyeol-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDataMsg(`${fragments.length}개의 결을 ZIP 파일로 내려받았어요.`);
    } catch (err) {
      console.warn('export failed', err);
      setDataMsg('내보내기에 실패했어요. 잠시 뒤 다시 시도해 주세요.');
    } finally {
      setExporting(false);
    }
  };

  // ── 지금 백업: 자동 동기화를 즉시 한 번 돌린다(무료). 평소엔 캡처 시 자동으로 올라감. ──
  const handleBackupNow = async () => {
    setBackingUp(true);
    setDataMsg(null);
    try {
      await flush();
      setDataMsg('지금까지의 결을 클라우드에 안전하게 보관했어요.');
    } catch (err) {
      console.warn('backup failed', err);
      setDataMsg('백업에 실패했어요. 잠시 뒤 다시 시도해 주세요.');
    } finally {
      setBackingUp(false);
    }
  };

  // ── 불러오기: 클라우드에 보관된 내 기록을 이 기기로 가져온다(무료, 늘 가능). ──
  const handleRestore = async () => {
    setRestoring(true);
    setDataMsg(null);
    try {
      await pullFromCloud();
      setDataMsg('클라우드에 있던 기록을 이 기기로 불러왔어요.');
    } catch (err) {
      console.warn('restore failed', err);
      setDataMsg('불러오기에 실패했어요. 잠시 뒤 다시 시도해 주세요.');
    } finally {
      setRestoring(false);
    }
  };

  useEffect(() => {
    if (!dataMsg) return;
    const t = window.setTimeout(() => setDataMsg(null), 5000);
    return () => window.clearTimeout(t);
  }, [dataMsg]);

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

      {cloudOn && (
        <SettingsSection
          title="다른 기기에서도 보기"
          hint={
            accountMsg
              ? accountMsg
              : authInfo && !authInfo.isAnonymous
                ? '이 계정으로 어느 기기에서든 같은 기록을 볼 수 있어요.'
                : accountMode === 'link'
                  ? '지금 이 기기에 쌓은 기록을 카카오(또는 이메일)에 이어둬요. 그러면 다른 기기·새 기기에서도 똑같이 볼 수 있어요.'
                  : '예전에 이어둔 적이 있다면, 그 카카오(또는 이메일) 계정의 기록을 이 기기로 불러와요.'
          }
        >
          {authInfo && !authInfo.isAnonymous ? (
            <SettingsRow
              label={authInfo.email ? `${authInfo.email} 으로 이어져 있어요` : '계정에 이어져 있어요'}
              right={
                <Button variant="secondary" size="sm" onClick={handleSignOut} loading={accountBusy}>
                  로그아웃
                </Button>
              }
            />
          ) : (
            <>
              <div className="settings__rows" style={{ marginBottom: 'var(--space-2)' }}>
                <Segmented
                  value={accountMode}
                  onChange={(v) => {
                    setAccountMode(v);
                    setAccountMsg(null);
                  }}
                  ariaLabel="계정으로 할 일"
                  options={[
                    { value: 'link', label: '기록 이어두기' },
                    { value: 'restore', label: '쓰던 계정 불러오기' },
                  ]}
                />
              </div>
              <SettingsRow
                label="카카오로"
                right={
                  <Button variant="primary" size="sm" onClick={handleKakao} loading={accountBusy}>
                    {accountMode === 'link' ? '카카오로 잇기' : '카카오로 불러오기'}
                  </Button>
                }
              />
              <SettingsRow
                label="또는 이메일"
                right={
                  <input
                    type="email"
                    className="settings__input"
                    value={emailDraft}
                    onChange={(e) => setEmailDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && isValidEmail && !accountBusy) void submitAccount();
                    }}
                    placeholder="me@example.com"
                    autoComplete="email"
                  />
                }
              />
              <SettingsRow
                label={accountMode === 'link' ? '확인 메일 받기' : '로그인 메일 받기'}
                right={
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={submitAccount}
                    loading={accountBusy}
                    disabled={!isValidEmail}
                  >
                    메일 보내기
                  </Button>
                }
              />
            </>
          )}
        </SettingsSection>
      )}

      <SettingsSection
        title="알림"
        hint={
          notifMsg
            ? notifMsg
            : notifOn
              ? '그날 아직 결을 안 남겼을 때만, 고른 시간에 한 번 부드럽게 알려드려요.'
              : '하루 한 번, 오늘의 결을 잊지 않게 살짝 알려드릴까요? (혼내는 알림은 없어요.)'
        }
      >
        <SettingsRow
          label="오늘의 결 알림"
          right={
            <Button variant={notifOn ? 'secondary' : 'primary'} size="sm" onClick={toggleNotif}>
              {notifOn ? '끄기' : '켜기'}
            </Button>
          }
        />
        {notifOn && (
          <SettingsRow
            label="알림 시간"
            right={
              <input
                type="time"
                className="settings__time"
                value={notifTime}
                onChange={(e) => changeNotifTime(e.target.value)}
              />
            }
          />
        )}
      </SettingsSection>

      <section className="settings__section">
        <h2 className="settings__section-title">테마</h2>
        <div className="theme-control">
          <Segmented
            value={theme}
            onChange={changeTheme}
            ariaLabel="화면 테마"
            options={[
              { value: 'light', label: '라이트' },
              { value: 'dark', label: '다크' },
              { value: 'system', label: '시스템' },
            ]}
          />
        </div>
        <p className="settings__hint">화면 밝기를 고를 수 있어요. ‘시스템’은 기기 설정을 따라가요.</p>
      </section>

      <SettingsSection
        title="결 플랜"
        hint="기록 습관 자체는 영원히 무료예요. Plus·프린트 같은 부가 기능은 천천히 준비하고 있어요."
      >
        <button
          type="button"
          className="settings__row settings__row--button"
          onClick={() => navigate('/plans')}
        >
          <span className="settings__label">결 플랜 보기</span>
          <span className="settings__right">
            <ChevronRight size={16} strokeWidth={1.5} aria-hidden />
          </span>
        </button>
      </SettingsSection>

      <SettingsSection
        title="데이터"
        hint={
          exporting
            ? '사진·영상까지 담아 ZIP 파일을 만드는 중이에요…'
            : backingUp
              ? '클라우드에 안전하게 올리는 중이에요…'
              : restoring
                ? '클라우드에서 기록을 불러오는 중이에요…'
                : dataMsg
                  ? dataMsg
                  : `${fragments.length}개의 결, ${spaces.length}개의 공간이 저장돼 있어요. 결은 남기면 자동으로 안전하게 보관되고(무료), 불러오기도 늘 무료예요. 원본 화질 영구 보관은 공간별 Plus예요.`
        }
      >
        {cloudOn && (
          <StorageBar
            used={personalUsed}
            total={quotaBytes(personalSpace)}
            onUpgrade={() => navigate('/plans')}
          />
        )}
        <SettingsRow
          label="내 결 내려받기"
          right={
            <Button
              variant="secondary"
              size="sm"
              onClick={exportAll}
              loading={exporting}
              leadingIcon={<Download size={14} strokeWidth={1.75} aria-hidden />}
            >
              파일로
            </Button>
          }
        />
        {cloudOn && (
          <>
            <SettingsRow
              label="지금 백업"
              right={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleBackupNow}
                  loading={backingUp}
                  leadingIcon={<CloudUpload size={14} strokeWidth={1.75} aria-hidden />}
                >
                  백업
                </Button>
              }
            />
            <SettingsRow
              label="불러오기"
              right={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleRestore}
                  loading={restoring}
                  leadingIcon={<CloudDownload size={14} strokeWidth={1.75} aria-hidden />}
                >
                  클라우드에서
                </Button>
              }
            />
          </>
        )}
      </SettingsSection>

      <SettingsSection title="결에 대해">
        <SettingsRow label="버전" value="0.1.0" />
        <SettingsRow label="태그라인" value="가만히 쌓이는, 보통의 날들." />
      </SettingsSection>
    </div>
  );
}

interface SettingsSectionProps {
  title?: string;
  hint?: string;
  children: React.ReactNode;
}

function SettingsSection({ title, hint, children }: SettingsSectionProps) {
  return (
    <section className="settings__section">
      {title && <h2 className="settings__section-title">{title}</h2>}
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
