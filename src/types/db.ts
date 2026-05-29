import type { Fragment } from './fragment';
import type { Space, SpaceMember } from './space';

/**
 * DB row 타입(snake_case) ↔ 앱 타입(camelCase) 매퍼.
 *
 * Supabase Postgres 테이블 컬럼은 snake_case, 앱 도메인 타입은 camelCase다.
 * 동기화 경로는 여기의 to*Row / from*Row 만 거치게 해 변환을 한 곳에 모은다.
 * 스키마는 supabase/migrations/0001_init.sql 과 일치해야 한다.
 */

// ── profiles ─────────────────────────────────────────────
export interface ProfileRow {
  id: string;
  display_name: string;
  created_at?: string;
}

export function toProfileRow(userId: string, displayName: string): ProfileRow {
  return { id: userId, display_name: displayName };
}

// ── spaces ───────────────────────────────────────────────
export interface SpaceRow {
  id: string;
  name: string;
  is_personal: boolean;
  created_by: string;
  created_at: string;
}

/**
 * @param serverId  로컬 space id가 클라이언트 상수(예: 'personal')일 수 있으므로
 *                  push 직전에 매핑된 서버 UUID를 명시적으로 받는다.
 */
export function toSpaceRow(space: Space, serverId: string): SpaceRow {
  return {
    id: serverId,
    name: space.name,
    is_personal: space.isPersonal,
    created_by: space.createdBy,
    created_at: space.createdAt,
  };
}

// ── space_members ────────────────────────────────────────
export interface SpaceMemberRow {
  space_id: string;
  user_id: string;
  role: 'owner' | 'member';
  joined_at: string;
}

export function toSpaceMemberRow(
  serverSpaceId: string,
  member: SpaceMember,
): SpaceMemberRow {
  return {
    space_id: serverSpaceId,
    user_id: member.userId,
    role: member.role,
    joined_at: member.joinedAt,
  };
}

// ── fragments ────────────────────────────────────────────
export interface FragmentRow {
  id: string;
  space_id: string;
  author_id: string;
  type: Fragment['type'];
  media_path: string | null;
  text_content: string | null;
  title: string;
  captured_at: string;
  day_date: string;
  backfilled: boolean;
  created_at?: string;
}

/**
 * @param serverSpaceId  push 직전에 매핑된 서버 space UUID.
 */
export function toFragmentRow(f: Fragment, serverSpaceId: string): FragmentRow {
  return {
    id: f.id,
    space_id: serverSpaceId,
    author_id: f.authorId,
    type: f.type,
    media_path: f.mediaPath ?? null,
    // text/voice 류는 본문을, 그 외 매체는 제목만. 현재 앱은 title에 담으므로 그대로 둔다.
    text_content: null,
    title: f.title,
    captured_at: f.capturedAt,
    day_date: f.dayDate,
    backfilled: f.backfilled ?? false,
  };
}
