import { getSupabase, isCloudEnabled } from './supabase';
import { ensureAnonymousSession } from './auth';
import { flush } from './syncEngine';
import { fromSpaceRow, fromSpaceMemberRow, type SpaceRow, type SpaceMemberRow } from '../types/db';
import type { Invite, Space } from '../types/space';

/**
 * 공유 공간 — 서버 기반 비동기 공유.
 *
 * 초대 토큰을 서버에 올려두면(pushInvite), 다른 사용자가 다른 기기에서 그 토큰으로
 * 합류(acceptInviteRemote)할 수 있다. 합류 후 멤버들의 결은 기존 동기화(pull)로
 * 비동기로 채워진다 — 실시간 압박 없이.
 */

/**
 * 초대를 서버에 올린다. 받은 사람이 다른 기기에서 수락할 수 있게 된다.
 * 공유 공간이 아직 서버에 없을 수 있으니 먼저 flush로 공간·멤버를 올린다.
 */
export async function pushInvite(invite: Invite): Promise<void> {
  if (!isCloudEnabled()) return;
  const supabase = getSupabase();
  if (!supabase) return;
  const uid = await ensureAnonymousSession();
  if (!uid) return;
  try {
    await flush(); // 공간·내 멤버십이 서버에 있도록 보장(초대의 FK·RLS 전제)
    // 공유 공간은 로컬 id가 곧 서버 id다(개인 공간만 uid로 매핑됨).
    const { error } = await supabase.from('invites').insert({
      token: invite.token,
      space_id: invite.spaceId,
      invited_by: uid,
      created_at: invite.createdAt,
      expires_at: invite.expiresAt,
    });
    if (error && error.code !== '23505') {
      console.warn('초대 동기화 실패 — 링크가 다른 기기에서 안 열릴 수 있어요', error);
    }
  } catch (err) {
    console.warn('초대 동기화 실패', err);
  }
}

/**
 * 토큰으로 공유 공간에 합류한다(다른 기기/사용자). 합류 후 그 공간의 멤버가 되어
 * 결을 내려받을 수 있다.
 * @returns 합류한 공간(멤버 포함), 실패 시 null.
 */
export async function acceptInviteRemote(token: string, memberName = ''): Promise<Space | null> {
  if (!isCloudEnabled()) return null;
  const supabase = getSupabase();
  if (!supabase) return null;
  await ensureAnonymousSession();
  try {
    const { data, error } = await supabase.rpc('accept_invite', {
      invite_token: token,
      member_name: memberName.trim(),
    });
    if (error || !data) {
      console.warn('초대 수락 실패', error);
      return null;
    }
    const row = data as SpaceRow;
    // 합류했으니 멤버 목록을 읽을 수 있다(표시 이름은 추후 profiles로 보강).
    const { data: memberRows } = await supabase
      .from('space_members')
      .select('*')
      .eq('space_id', row.id);
    const members = ((memberRows ?? []) as SpaceMemberRow[]).map(fromSpaceMemberRow);
    return fromSpaceRow(row, members);
  } catch (err) {
    console.warn('초대 수락 실패', err);
    return null;
  }
}

/** 토큰의 실제 사용자(= 서버 auth.uid()). 없으면 세션 uid. */
async function authUid(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const session = await ensureAnonymousSession();
  try {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? session;
  } catch {
    return session;
  }
}

/**
 * 공유 공간 떠나기(서버). 내 결은 개인 공간으로 옮기고(보존), 내 멤버십을 지운다.
 * 순서 중요 — 멤버십을 지우면 더 이상 결을 옮길 권한이 없으므로 옮기기를 먼저.
 */
export async function leaveSpaceRemote(serverSpaceId: string): Promise<void> {
  if (!isCloudEnabled()) return;
  const supabase = getSupabase();
  if (!supabase) return;
  const uid = await authUid();
  if (!uid) return;
  try {
    // 내 결 → 개인 공간(서버 id = uid). 아직 멤버라 update 권한 있음.
    await supabase.from('fragments').update({ space_id: uid }).eq('space_id', serverSpaceId).eq('author_id', uid);
    // 내 멤버십 제거.
    await supabase.from('space_members').delete().eq('space_id', serverSpaceId).eq('user_id', uid);
  } catch (err) {
    console.warn('공간 떠나기 동기화 실패', err);
  }
}

/**
 * 공유 공간 지우기(owner, 서버). 내 결은 개인 공간으로 옮긴 뒤 공간을 삭제한다.
 * 공간 삭제는 남은 멤버십·다른 결·초대를 함께 정리(FK cascade).
 */
export async function closeSpaceRemote(serverSpaceId: string): Promise<void> {
  if (!isCloudEnabled()) return;
  const supabase = getSupabase();
  if (!supabase) return;
  const uid = await authUid();
  if (!uid) return;
  try {
    await supabase.from('fragments').update({ space_id: uid }).eq('space_id', serverSpaceId).eq('author_id', uid);
    await supabase.from('spaces').delete().eq('id', serverSpaceId); // cascade로 나머지 정리
  } catch (err) {
    console.warn('공간 지우기 동기화 실패', err);
  }
}

/** 이 공간에서 내 표시 이름을 바꾼다(서버). 다른 멤버에게도 이 이름으로 보인다. */
export async function updateMyMemberName(serverSpaceId: string, name: string): Promise<void> {
  if (!isCloudEnabled()) return;
  const supabase = getSupabase();
  if (!supabase) return;
  await ensureAnonymousSession();
  try {
    // 직접 update 대신 RPC — 본인 멤버 행의 display_name만 안전하게 바꾼다.
    await supabase.rpc('set_member_name', { target_space: serverSpaceId, member_name: name });
  } catch (err) {
    console.warn('이름 변경 동기화 실패', err);
  }
}

/** owner가 다른 멤버를 내보냄(서버). 그 멤버의 결과 멤버십을 지운다. */
export async function removeMemberRemote(serverSpaceId: string, userId: string): Promise<void> {
  if (!isCloudEnabled()) return;
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.from('fragments').delete().eq('space_id', serverSpaceId).eq('author_id', userId);
    await supabase.from('space_members').delete().eq('space_id', serverSpaceId).eq('user_id', userId);
  } catch (err) {
    console.warn('멤버 내보내기 동기화 실패', err);
  }
}
