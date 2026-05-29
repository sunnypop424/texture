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

/** 공간에 활성화된 유료 플랜. 개인 공간은 'plus-personal', 공유 공간은 'group-pair'. */
export interface SpacePlan {
  tier: 'plus-personal' | 'group-pair';
  /** 결제 시작 ISO 날짜 */
  since: string;
  /** 표시용 가격 라벨. 예: '₩4,900 / 월' */
  priceLabel: string;
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
  /** 이 공간에 결제된 유료 플랜. 없으면 무료 플랜. */
  plan?: SpacePlan;
}

export interface Invite {
  token: string;
  spaceId: string;
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
  acceptedBy?: string;
}
