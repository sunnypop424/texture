export interface User {
  id: string;
  displayName: string;
}

export interface SpaceMember {
  userId: string;
  displayName: string;
  role: 'owner' | 'member';
  joinedAt: string;
}

export interface Space {
  id: string;
  name: string;
  isPersonal: boolean;
  createdBy: string;
  createdAt: string;
  members: SpaceMember[];
  /** 공유 공간 시각 식별용 hue. personal은 미설정. */
  color?: string;
}

export interface Invite {
  token: string;
  spaceId: string;
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
  acceptedBy?: string;
}
