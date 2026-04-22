import type { Timestamp } from './base';
import type { BaseEntity } from './base';

export interface Team extends BaseEntity {
  name: string;
  type: 'personal' | 'collaborative';

  owner_id: string;
  member_count: number;

  subscription_tier: 'free' | 'team' | 'business';
  seat_limit: number;

  icon: string | null;
  color: string | null;

  default_project_theme: string | null;
}

export interface TeamMember extends BaseEntity {
  team_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joined_at: Timestamp;

  last_active_at: Timestamp;
  is_assignable: boolean;
}
