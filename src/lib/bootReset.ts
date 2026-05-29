import { keys as idbKeys, del as idbDel } from 'idb-keyval';

/**
 * 1회성 전체 초기화.
 * RESET_VERSION이 바뀌면 다음 부팅 때 딱 한 번 모든 로컬 저장소
 * (localStorage의 gyeol:/jogak: 키 + IndexedDB의 모든 결·공간·미디어)를 비운다.
 * 그 뒤 버전 플래그를 남겨, 이후 로드부터는 정상적으로 사용자 데이터를 보존한다.
 *
 * 스토어가 저장소를 읽기 전에 실행되어야 하므로 main.tsx에서 가장 먼저 await한다.
 */
const RESET_FLAG = 'gyeol:reset-version';
const RESET_VERSION = '2026-05-29-full-wipe';

export async function runBootReset(): Promise<void> {
  if (typeof window === 'undefined') return;

  let alreadyDone = false;
  try {
    alreadyDone = window.localStorage.getItem(RESET_FLAG) === RESET_VERSION;
  } catch {
    return; // 저장소 접근 불가(프라이빗 모드 등) — 초기화 생략
  }
  if (alreadyDone) return;

  // 1) localStorage — gyeol:/jogak: 접두 키 전부 제거
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key && (key.startsWith('gyeol:') || key.startsWith('jogak:'))) {
        toRemove.push(key);
      }
    }
    toRemove.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // ignore
  }

  // 2) IndexedDB(idb-keyval 기본 store) — 결·공간·미디어 blob 등 모든 키 제거
  try {
    const allKeys = await idbKeys();
    await Promise.all(allKeys.map((key) => idbDel(key)));
  } catch {
    // ignore
  }

  // 3) 초기화 완료 표시 (위 wipe 이후에 써야 살아남는다)
  try {
    window.localStorage.setItem(RESET_FLAG, RESET_VERSION);
  } catch {
    // ignore
  }
}
