import type { Timestamp } from './base';
import type { BaseEntity } from './base';

export type IntentType =
  | 'task_creation'
  | 'task_update'
  | 'project_creation'
  | 'schedule'
  | 'journal_emotion'
  | 'journal_event'
  | 'contact_mention'
  | 'reminder_set'
  | 'question'
  | 'noise';

export interface EntryClassification {
  segment: string;
  intent: IntentType;
  confidence: number;
  target_type: 'task' | 'project' | 'journal' | 'contact' | 'reminder';
  target_id: string | null;
  proposed_action: 'create' | 'update' | 'link';
  proposed_data: Record<string, unknown>;
  user_decision: 'accepted' | 'rejected' | 'modified' | 'pending';
}

export interface DailyEntry extends BaseEntity {
  input_type: 'voice' | 'text' | 'file' | 'conversation' | 'imported';

  raw_text: string | null;
  recording_id: string | null;
  attachment_ids: string[];

  source: 'widget' | 'app' | 'web' | 'share_sheet' | 'siri' | 'external';

  entered_at: Timestamp;

  processing_status: 'pending' | 'processing' | 'processed' | 'confirmed' | 'failed';
  processed_at: Timestamp | null;

  classifications: EntryClassification[];

  user_confirmed: boolean;
  user_modifications: Record<string, unknown> | null;

  created_task_ids: string[];
  created_journal_ids: string[];
  updated_contact_ids: string[];

  location: { lat: number; lng: number } | null;
  device: 'mobile' | 'web' | 'watch' | 'desktop';
}
