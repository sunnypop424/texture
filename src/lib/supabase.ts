import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase 클라이언트 — 환경변수가 설정됐을 때만 활성.
 *
 * 결의 캡처는 항상 오프라인 우선(IndexedDB 낙관적 쓰기)이고, 클라우드는
 * source of truth가 아니라 sync 타깃이다. 따라서 env가 없으면 클라이언트는
 * null이 되고 앱은 기존처럼 순수 로컬로 동작한다(graceful degradation).
 * 모든 클라우드 호출은 isCloudEnabled() 가드 뒤에 둔다.
 */
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

if (url && anonKey) {
  client = createClient(url, anonKey, {
    auth: {
      // 익명 세션을 localStorage에 저장 → 새로고침 시 재인증 네트워크 0.
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

/** 설정됐을 때만 클라이언트를 반환. 미설정이면 null. */
export function getSupabase(): SupabaseClient | null {
  return client;
}

/** 클라우드(Supabase)가 설정돼 있는지. 모든 동기화/인증 경로의 진입 가드. */
export function isCloudEnabled(): boolean {
  return client !== null;
}
