import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase, isCloudEnabled } from './supabase';
import { toProfileRow } from '../types/db';

/**
 * 익명 세션 보장 — 결의 인증은 "조용히, 배경에서"가 원칙이다.
 *
 * 첫 화면은 곧 첫 캡처이고 가입 폼이 없으므로, 로그인은 사용자에게 보이지 않게
 * 익명으로 발급된다. 세션은 localStorage에 캐시되어 새로고침 시 네트워크가 들지 않는다.
 *
 * 동시 호출(부팅 인증 + 첫 sync)이 각각 signInAnonymously를 부르면 익명 사용자가
 * 둘 생겨 uid가 어긋난다(→ created_by ≠ auth.uid()로 RLS 거부). 진행 중인 로그인
 * 프라미스를 공유해 단 한 명만 만들어지도록 직렬화한다.
 *
 * @returns 인증된 사용자 uid. 클라우드 미설정·오프라인·실패 시 null(앱은 로컬로 계속 동작).
 */
let sessionPromise: Promise<string | null> | null = null;

async function resolveSession(supabase: SupabaseClient): Promise<string | null> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const existing = sessionData.session?.user?.id;
    if (existing) return existing;

    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.warn('익명 세션 발급 실패 — 로컬로 계속', error.message);
      return null;
    }
    return data.user?.id ?? null;
  } catch (err) {
    // 오프라인 등 — 다음 트리거(online 복귀)에서 재시도.
    console.warn('익명 세션 확보 실패 — 로컬로 계속', err);
    return null;
  }
}

export function ensureAnonymousSession(): Promise<string | null> {
  if (!isCloudEnabled()) return Promise.resolve(null);
  const supabase = getSupabase();
  if (!supabase) return Promise.resolve(null);

  if (!sessionPromise) {
    sessionPromise = resolveSession(supabase);
    // 실패(null/throw)면 다음 트리거에서 재시도할 수 있도록 캐시를 비운다.
    // 성공하면 같은 uid 프라미스를 계속 공유 → 재로그인·중복 사용자 없음.
    void sessionPromise
      .then((uid) => {
        if (!uid) sessionPromise = null;
      })
      .catch(() => {
        sessionPromise = null;
      });
  }
  return sessionPromise;
}

/**
 * 사용자 프로필(표시 이름)을 서버에 반영. 멱등(upsert).
 * 실패해도 조용히 넘어간다 — 로컬 정체성이 source of truth다.
 */
export async function upsertProfile(uid: string, displayName: string): Promise<void> {
  if (!isCloudEnabled()) return;
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.from('profiles').upsert(toProfileRow(uid, displayName));
  } catch (err) {
    console.warn('프로필 동기화 실패 — 로컬로 계속', err);
  }
}
