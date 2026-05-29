import { describe, it, expect, beforeEach, vi } from 'vitest';

let rpcResult: { data: unknown; error: unknown } = { data: null, error: null };
let memberRows: Record<string, unknown>[] = [];
const insertCalls: Array<{ table: string; rows: unknown }> = [];

vi.mock('./supabase', () => ({
  isCloudEnabled: () => true,
  getSupabase: () => ({
    rpc: async (_fn: string, _args: unknown) => rpcResult,
    from: (table: string) => ({
      insert: async (rows: unknown) => {
        insertCalls.push({ table, rows });
        return { error: null };
      },
      select: () => ({
        eq: async () => ({ data: memberRows, error: null }),
      }),
    }),
  }),
}));
vi.mock('./auth', () => ({ ensureAnonymousSession: async () => 'uid-inviter' }));
vi.mock('./syncEngine', () => ({ flush: async () => {} }));

import { pushInvite, acceptInviteRemote } from './sharing';
import type { Invite } from '../types/space';

beforeEach(() => {
  rpcResult = { data: null, error: null };
  memberRows = [];
  insertCalls.length = 0;
});

describe('pushInvite', () => {
  it('초대를 invites 테이블에 올린다', async () => {
    const invite: Invite = {
      token: 'tok-1', spaceId: 'shared-1', invitedBy: 'uid-inviter',
      createdAt: '2026-05-28T00:00:00', expiresAt: '2026-06-04T00:00:00',
    };
    await pushInvite(invite);
    const call = insertCalls.find((c) => c.table === 'invites');
    expect(call).toBeTruthy();
    expect((call!.rows as { token: string }).token).toBe('tok-1');
    expect((call!.rows as { space_id: string }).space_id).toBe('shared-1');
  });
});

describe('acceptInviteRemote', () => {
  it('성공 시 공간(+멤버)을 돌려준다', async () => {
    rpcResult = {
      data: { id: 'shared-1', name: '베프방', is_personal: false, created_by: 'uid-inviter', created_at: '2026-05-20T00:00:00' },
      error: null,
    };
    memberRows = [
      { space_id: 'shared-1', user_id: 'uid-inviter', role: 'owner', joined_at: '2026-05-20T00:00:00' },
      { space_id: 'shared-1', user_id: 'uid-me', role: 'member', joined_at: '2026-05-29T00:00:00' },
    ];
    const space = await acceptInviteRemote('tok-1');
    expect(space).toBeTruthy();
    expect(space!.id).toBe('shared-1');
    expect(space!.isPersonal).toBe(false);
    expect(space!.members).toHaveLength(2);
  });

  it('만료/오류면 null', async () => {
    rpcResult = { data: null, error: { message: 'invite_expired' } };
    expect(await acceptInviteRemote('tok-x')).toBeNull();
  });
});
