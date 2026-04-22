---
name: team-collaboration-patterns
description: 팀 협업 공통 패턴. 초대, 역할 권한, 담당자, 댓글, 피드. 협업 기능 작업 시 로드한다.
---

# Team Collaboration Patterns

## 권한 매트릭스

| 액션 | Owner | Admin | Member | Viewer |
|------|-------|-------|--------|--------|
| 팀 삭제 | ✓ | | | |
| 결제 관리 | ✓ | | | |
| 멤버 초대 | ✓ | ✓ | | |
| 멤버 제거 | ✓ | ✓ | | |
| 프로젝트 생성 | ✓ | ✓ | ✓ | |
| 태스크 생성 | ✓ | ✓ | ✓ | |
| 태스크 완료 | ✓ | ✓ | 담당자만 | |
| 일기 쓰기 | ✓ | ✓ | ✓ (본인만) | |
| 읽기 | ✓ | ✓ | ✓ | ✓ |

## 권한 체크 패턴

```typescript
export function canEditProject(user: User, project: Project, member: TeamMember): boolean {
  // owner/admin은 모든 프로젝트 편집 가능
  if (['owner', 'admin'].includes(member.role)) return true;
  // member는 본인이 만든 프로젝트만
  if (project.created_by === user.id) return true;
  return false;
}

// Firestore Rules: canWrite = owner | admin | member
// 멤버 관리는 isTeamOwner (owner | admin만)
```

## Firestore Rules 핵심

```javascript
function canWrite(teamId) {
  return isMember(teamId) &&
    get(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid))
      .data.role in ['owner', 'admin', 'member'];
}

function isTeamOwner(teamId) {
  return isAuth() &&
    get(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid))
      .data.role in ['owner', 'admin'];
}

// 멤버 컬렉션은 반드시 isTeamOwner만 쓰기 허용 (역할 상승 방지)
match /members/{memberId} {
  allow read: if isMember(teamId);
  allow write: if isTeamOwner(teamId);  // canWrite 아님!
}
```

## 초대 플로우

```typescript
// 1. 이메일 초대
// POST /api/invite/email { inviteLink, recipientEmail, senderName, teamName }

// 2. 초대 코드 생성 (Admin SDK 전용)
// invite_codes/{code}: { team_id, role, expires_at, uses_remaining }

// 3. 수락 (POST /api/invite/accept)
// → 코드 검증 → 팀 멤버 추가 → 환영 알림
```

## 담당자 배정

```typescript
// 태스크에 담당자 지정
await updateDoc(taskRef, {
  assignee_id: userId,
  assignee_name: displayName,   // denormalized (쿼리 성능)
  updated_at: serverTimestamp(),
});

// 알림: 새 담당자에게
// 알림: 이전 담당자에게 (이관 알림)
```

## 댓글 & 멘션

```typescript
interface Comment {
  task_id: string | null;
  author_id: string;
  content: string;
  mentions: string[];           // userId[]
  reactions: Record<string, string[]>;  // emoji → userIds
  deleted_at: Timestamp | null;
}

// @ 입력 시 팀원 자동완성
// 멘션된 userId → 알림 발송
```

## 팀 피드 이벤트 타입

```typescript
type ActivityType =
  | 'task_created' | 'task_completed' | 'task_assigned'
  | 'project_created' | 'section_completed'
  | 'member_joined' | 'comment_added';
```

## 자주 하는 실수

- ❌ `canWrite` (member 포함)로 멤버 관리 — 반드시 `isTeamOwner` 사용
- ❌ team_id 없이 권한 체크
- ❌ project-level override 무시 (Member가 특정 프로젝트 Owner일 수 있음)
- ❌ 일기를 팀원에 노출 (is_private 항상 체크)
- ❌ Viewer에 쓰기 허용

## 관련 문서

- `spec/10_COLLABORATION.md` — 협업 전체 스펙
- `firestore.rules` — 현재 Rules
- `apps/web/app/api/invite/` — 초대 API
