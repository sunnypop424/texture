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

export interface AuthInfo {
  uid: string | null;
  email: string | null;
  /** 익명(이메일 미연결) 여부. 클라우드 미설정이면 true 취급. */
  isAnonymous: boolean;
}

/** 현재 세션의 계정 상태 — 설정 화면에서 "익명 / 이메일 연결됨"을 보여주기 위함. */
export async function getAuthInfo(): Promise<AuthInfo> {
  const supabase = getSupabase();
  if (!supabase) return { uid: null, email: null, isAnonymous: true };
  try {
    const { data } = await supabase.auth.getUser();
    const u = data.user;
    return {
      uid: u?.id ?? null,
      email: u?.email ?? null,
      isAnonymous: u?.is_anonymous ?? !u?.email,
    };
  } catch {
    return { uid: null, email: null, isAnonymous: true };
  }
}

interface AuthActionResult {
  ok: boolean;
  error?: string;
}

/**
 * 현재 익명 계정에 이메일을 연결(저장)한다. 같은 uid를 유지하므로 기존 결이 그대로
 * 그 이메일 계정의 것이 된다. 확인 메일의 링크를 누르면 연결이 완료된다.
 */
export async function linkEmail(email: string): Promise<AuthActionResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: '클라우드가 연결돼 있지 않아요.' };
  try {
    const { error } = await supabase.auth.updateUser({ email });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : '알 수 없는 오류' };
  }
}

/**
 * 다른 기기에서 쓰던 계정으로 로그인(매직 링크). 메일의 링크를 누르면 그 계정으로
 * 전환되고, 내려받기로 아카이브가 복원된다.
 */
export async function signInWithEmail(email: string): Promise<AuthActionResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: '클라우드가 연결돼 있지 않아요.' };
  try {
    const emailRedirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : '알 수 없는 오류' };
  }
}

/**
 * 카카오로 "잇기" — 현재 익명 계정에 카카오를 연결(link)한다. 같은 uid 유지라 기존 결이
 * 그대로 그 카카오 계정의 것이 된다. (부모님 등 이메일이 어려운 사용자를 위한 1급 경로.)
 * 카카오 페이지로 이동했다가 돌아온다.
 */
export async function linkKakao(): Promise<AuthActionResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: '클라우드가 연결돼 있지 않아요.' };
  try {
    const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
    const { error } = await supabase.auth.linkIdentity({ provider: 'kakao', options: { redirectTo } });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : '알 수 없는 오류' };
  }
}

/**
 * 카카오로 "불러오기" — 다른 기기에서 쓰던 카카오 계정으로 로그인. 그 계정의 아카이브가
 * 내려받기(pull)로 복원된다.
 */
export async function signInWithKakao(): Promise<AuthActionResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: '클라우드가 연결돼 있지 않아요.' };
  try {
    const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'kakao', options: { redirectTo } });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : '알 수 없는 오류' };
  }
}

/** 로그아웃 — 세션을 비운다. 로컬에 저장된 결은 그대로 남는다(과거 열람은 항상 무료). */
export async function signOutCloud(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.auth.signOut();
  } catch {
    // ignore
  }
}

/**
 * 세션 사용자(uid) 변화를 구독한다. 매직 링크 로그인 등으로 계정이 바뀌면 콜백한다.
 * @returns 구독 해제 함수.
 */
export function onAuthUserChange(cb: (uid: string | null) => void): () => void {
  const supabase = getSupabase();
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    cb(session?.user?.id ?? null);
  });
  return () => data.subscription.unsubscribe();
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
