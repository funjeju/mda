import type { Timestamp } from './base';
import type { BaseEntity } from './base';
import type { ViewMode } from './project';

export interface User extends BaseEntity {
  email: string;
  display_name: string;
  avatar_url: string | null;

  persona: 'light' | 'medium' | 'heavy';
  onboarding_completed: boolean;

  primary_team_id: string;
  current_team_id: string;

  timezone: string;
  language: 'ko' | 'en';
  default_view_mode: ViewMode;

  subscription_tier: 'free' | 'plus' | 'team' | 'business';
  subscription_expires_at: Timestamp | null;

  notification_enabled: boolean;
  quiet_hours: { start: string; end: string } | null;
}

export interface UserSettings {
  theme_mode: 'light' | 'dark' | 'system';
  persona_override: 'light' | 'medium' | 'heavy' | null;

  ai_confirmation_level: 'minimal' | 'normal' | 'strict';
  ai_language_style: 'formal' | 'casual' | 'friendly';

  notification_rules: NotificationRule[];

  daily_report_time: string;
  daily_report_enabled: boolean;

  journal_visibility_default: 'private' | 'team';
  location_tracking: boolean;
  auto_delete_recordings_days: number | null;
}

export interface NotificationRule {
  id: string;
  category: string;
  enabled: boolean;
  intensity: 'gentle' | 'normal' | 'strong';
}

export interface UserDecorations {
  active_theme: string;
  unlocked_themes: string[];
  unlocked_sticker_packs: string[];
  active_stickers: Record<string, string>;
  home_background: string | null;

  purchased_items: Array<{
    item_id: string;
    purchased_at: Timestamp;
  }>;
}
