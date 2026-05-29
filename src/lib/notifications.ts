import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { useFragmentStore } from './fragmentStore';
import { getCurrentUser } from './identity';
import { getTodayKey } from './today';

/**
 * 오늘의 결 미등록 알림 (로컬 알림).
 *
 * 사용자가 고른 시간대에, **그날 아직 결을 남기지 않았을 때만** 하루 1회 부드럽게.
 * streak·죄책감 장치 없음(§3) — 한 번 조용히 권할 뿐.
 *
 * 구현: 다음 알림 1건만 예약하고(반복 X), 앱을 열 때마다 상태를 다시 보고 재예약한다.
 *  - 오늘 시간이 안 지났고 + 아직 미등록 → 오늘 그 시간에.
 *  - 이미 등록했거나 시간이 지남 → 내일 그 시간에.
 * 웹에서는 동작하지 않고(APK 전용) 조용히 no-op 한다.
 */
const NOTIF_ID = 1001;
const TIME_KEY = 'gyeol:notif-time:v1';
const ENABLED_KEY = 'gyeol:notif-enabled:v1';

function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function getNotifTime(): string {
  try {
    return window.localStorage.getItem(TIME_KEY) || '21:00';
  } catch {
    return '21:00';
  }
}

export function setNotifTime(value: string): void {
  try {
    window.localStorage.setItem(TIME_KEY, value);
  } catch {
    // ignore
  }
}

export function notifEnabled(): boolean {
  try {
    return window.localStorage.getItem(ENABLED_KEY) === '1';
  } catch {
    return false;
  }
}

export function setNotifEnabled(on: boolean): void {
  try {
    window.localStorage.setItem(ENABLED_KEY, on ? '1' : '0');
  } catch {
    // ignore
  }
}

/** 알림 권한 요청. 허용되면 true. 웹/거부 시 false. */
export async function requestNotifPermission(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const res = await LocalNotifications.requestPermissions();
    return res.display === 'granted';
  } catch {
    return false;
  }
}

function loggedToday(): boolean {
  const today = getTodayKey();
  const me = getCurrentUser();
  return useFragmentStore
    .getState()
    .fragments.some((f) => f.dayDate === today && f.authorId === me.id);
}

function nextReminderAt(time: string): Date {
  const [h, m] = time.split(':').map((n) => parseInt(n, 10));
  const now = new Date();
  const at = new Date(now);
  at.setHours(Number.isFinite(h) ? h : 21, Number.isFinite(m) ? m : 0, 0, 0);
  // 시간이 지났거나 오늘 이미 남겼으면 내일로.
  if (at.getTime() <= now.getTime() || loggedToday()) {
    at.setDate(at.getDate() + 1);
  }
  return at;
}

/**
 * 현재 상태에 맞춰 다음 알림을 재예약한다. 앱 실행·결 추가·설정 변경 때마다 호출.
 */
export async function syncReminder(): Promise<void> {
  if (!isNative()) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: NOTIF_ID }] });
    if (!notifEnabled()) return;
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') return;
    await LocalNotifications.schedule({
      notifications: [
        {
          id: NOTIF_ID,
          title: '결',
          body: '오늘 하루, 무엇이든 한 결 남겨볼까요?',
          schedule: { at: nextReminderAt(getNotifTime()) },
        },
      ],
    });
  } catch (err) {
    console.warn('알림 예약 실패', err);
  }
}

/** 알림이 실제로 동작하는 환경인지(APK). 설정 화면 안내용. */
export function notifSupported(): boolean {
  return isNative();
}
