---
name: firestore-schema-guardian
description: MDA Firestore 스키마 준수 검증. 03_DATA_MODEL.md의 스키마와 컬렉션 구조를 참조하며, 필드 추가·변경·쿼리 작성 시 영향을 검증한다. Firestore 코드 작성 시 로드한다.
---

# Firestore Schema Guardian

## 필수 원칙

1. **BaseEntity 상속** — 모든 문서에 포함:
   ```typescript
   interface BaseEntity {
     id: string;
     team_id: string;
     created_at: Timestamp;
     updated_at: Timestamp;
     created_by: string;       // userId
     deleted_at: Timestamp | null;  // Soft delete
     metadata: Record<string, unknown>;
   }
   ```
2. Team 단위 논리 분리 — 모든 쿼리에 `team_id` where 조건
3. 독립 태스크는 `tasks_independent` 컬렉션 (`project_id` 없는 태스크)
4. **Soft delete 전용** — `deleted_at` 설정, 물리 삭제 금지
5. 새 필드는 optional + 기존 문서 호환 default

## 컬렉션 경로 (정답)

```
✅ teams/{teamId}/projects/{projectId}
✅ teams/{teamId}/projects/{projectId}/sections/{sectionId}
✅ teams/{teamId}/projects/{projectId}/tasks/{taskId}
✅ teams/{teamId}/projects/{projectId}/tasks/{taskId}/comments/{commentId}
✅ teams/{teamId}/tasks_independent/{taskId}
✅ teams/{teamId}/tasks_independent/{taskId}/comments/{commentId}
✅ teams/{teamId}/daily_entries/{entryId}
✅ teams/{teamId}/journal_entries/{entryId}
✅ teams/{teamId}/daily_reports/{reportId}
✅ teams/{teamId}/person_contacts/{contactId}
✅ teams/{teamId}/activity_feed/{activityId}
✅ teams/{teamId}/input_logs/{logId}
✅ users/{userId}/settings/{settingId}
✅ users/{userId}/notifications/{notifId}
✅ users/{userId}/fcm_tokens/{token}
✅ invite_codes/{code}

❌ tasks/{taskId}         — team_id 없음
❌ projects/{projectId}   — team_id 없음
```

## Task 필드 전체 목록

Task 생성 시 반드시 포함해야 하는 필드:

```typescript
{
  // BaseEntity
  id, team_id, created_at, updated_at, created_by, deleted_at, metadata,
  // Task 고유
  title: string,
  description: string | null,
  status: 'todo' | 'in_progress' | 'done' | 'cancelled',
  priority: 'low' | 'normal' | 'high' | 'urgent',
  due_date: Timestamp | null,
  due_time: string | null,          // HH:MM
  start_date: Timestamp | null,
  duration_minutes: number | null,
  project_id: string | null,
  section_id: string | null,
  assignee_id: string | null,
  assignee_name: string | null,
  position: number | null,
  tags: string[],
  reminders: Reminder[],
  decoration: TaskDecoration | null,
  ai_source_entry_id: string | null,
  recurrence: RecurrenceRule | null,
  completed_at: Timestamp | null,
}
```

## 스키마 변경 체크리스트

- [ ] `packages/shared/src/types/` TypeScript 타입 업데이트
- [ ] `packages/shared/src/schemas/` Zod 스키마 업데이트
- [ ] `firestore.rules` Security Rules 업데이트
- [ ] Composite Index 필요 여부 확인 (`firestore.indexes.json`)
- [ ] 마이그레이션 스크립트 필요?
- [ ] 하위 호환성 확인 (기존 문서 영향)
- [ ] `spec/03_DATA_MODEL.md` 업데이트

## 쿼리 원칙

```typescript
// ✅ 항상 team_id + deleted_at 필터
const tasks = query(
  collection(db, `teams/${teamId}/tasks_independent`),
  where('deleted_at', '==', null),
  where('assignee_id', '==', userId),
  orderBy('due_date', 'asc')
);

// ❌ 절대 금지 — N+1
const all = await getDocs(tasksCol);
const mine = all.docs.filter(d => d.data().assignee_id === userId);
```

## Security Rules 패턴

```javascript
// 팀원 읽기, canWrite(member+) 쓰기
allow read: if isMember(teamId);
allow write: if canWrite(teamId);

// 일기: is_private이면 본인만
allow read: if isMember(teamId) &&
  (resource.data.is_private == false ||
   resource.data.created_by == request.auth.uid);

// 오너/어드민만 멤버 관리
allow write: if isTeamOwner(teamId);
```

## 자주 하는 실수

- ❌ `team_id` 없이 쿼리
- ❌ `deleted_at == null` 필터 누락 (소프트 삭제된 것이 보임)
- ❌ Rules 업데이트 누락 (코드는 되는데 클라이언트에서 403)
- ❌ denormalized 필드 동기화 안 함 (`assignee_name` 등)
- ❌ Task 생성 시 필드 누락 (`position`, `reminders`, `decoration` 등)
- ❌ 물리 삭제 (`deleteDoc`) — 반드시 `deleted_at` 설정

## 관련 문서

- `spec/03_DATA_MODEL.md` — 전체 스키마
- `firestore.rules` — 현재 Security Rules
- `packages/shared/src/types/` — TypeScript 타입
