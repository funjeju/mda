# 03. 데이터 모델 (Data Model)

이 문서는 Firestore 스키마와 TypeScript 타입을 정의한다. 모든 개발은 이 스키마를 따라야 한다.

---

## 3.1 설계 원칙

1. **Team 단위 논리 분리** — 모든 데이터는 team_id로 쿼리
2. **개인도 1인 팀** — User 생성 시 자동으로 "personal team" 생성
3. **독립 태스크 지원** — `project_id`는 optional
4. **Soft Delete** — `deleted_at`으로 표시, 실제 삭제 안 함
5. **실시간 동기화** — Firestore onSnapshot 기반
6. **오프라인 지원** — Firestore 자동 캐시
7. **확장 가능** — 미래 필드를 위한 `metadata` JSON 필드 포함
8. **E2E 업그레이드 경로** — 민감 필드는 별도 collection으로 분리 가능

---

## 3.2 Firestore 컬렉션 구조

```
/users/{userId}
/teams/{teamId}
/teams/{teamId}/members/{userId}
/teams/{teamId}/projects/{projectId}
/teams/{teamId}/projects/{projectId}/sections/{sectionId}
/teams/{teamId}/projects/{projectId}/tasks/{taskId}
/teams/{teamId}/tasks_independent/{taskId}   # 독립 태스크
/teams/{teamId}/daily_entries/{entryId}
/teams/{teamId}/journal_entries/{entryId}
/teams/{teamId}/person_contacts/{contactId}
/teams/{teamId}/daily_reports/{reportId}
/teams/{teamId}/recordings/{recordingId}
/teams/{teamId}/attachments/{attachmentId}
/teams/{teamId}/notifications/{notificationId}
/teams/{teamId}/integrations/{provider}
/teams/{teamId}/skills/{skillId}
/users/{userId}/private/settings
/users/{userId}/private/decorations
```

---

## 3.3 공통 필드 (BaseEntity)

모든 엔터티가 상속:

```typescript
interface BaseEntity {
  id: string;                  // UUID v4
  team_id: string;             // 소속 팀
  created_at: Timestamp;
  updated_at: Timestamp;
  created_by: string;          // userId
  deleted_at: Timestamp | null;
  metadata: Record<string, unknown>; // 미래 확장
}
```

---

## 3.4 User

```typescript
interface User extends BaseEntity {
  email: string;
  display_name: string;
  avatar_url: string | null;
  
  // Persona
  persona: 'light' | 'medium' | 'heavy';
  onboarding_completed: boolean;
  
  // Primary team (personal team)
  primary_team_id: string;
  current_team_id: string;      // 현재 보고 있는 팀
  
  // Preferences
  timezone: string;              // "Asia/Seoul"
  language: 'ko' | 'en';
  default_view_mode: ViewMode;
  
  // Subscription
  subscription_tier: 'free' | 'plus' | 'team' | 'business';
  subscription_expires_at: Timestamp | null;
  
  // Notification preferences (high-level)
  notification_enabled: boolean;
  quiet_hours: { start: string; end: string } | null; // "22:00"
}
```

---

## 3.5 Team

```typescript
interface Team extends BaseEntity {
  name: string;
  type: 'personal' | 'collaborative';
  
  // Owner
  owner_id: string;              // userId
  
  // Members (cached count)
  member_count: number;
  
  // Subscription (팀 플랜)
  subscription_tier: 'free' | 'team' | 'business';
  seat_limit: number;
  
  // Branding
  icon: string | null;
  color: string | null;
  
  // Settings
  default_project_theme: string | null;
}

interface TeamMember extends BaseEntity {
  team_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joined_at: Timestamp;
  
  // Activity
  last_active_at: Timestamp;
  
  // Assignable
  is_assignable: boolean;        // 태스크 담당자 지정 가능
}
```

---

## 3.6 Project

```typescript
interface Project extends BaseEntity {
  // Basic
  title: string;
  description: string;
  emoji: string | null;
  color: string | null;
  
  // Hierarchy
  parent_task_id: string | null; // 재귀 만다라트용
  
  // Status
  status: 'planning' | 'active' | 'paused' | 'completed' | 'archived';
  
  // Dates
  start_date: Timestamp | null;
  target_date: Timestamp | null;
  completed_at: Timestamp | null;
  
  // Progress (바텀업 집계, 자동 계산)
  progress_percent: number;       // 0~100
  sections_total: number;
  sections_completed: number;
  tasks_total: number;
  tasks_completed: number;
  
  // Collaboration
  members: string[];             // userIds (participants)
  owner_id: string;              // 프로젝트 오너 (PM)
  
  // Decoration
  theme: ProjectTheme | null;
  
  // AI Context
  ai_generated: boolean;         // AI가 생성했는지
  ai_context: string | null;     // 사용자의 원본 설명
  
  // View defaults
  default_view_mode: ViewMode;
  default_pivot_axis: PivotAxis;
}

type ViewMode = 'list' | 'mandarart' | 'calendar' | 'gantt';
type PivotAxis = 'section' | 'assignee' | 'time';

interface ProjectTheme {
  primary_color: string;
  accent_color: string;
  pattern: string | null;        // 배경 패턴
  cell_style: 'soft' | 'bold' | 'minimal';
}
```

---

## 3.7 Section

```typescript
interface Section extends BaseEntity {
  project_id: string;
  
  title: string;
  description: string;
  emoji: string | null;
  color: string | null;
  
  // Order in mandarart (0~7)
  position: number;
  
  // Progress (자동 계산)
  progress_percent: number;
  tasks_total: number;
  tasks_completed: number;
  
  // Status
  status: 'pending' | 'active' | 'completed';
}
```

---

## 3.8 Task

```typescript
interface Task extends BaseEntity {
  // Optional project association (독립 태스크 지원)
  project_id: string | null;
  section_id: string | null;
  
  // Basic
  title: string;
  description: string;
  emoji: string | null;
  
  // Position in section (0~7, 프로젝트 태스크만)
  position: number | null;
  
  // Assignment
  assignee_id: string | null;    // userId
  assignee_name: string | null;  // 캐시
  
  // Time
  due_date: Timestamp | null;
  due_time: string | null;       // "14:30"
  start_date: Timestamp | null;
  duration_minutes: number | null;
  
  // Time block (Light 유저용, 하루 내 배치)
  time_block: 'morning' | 'afternoon' | 'evening' | 'night' | 'unscheduled' | null;
  
  // Status
  status: 'todo' | 'in_progress' | 'blocked' | 'done' | 'cancelled';
  completed_at: Timestamp | null;
  
  // Priority
  priority: 'low' | 'normal' | 'high' | 'urgent';
  
  // Content
  deliverables: Deliverable[];
  checklist: ChecklistItem[];
  attachments: string[];         // attachmentIds
  
  // Relations
  depends_on: string[];          // taskIds (간트용)
  blocks: string[];              // taskIds
  
  // Recursive
  has_sub_project: boolean;      // 이 task가 하위 프로젝트를 가지는가
  sub_project_id: string | null;
  
  // AI
  ai_generated: boolean;
  ai_confidence: number | null;  // 0~1, 자동 매칭 확신도
  ai_source_entry_id: string | null; // 어느 DailyEntry에서 왔는지
  
  // Decoration (셀 커스텀)
  decoration: TaskDecoration | null;
  
  // Reminder
  reminders: TaskReminder[];
}

interface Deliverable {
  id: string;
  title: string;
  url: string | null;
  type: 'file' | 'link' | 'note';
  completed: boolean;
}

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

interface TaskDecoration {
  emoji: string | null;
  sticker_id: string | null;
  border_color: string | null;
  background_color: string | null;
  background_pattern: string | null;
}

interface TaskReminder {
  id: string;
  offset_minutes: number;        // due_date로부터 분 단위 (-60 = 1시간 전)
  intensity: 'gentle' | 'normal' | 'strong';
  sent_at: Timestamp | null;
}
```

---

## 3.9 DailyEntry (원본 입력)

```typescript
interface DailyEntry extends BaseEntity {
  // Input type
  input_type: 'voice' | 'text' | 'file' | 'conversation' | 'imported';
  
  // Content
  raw_text: string | null;       // 타이핑 또는 STT 결과
  recording_id: string | null;   // 녹음 파일
  attachment_ids: string[];      // 첨부
  
  // Source
  source: 'widget' | 'app' | 'web' | 'share_sheet' | 'siri' | 'external';
  
  // Timestamp (입력 시각)
  entered_at: Timestamp;
  
  // Processing status
  processing_status: 'pending' | 'processing' | 'processed' | 'confirmed' | 'failed';
  processed_at: Timestamp | null;
  
  // AI classification result
  classifications: EntryClassification[];
  
  // User review
  user_confirmed: boolean;
  user_modifications: Record<string, unknown> | null;
  
  // Linked outputs
  created_task_ids: string[];
  created_journal_ids: string[];
  updated_contact_ids: string[];
  
  // Context at time of entry
  location: { lat: number; lng: number } | null;
  device: 'mobile' | 'web' | 'watch' | 'desktop';
}

interface EntryClassification {
  segment: string;               // 원문 일부
  intent: IntentType;
  confidence: number;
  target_type: 'task' | 'project' | 'journal' | 'contact' | 'reminder';
  target_id: string | null;      // 기존 엔터티 매칭
  proposed_action: 'create' | 'update' | 'link';
  proposed_data: Record<string, unknown>;
  user_decision: 'accepted' | 'rejected' | 'modified' | 'pending';
}

type IntentType = 
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
```

---

## 3.10 JournalEntry

```typescript
interface JournalEntry extends BaseEntity {
  // Time
  entry_date: Timestamp;         // 일기 날짜
  
  // Content
  content: string;
  raw_segments: string[];        // 원본 파편들
  
  // Emotion
  emotion: Emotion | null;
  emotion_intensity: number;     // 0~10
  
  // People
  mentioned_contact_ids: string[];
  
  // Location
  location_name: string | null;
  location: { lat: number; lng: number } | null;
  
  // Tags
  tags: string[];
  
  // Source
  source_entry_ids: string[];    // DailyEntry IDs
  
  // Decoration
  sticker_ids: string[];
  background_color: string | null;
  photo_urls: string[];          // 첨부 사진
  
  // Privacy
  is_private: boolean;           // true면 팀원도 못 봄
}

type Emotion = 
  | 'joy' | 'calm' | 'excited'
  | 'anxious' | 'sad' | 'angry'
  | 'tired' | 'grateful' | 'proud'
  | 'neutral';
```

---

## 3.11 PersonContact

```typescript
interface PersonContact extends BaseEntity {
  // Identity
  name: string;
  alternate_names: string[];     // 별칭
  
  // Category
  relationship: string;          // "family", "client", "friend" 등 자유 텍스트
  tags: string[];
  
  // Contact info (optional)
  email: string | null;
  phone: string | null;
  
  // Linked user (MDA 사용자면 연결)
  linked_user_id: string | null;
  
  // History
  first_mentioned_at: Timestamp;
  last_mentioned_at: Timestamp;
  mention_count: number;
  
  // Context history (최근 N개)
  recent_contexts: ContactContext[];
  
  // Reminders
  reminders: ContactReminder[];
  
  // AI-generated summary
  ai_summary: string | null;
  
  // Decoration
  avatar_url: string | null;
  emoji: string | null;
  color: string | null;
}

interface ContactContext {
  date: Timestamp;
  context: string;               // "4/21 카페 방문"
  source_entry_id: string;
}

interface ContactReminder {
  id: string;
  target_date: Timestamp;
  reason: string;
  status: 'pending' | 'fired' | 'dismissed';
}
```

---

## 3.12 DailyReport

```typescript
interface DailyReport extends BaseEntity {
  // Date
  report_date: Timestamp;        // 하루의 date
  generated_at: Timestamp;
  
  // Business section
  business: {
    completed_tasks: string[];   // taskIds
    in_progress_tasks: string[];
    newly_added_tasks: string[];
    tomorrow_tasks: string[];
    
    project_progress: Array<{
      project_id: string;
      progress_delta: number;    // 오늘의 진행률 변화
    }>;
    
    highlights: string[];        // AI 선정 주요 이벤트
  };
  
  // Journal section
  journal: {
    entry_ids: string[];
    emotion_timeline: Array<{
      time: string;              // "09:00"
      emotion: Emotion;
    }>;
    one_liner: string | null;    // AI 생성 "오늘의 한 줄"
    met_contacts: string[];      // contactIds
    thoughts: string[];
  };
  
  // Reminders
  reminders: Array<{
    target_date: Timestamp;
    description: string;
  }>;
  
  // User interaction
  viewed_at: Timestamp | null;
  edits: Record<string, unknown> | null;
  
  // Source traces
  source_entry_ids: string[];
}
```

---

## 3.13 Recording

```typescript
interface Recording extends BaseEntity {
  // Storage
  storage_url: string;           // Firebase Storage URL
  file_size_bytes: number;
  duration_seconds: number;
  
  // Metadata
  recorded_at: Timestamp;
  source: 'active' | 'imported'; // 직접 녹음 vs 통화 녹음 임포트
  
  // Transcription
  transcript: string | null;
  transcript_language: string;
  stt_provider: 'whisper' | 'gemini' | 'ios_native' | 'android_native';
  
  // Processing
  processing_status: 'pending' | 'transcribing' | 'transcribed' | 'failed';
  
  // Link
  daily_entry_id: string | null;
  
  // Privacy
  is_auto_delete_after: number | null; // N일 후 자동 삭제
}
```

---

## 3.14 Attachment

```typescript
interface Attachment extends BaseEntity {
  // Storage
  storage_url: string;
  file_name: string;
  mime_type: string;
  file_size_bytes: number;
  
  // Source
  uploaded_by: string;           // userId
  uploaded_from: 'app' | 'web' | 'widget' | 'share_sheet';
  
  // Extracted content
  extracted_text: string | null; // PDF/이미지 OCR 결과
  thumbnail_url: string | null;
  
  // Link
  linked_task_ids: string[];
  linked_project_ids: string[];
  linked_journal_ids: string[];
}
```

---

## 3.15 Notification

```typescript
interface Notification extends BaseEntity {
  // Target
  user_id: string;
  
  // Content
  title: string;
  body: string;
  icon: string | null;
  
  // Category
  category: NotificationCategory;
  intensity: 'gentle' | 'normal' | 'strong';
  
  // Context
  linked_entity_type: 'task' | 'project' | 'report' | 'contact' | null;
  linked_entity_id: string | null;
  
  // Action
  action_type: 'open' | 'complete' | 'snooze' | 'none';
  action_payload: Record<string, unknown> | null;
  
  // Delivery
  scheduled_for: Timestamp;
  sent_at: Timestamp | null;
  delivery_channel: 'push' | 'email' | 'inapp';
  
  // Interaction
  read_at: Timestamp | null;
  acted_at: Timestamp | null;
  dismissed_at: Timestamp | null;
}

type NotificationCategory = 
  | 'task_due'
  | 'task_reminder'
  | 'project_milestone'
  | 'daily_report_ready'
  | 'contact_reminder'
  | 'team_activity'
  | 'ai_suggestion'
  | 'system';
```

---

## 3.16 Integration

```typescript
interface Integration extends BaseEntity {
  // Provider
  provider: IntegrationProvider;
  
  // Auth
  access_token_encrypted: string;
  refresh_token_encrypted: string;
  token_expires_at: Timestamp;
  
  // User mapping
  external_user_id: string;
  external_email: string | null;
  
  // Scopes
  scopes: string[];
  
  // Sync state
  last_sync_at: Timestamp | null;
  sync_direction: 'one_way_in' | 'one_way_out' | 'bidirectional';
  sync_status: 'active' | 'paused' | 'error';
  sync_error: string | null;
  
  // Provider-specific config
  config: Record<string, unknown>;
}

type IntegrationProvider = 
  | 'google_calendar'
  | 'notion'
  | 'gmail'
  | 'google_photos'
  | 'apple_health'
  | 'google_fit'
  | 'slack'
  | 'github';
```

---

## 3.17 UserPrivate (민감 데이터)

`/users/{userId}/private/` 하위. 팀원도 접근 불가.

```typescript
interface UserSettings {
  // UI
  theme_mode: 'light' | 'dark' | 'system';
  persona_override: 'light' | 'medium' | 'heavy' | null;
  
  // AI
  ai_confirmation_level: 'minimal' | 'normal' | 'strict';
  ai_language_style: 'formal' | 'casual' | 'friendly';
  
  // Notifications (detailed)
  notification_rules: NotificationRule[];
  
  // Daily report
  daily_report_time: string;     // "21:00"
  daily_report_enabled: boolean;
  
  // Privacy
  journal_visibility_default: 'private' | 'team';
  location_tracking: boolean;
  auto_delete_recordings_days: number | null;
}

interface UserDecorations {
  active_theme: string;          // theme ID
  unlocked_themes: string[];
  unlocked_sticker_packs: string[];
  active_stickers: Record<string, string>; // context -> sticker_id
  home_background: string | null;
  
  // Premium assets
  purchased_items: Array<{
    item_id: string;
    purchased_at: Timestamp;
  }>;
}
```

---

## 3.18 Indexes (Firestore)

### Composite Indexes 필수 정의

```
// 팀의 활성 태스크, 마감일 순
tasks: (team_id, deleted_at, status, due_date)

// 프로젝트별 태스크
tasks: (project_id, deleted_at, position)

// 담당자별 태스크
tasks: (team_id, assignee_id, status, due_date)

// 독립 태스크 조회
tasks_independent: (team_id, created_by, deleted_at, due_date)

// 일별 엔트리
daily_entries: (team_id, entered_at DESC)

// 알림
notifications: (user_id, scheduled_for, read_at)

// 일기
journal_entries: (team_id, entry_date DESC, is_private)

// 저녁 보고서
daily_reports: (team_id, report_date DESC)
```

---

## 3.19 Security Rules 개요

상세는 별도 `firestore.rules` 파일.

핵심 원칙:
- 읽기: team_members에 포함된 사용자만
- 쓰기: role에 따라 차등
- `is_private` 일기는 작성자 본인만
- `integrations`의 토큰은 client 읽기 금지 (Cloud Function 경유)

---

## 3.20 실시간 동기화 전략

### 구독 패턴

- **현재 화면에 필요한 데이터만 구독**
- `onSnapshot`으로 실시간 업데이트
- 컴포넌트 언마운트 시 구독 해제

### Denormalization

성능을 위해 일부 필드 복제:
- Task에 `assignee_name` 캐시
- Project에 `tasks_total`, `sections_total` 캐시
- Section에 `progress_percent` 캐시

### 집계 업데이트

Task 상태 변경 시:
1. Task 자체 업데이트
2. Cloud Function 트리거
3. Section.progress_percent 재계산
4. Project.progress_percent 재계산

---

## 3.21 확장 고려 필드

미래 기능을 위해 미리 확보:

- `Task.metadata` — 임의 확장
- `Project.metadata` — 임의 확장
- `User.metadata` — 임의 확장
- `metadata.ai_tags[]` — AI가 붙인 태그
- `metadata.custom_fields{}` — 사용자 정의 필드 (Phase 3+)

---

## 3.22 마이그레이션 전략

스키마 변경 시:
1. `schema_version` 필드 도입
2. Cloud Function으로 점진적 마이그레이션
3. 앱은 하위 호환 유지 (deprecated 필드 읽기 가능)
