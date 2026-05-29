import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CloudUpload, CloudDownload, Download, Lock } from 'lucide-react';
import { Button } from '../../components/Button';
import { Sheet } from '../../components/Sheet';
import { Segmented } from '../../components/Segmented';
import { useFragmentStore } from '../../lib/fragmentStore';
import { useSpaceStore } from '../../lib/spaceStore';
import { useIdentityStore } from '../../lib/identity';
import { loadMediaBlob, saveMedia } from '../../lib/mediaStore';
import {
  pushBackup,
  pullBackup,
  listBackups,
  type CloudBackupSummary,
} from '../../lib/cloudBackup';
import { readTheme, writeTheme, type Theme } from '../../lib/theme';
import type { Fragment } from '../../types/fragment';
import type { Space } from '../../types/space';

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

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
  const importFragments = useFragmentStore((s) => s.importFragments);
  const spaces = useSpaceStore((s) => s.spaces);
  const importSpace = useSpaceStore((s) => s.importSpace);

  const [draftName, setDraftName] = useState(me.displayName);
  useEffect(() => setDraftName(me.displayName), [me.displayName]);

  const [notifTime, setNotifTime] = useState<string>(() => readNotifTime());
  useEffect(() => {
    writeNotifTime(notifTime);
  }, [notifTime]);

  const [theme, setTheme] = useState<Theme>(() => readTheme());
  const changeTheme = (next: Theme) => {
    setTheme(next);
    writeTheme(next);
  };

  const [backupOpen, setBackupOpen] = useState(false);
  const [backingUp, setBackingUp] = useState(false);

  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [cloudList, setCloudList] = useState<CloudBackupSummary[] | null>(null);

  const [exporting, setExporting] = useState(false);
  const [dataMsg, setDataMsg] = useState<string | null>(null);

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

  // ── 무료 내보내기: 내 모든 결을 원본 미디어까지 담아 파일로 내려받는다 (결제 무관) ──
  const exportAll = async () => {
    setExporting(true);
    setDataMsg(null);
    try {
      const exported = await Promise.all(
        fragments.map(async (f) => {
          if (!f.hasLocalMedia) return { ...f };
          const blob = await loadMediaBlob(f.id);
          return blob
            ? { ...f, thumbUrl: await blobToDataUrl(blob) }
            : { ...f, thumbUrl: undefined };
        }),
      );
      const data = {
        exportedAt: new Date().toISOString(),
        author: me,
        spaces,
        fragments: exported,
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
      setDataMsg(`${exported.length}개의 결을 파일로 내려받았어요.`);
    } catch (err) {
      console.warn('export failed', err);
      setDataMsg('내보내기에 실패했어요. 잠시 뒤 다시 시도해 주세요.');
    } finally {
      setExporting(false);
    }
  };

  // ── 백업: 선택한 공간을 클라우드로 올린다 (원본 미디어 포함) ──
  const runBackup = async (space: Space) => {
    const spaceFragments = fragments.filter((f) => f.spaceId === space.id);
    const backupFragments = await Promise.all(
      spaceFragments.map(async (f) => {
        if (!f.hasLocalMedia) return { ...f };
        const mediaBlob = await loadMediaBlob(f.id);
        if (!mediaBlob) return { ...f, thumbUrl: undefined };
        return { ...f, thumbUrl: await blobToDataUrl(mediaBlob) };
      }),
    );
    await pushBackup({
      backedUpAt: new Date().toISOString(),
      author: me,
      space,
      fragments: backupFragments,
    });
  };

  const handleSelectSpace = async (space: Space) => {
    if (space.plan) {
      setBackupOpen(false);
      setBackingUp(true);
      setDataMsg(null);
      try {
        await runBackup(space);
        setDataMsg(`‘${space.name}’ 공간을 클라우드에 백업했어요.`);
      } catch (err) {
        console.warn('backup failed', err);
        setDataMsg('백업에 실패했어요. 잠시 뒤 다시 시도해 주세요.');
      } finally {
        setBackingUp(false);
      }
    }
    // 무료 공간은 BackupSheet 안에서 안내만 한다(여기로 오지 않음).
  };

  // ── 복원: 클라우드에 올라간 백업 목록을 열고, 고른 공간을 되살린다 ──
  const openRestore = async () => {
    setRestoreOpen(true);
    setCloudList(null);
    try {
      setCloudList(await listBackups());
    } catch (err) {
      console.warn('list backups failed', err);
      setCloudList([]);
    }
  };

  const handleSelectRestore = async (summary: CloudBackupSummary) => {
    setRestoreOpen(false);
    setRestoring(true);
    setDataMsg(null);
    try {
      const backup = await pullBackup(summary.spaceId);
      if (!backup) {
        setDataMsg('클라우드에서 백업을 찾지 못했어요.');
        return;
      }
      if (backup.space) importSpace(backup.space);
      // data URL로 담긴 사진·영상·음성 원본을 다시 로컬 미디어로 복원.
      const restored: Fragment[] = await Promise.all(
        backup.fragments.map(async (f) => {
          if (typeof f.thumbUrl === 'string' && f.thumbUrl.startsWith('data:')) {
            const blob = await (await fetch(f.thumbUrl)).blob();
            const url = await saveMedia(f.id, blob);
            return { ...f, thumbUrl: url, hasLocalMedia: true };
          }
          return { ...f };
        }),
      );
      const added = importFragments(restored);
      const skipped = restored.length - added;
      setDataMsg(
        added > 0
          ? `‘${summary.spaceName}’에서 ${added}개의 결을 되살렸어요.${skipped > 0 ? ` (이미 있던 ${skipped}개는 건너뛰었어요.)` : ''}`
          : '이미 모두 가지고 있는 결이라 새로 추가된 건 없어요.',
      );
    } catch (err) {
      console.warn('restore failed', err);
      setDataMsg('복원에 실패했어요. 잠시 뒤 다시 시도해 주세요.');
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
            ? '사진·영상 원본까지 담아 파일을 만드는 중이에요…'
            : backingUp
              ? '사진·영상 원본까지 클라우드에 올리는 중이에요…'
              : restoring
                ? '클라우드에서 결을 되살리는 중이에요…'
                : dataMsg
                  ? dataMsg
                  : `${fragments.length}개의 결, ${spaces.length}개의 공간이 저장돼 있어요. 내 결 내려받기는 늘 무료, 클라우드 백업·복원은 Plus예요.`
        }
      >
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
        <SettingsRow
          label="백업하기"
          right={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setBackupOpen(true)}
              loading={backingUp}
              leadingIcon={<CloudUpload size={14} strokeWidth={1.75} aria-hidden />}
            >
              공간 선택
            </Button>
          }
        />
        <SettingsRow
          label="복원하기"
          right={
            <Button
              variant="secondary"
              size="sm"
              onClick={openRestore}
              loading={restoring}
              leadingIcon={<CloudDownload size={14} strokeWidth={1.75} aria-hidden />}
            >
              클라우드에서
            </Button>
          }
        />
      </SettingsSection>

      <SettingsSection title="결에 대해">
        <SettingsRow label="버전" value="0.1.0" />
        <SettingsRow label="태그라인" value="가만히 쌓이는, 보통의 날들." />
      </SettingsSection>

      <BackupSheet
        open={backupOpen}
        spaces={spaces}
        fragments={fragments}
        onClose={() => setBackupOpen(false)}
        onSelect={handleSelectSpace}
      />

      <RestoreSheet
        open={restoreOpen}
        list={cloudList}
        onClose={() => setRestoreOpen(false)}
        onSelect={handleSelectRestore}
      />
    </div>
  );
}

const PLAN_TIER_LABEL: Record<NonNullable<Space['plan']>['tier'], string> = {
  'plus-personal': 'Plus · 개인',
  'group-pair': 'Plus · 그룹·페어',
};

function formatSince(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

function formatBackedUpAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(
    d.getDate(),
  ).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

interface BackupSheetProps {
  open: boolean;
  spaces: Space[];
  fragments: { spaceId: string }[];
  onClose: () => void;
  onSelect: (space: Space) => void;
}

function BackupSheet({ open, spaces, fragments, onClose, onSelect }: BackupSheetProps) {
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    if (!open) setNote(null);
  }, [open]);

  return (
    <Sheet open={open} title="백업할 공간" onClose={onClose}>
      <p className="backup-sheet__intro">
        공간별 플랜과 결제내역을 확인하고, 클라우드에 백업할 공간을 골라요. Plus 플랜이 켜진 공간은 바로 백업돼요.
      </p>
      <ul className="backup-sheet__list">
        {spaces.map((space) => {
          const count = fragments.filter((f) => f.spaceId === space.id).length;
          const paid = !!space.plan;
          return (
            <li key={space.id}>
              <button
                type="button"
                className="backup-sheet__row"
                onClick={() =>
                  paid
                    ? onSelect(space)
                    : setNote(`‘${space.name}’은 아직 무료 플랜이에요. 백업은 Plus 플랜에서 곧 열려요.`)
                }
              >
                <span className="backup-sheet__main">
                  <span className="backup-sheet__name">
                    {space.name}
                    <span className="backup-sheet__count"> · 결 {count}개</span>
                  </span>
                  <span className="backup-sheet__billing">
                    {paid ? (
                      <>
                        <span className="backup-sheet__badge backup-sheet__badge--paid">
                          {PLAN_TIER_LABEL[space.plan!.tier]}
                        </span>
                        <span className="backup-sheet__billing-detail">
                          {space.plan!.priceLabel} · {formatSince(space.plan!.since)}부터 이용 중
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="backup-sheet__badge">무료 플랜</span>
                        <span className="backup-sheet__billing-detail">
                          백업은 플랜에서 열려요
                        </span>
                      </>
                    )}
                  </span>
                </span>
                <span className="backup-sheet__action" aria-hidden>
                  {paid ? (
                    <CloudUpload size={16} strokeWidth={1.75} />
                  ) : (
                    <Lock size={15} strokeWidth={1.75} />
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {note && <p className="backup-sheet__note">{note}</p>}
    </Sheet>
  );
}

interface RestoreSheetProps {
  open: boolean;
  list: CloudBackupSummary[] | null;
  onClose: () => void;
  onSelect: (summary: CloudBackupSummary) => void;
}

function RestoreSheet({ open, list, onClose, onSelect }: RestoreSheetProps) {
  return (
    <Sheet open={open} title="클라우드에서 복원" onClose={onClose}>
      <p className="backup-sheet__intro">
        클라우드에 백업된 공간을 골라 되살려요. 사진·영상 원본까지 함께 복원돼요.
      </p>
      {list === null ? (
        <p className="backup-sheet__placeholder">클라우드를 확인하는 중이에요…</p>
      ) : list.length === 0 ? (
        <p className="backup-sheet__placeholder">아직 클라우드에 백업된 공간이 없어요.</p>
      ) : (
        <ul className="backup-sheet__list">
          {list.map((b) => (
            <li key={b.spaceId}>
              <button type="button" className="backup-sheet__row" onClick={() => onSelect(b)}>
                <span className="backup-sheet__main">
                  <span className="backup-sheet__name">
                    {b.spaceName}
                    <span className="backup-sheet__count"> · 결 {b.count}개</span>
                  </span>
                  <span className="backup-sheet__billing">
                    <span className="backup-sheet__billing-detail">
                      {formatBackedUpAt(b.backedUpAt)} 백업
                    </span>
                  </span>
                </span>
                <span className="backup-sheet__action" aria-hidden>
                  <CloudDownload size={16} strokeWidth={1.75} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
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
