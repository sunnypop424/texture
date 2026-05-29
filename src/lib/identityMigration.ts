import { useFragmentStore } from './fragmentStore';
import { useSpaceStore } from './spaceStore';
import { useIdentityStore, LOCAL_USER_ID } from './identity';

/**
 * 로컬 기록의 소유자 id를 현재 익명 세션 uid로 재정렬한다.
 *
 * 인증 전에는 'me'로 기록되고, 익명 세션이 확보되면 실제 uid로 바뀌어야 한다.
 * 익명 uid는 (스토리지 초기화·세션 만료 등으로) 바뀔 수 있으므로 "한 번만"이
 * 아니라 매 부팅 시 안전하게 재정렬한다(자가 치유):
 *   - 'me'(인증 전 임시 id)로 남은 기록 → uid
 *   - 개인 공간의 현재 소유자가 이전 uid면 → uid
 * 이미 모두 uid면 아무 것도 바뀌지 않는다(멱등). 순수 로컬 변환이라 오프라인 동작.
 */
export function runIdentityMigration(uid: string): void {
  if (!uid || uid === LOCAL_USER_ID) return;

  const { spaces } = useSpaceStore.getState();
  const personal = spaces.find((s) => s.isPersonal);

  // 로컬 데이터가 묶여 있을 수 있는 '이전 소유자' id 모음.
  const previousOwners = new Set<string>([LOCAL_USER_ID]);
  if (personal && personal.createdBy !== uid) previousOwners.add(personal.createdBy);

  for (const from of previousOwners) {
    if (from === uid) continue;
    useFragmentStore.getState().remapAuthor(from, uid);
    useSpaceStore.getState().remapUser(from, uid);
  }

  useIdentityStore.getState().setAuthUser(uid);
}
