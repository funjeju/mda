import type { Timestamp } from './base';
import type { BaseEntity } from './base';

export interface Recording extends BaseEntity {
  storage_url: string;
  file_size_bytes: number;
  duration_seconds: number;

  recorded_at: Timestamp;
  source: 'active' | 'imported';

  transcript: string | null;
  transcript_language: string;
  stt_provider: 'whisper' | 'gemini' | 'ios_native' | 'android_native';

  processing_status: 'pending' | 'transcribing' | 'transcribed' | 'failed';

  daily_entry_id: string | null;

  is_auto_delete_after: number | null;
}
