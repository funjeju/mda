import type { Timestamp } from './base';
import type { BaseEntity } from './base';

export type IntegrationProvider =
  | 'google_calendar'
  | 'notion'
  | 'gmail'
  | 'google_photos'
  | 'apple_health'
  | 'google_fit'
  | 'slack'
  | 'github';

export interface Integration extends BaseEntity {
  provider: IntegrationProvider;

  access_token_encrypted: string;
  refresh_token_encrypted: string;
  token_expires_at: Timestamp;

  external_user_id: string;
  external_email: string | null;

  scopes: string[];

  last_sync_at: Timestamp | null;
  sync_direction: 'one_way_in' | 'one_way_out' | 'bidirectional';
  sync_status: 'active' | 'paused' | 'error';
  sync_error: string | null;

  config: Record<string, unknown>;
}
