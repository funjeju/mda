import type { BaseEntity } from './base';

export interface Attachment extends BaseEntity {
  storage_url: string;
  file_name: string;
  mime_type: string;
  file_size_bytes: number;

  uploaded_by: string;
  uploaded_from: 'app' | 'web' | 'widget' | 'share_sheet';

  extracted_text: string | null;
  thumbnail_url: string | null;

  linked_task_ids: string[];
  linked_project_ids: string[];
  linked_journal_ids: string[];
}
