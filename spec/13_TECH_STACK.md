# 13. 기술 스택 & 아키텍처

MDA의 전체 기술 구성과 선택 근거.

---

## 13.1 한 장 요약

```
┌──────────────────────────────────────────────────────┐
│ Frontend                                             │
│   Web:    Next.js 14 + Tailwind + shadcn/ui        │
│   Mobile: Expo SDK + React Native + Tamagui         │
│   상태:   Zustand + TanStack Query                   │
├──────────────────────────────────────────────────────┤
│ Backend (Serverless)                                 │
│   Firebase Cloud Functions (Node.js 20)             │
│   Firestore (DB)                                     │
│   Firebase Storage (파일)                            │
│   Firebase Auth                                      │
│   FCM (푸시)                                         │
├──────────────────────────────────────────────────────┤
│ AI                                                    │
│   Gemini 2.0 Flash / Flash Lite (기본)              │
│   Whisper API (STT 백업)                            │
│   Claude API (Fallback)                             │
├──────────────────────────────────────────────────────┤
│ DevOps                                                │
│   Turborepo (모노레포)                               │
│   GitHub Actions                                     │
│   Vercel (웹)                                        │
│   EAS (모바일)                                       │
│   Firebase (백엔드)                                  │
├──────────────────────────────────────────────────────┤
│ 관측                                                  │
│   Sentry (에러)                                      │
│   PostHog (분석)                                     │
│   Firebase Performance                               │
└──────────────────────────────────────────────────────┘
```

---

## 13.2 프론트엔드 스택 선택 근거

### Next.js 14 (App Router)

- 빠른 빌드, 우수한 DX
- SSR/SSG 혼용 가능
- Vercel 배포 최적화
- Server Components로 렌더 성능
- 한국 커뮤니티·문서 풍부

### Expo (React Native)

- 네이티브 앱 + 크로스 플랫폼
- EAS로 빌드·배포 일원화
- OTA 업데이트
- 웹과 타입·로직 공유 가능
- 위젯·시리 등 네이티브 기능 접근 가능

### Tailwind + shadcn/ui (웹)

- 빠른 UI 개발
- 커스터마이징 자유도
- 디자인 토큰 직접 제어
- 한국 개발자 숙련도 높음

### Tamagui 또는 React Native Paper (모바일)

- 크로스 플랫폼 지원
- 성능 최적화
- shadcn/ui 느낌과 유사한 API

**결정**: 초기엔 **React Native Paper + 커스텀 컴포넌트**, 필요 시 Tamagui 이전 검토.

### Zustand + TanStack Query

- Redux 대비 간결
- Provider hell 없음
- 서버 상태는 TanStack Query가 전담

---

## 13.3 백엔드 스택

### Firebase (주요)

| 서비스 | 용도 |
|--------|------|
| **Firestore** | 주 DB (NoSQL, 실시간) |
| **Cloud Functions** | 서버 로직 (Node.js) |
| **Firebase Auth** | 인증 |
| **Firebase Storage** | 파일 저장 |
| **FCM** | 푸시 알림 |
| **Firebase Hosting** | 정적 호스팅 (옵션) |
| **Firebase Extensions** | 플러그인 |

### 왜 Firebase?

- 빠른 프로토타이핑
- 실시간 동기화 내장
- 인증·스토리지·알림 통합
- 오프라인 지원
- Google Cloud 생태계
- Next Curator 등 기존 프로젝트와 노하우 공유

### 한계 & 대응

- 복잡한 쿼리 제한 → Cloud Functions로 전처리
- 비용 관리 → 인덱스 최적화, 캐싱
- 벤더 락인 → Supabase 마이그레이션 경로 확보 (Phase 3 검토)

---

## 13.4 데이터베이스: Firestore 설계

### 컬렉션 구조

```
/users/{userId}
/teams/{teamId}
  /members/{userId}
  /projects/{projectId}
    /sections/{sectionId}
    /tasks/{taskId}
    /comments/{commentId}
  /tasks_independent/{taskId}
  /daily_entries/{entryId}
  /journal_entries/{entryId}
  /person_contacts/{contactId}
  /daily_reports/{reportId}
  /recordings/{recordingId}
  /attachments/{attachmentId}
  /notifications/{notificationId}
  /integrations/{provider}
/users/{userId}/private/settings
/users/{userId}/private/decorations
```

상세 스키마는 `03_DATA_MODEL.md`.

### Indexes

Composite Indexes 설정 (`firestore.indexes.json`):

```json
{
  "indexes": [
    {
      "collectionGroup": "tasks",
      "fields": [
        { "fieldPath": "team_id", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "due_date", "order": "ASCENDING" }
      ]
    },
    { "...": "..." }
  ]
}
```

### Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
      
      match /private/{document=**} {
        allow read, write: if request.auth.uid == userId;
      }
    }
    
    match /teams/{teamId}/{documents=**} {
      allow read: if isMember(teamId);
      allow write: if hasWritePermission(teamId, resource.data);
    }
    
    function isMember(teamId) {
      return exists(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid));
    }
    
    function hasWritePermission(teamId, data) {
      let member = get(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid));
      return member.role in ['owner', 'admin', 'member'];
    }
  }
}
```

### 초기 버그 회피

**Next Curator 경험**: `getFirestore()` 호출 시 명시적 DB ID 필요한 경우 있음:

```typescript
const db = getFirestore(app, '(default)');
```

Firestore 규칙 업데이트 직후 반영 지연(최대 수분) 주의.

---

## 13.5 AI 스택

### Gemini (주)

| 모델 | 용도 |
|------|------|
| `gemini-2.0-flash-lite` | 분류·매칭·일반 (빠름·저렴) |
| `gemini-2.0-flash` | 프로젝트 분해·보고서·멀티모달 |
| `gemini-1.5-pro` | (옵션) 매우 긴 컨텍스트 필요 시 |

**호출**: `@google/generative-ai` SDK (Node.js)

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ 
  model: 'gemini-2.0-flash-lite',
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: { /* ... */ },
  },
});

const result = await model.generateContent(prompt);
```

### Whisper API (STT 백업)

```typescript
const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
  body: formData, // audio file + language=ko
});
```

### Claude API (Fallback)

Gemini 장애 시 Claude Sonnet으로 fallback:

```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();
const message = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 2048,
  messages: [{ role: 'user', content: prompt }],
});
```

### Prompt 관리

`packages/prompts/` 에 모든 프롬프트 버전 관리 (상세는 `04_AI_AGENT_SPEC.md`).

### 비용 최적화

- 사용자별 월간 토큰 quota
- 캐싱 (동일 프롬프트 결과 재사용)
- 배치 처리 (저녁 보고서는 한번에)
- 분류는 flash-lite, 복잡한 건 flash

---

## 13.6 서버리스 함수 (Cloud Functions)

### 함수 카테고리

```
/functions
  /src
    /http             # HTTP Callable
      processEntry.ts
      generateReport.ts
    /firestore        # Firestore triggers
      onTaskCreate.ts
      onTaskUpdate.ts
    /scheduled        # Cron
      dailyReportCron.ts
      weeklyReportCron.ts
    /auth             # Auth triggers
      onUserCreate.ts
    /pubsub           # Pub/Sub
      notificationDispatcher.ts
    /shared
      ai.ts
      firestore.ts
      utils.ts
```

### 주요 함수

#### `processEntry`

DailyEntry 생성 시 AI 분류 + Entity 생성:

```typescript
export const processEntry = onCall(async (request) => {
  const { entryId } = request.data;
  
  const entry = await getDoc('daily_entries', entryId);
  
  // 1. STT (필요 시)
  if (entry.recording_id) {
    entry.raw_text = await transcribe(entry.recording_id);
  }
  
  // 2. 의도 분류
  const classifications = await classifyIntent(entry.raw_text, context);
  
  // 3. Entity 생성/업데이트
  const created = await createEntitiesFromClassifications(classifications);
  
  // 4. 업데이트
  await updateDoc('daily_entries', entryId, {
    processing_status: 'processed',
    classifications,
    created_task_ids: created.tasks,
    // ...
  });
  
  return { success: true };
});
```

#### `dailyReportCron`

매일 자정 모든 사용자 체크 → 각자 설정 시간에 보고서 생성:

```typescript
export const dailyReportCron = onSchedule('every 5 minutes', async () => {
  const now = new Date();
  const currentTime = formatTime(now);
  
  // 현재 시각이 daily_report_time인 사용자 조회
  const users = await queryUsers({
    daily_report_time: currentTime,
    daily_report_enabled: true,
  });
  
  for (const user of users) {
    await generateDailyReport(user.id);
    await sendReportNotification(user.id);
  }
});
```

#### `onTaskUpdate`

태스크 상태 변경 시 연쇄 업데이트:

```typescript
export const onTaskUpdate = onDocumentUpdated(
  'teams/{teamId}/projects/{projectId}/tasks/{taskId}',
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    
    if (before.status !== after.status) {
      // Section 진행률 재계산
      await recalculateSectionProgress(before.section_id);
      // Project 진행률 재계산
      await recalculateProjectProgress(before.project_id);
      
      // 완료 시 팀 활동 피드
      if (after.status === 'done') {
        await addTeamActivity('task_completed', { taskId: after.id });
      }
    }
  }
);
```

---

## 13.7 상태 관리

### 클라이언트 상태 (Zustand)

```typescript
// packages/shared-hooks/src/stores/useAppStore.ts
import { create } from 'zustand';

interface AppState {
  currentTeamId: string | null;
  persona: 'light' | 'medium' | 'heavy';
  defaultViewMode: ViewMode;
  
  setCurrentTeam: (teamId: string) => void;
  setPersona: (persona: Persona) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentTeamId: null,
  persona: 'medium',
  defaultViewMode: 'list',
  
  setCurrentTeam: (teamId) => set({ currentTeamId: teamId }),
  setPersona: (persona) => set({ persona }),
}));
```

### 서버 상태 (TanStack Query + Firestore)

```typescript
// packages/shared-hooks/src/queries/useTasks.ts
import { useQuery } from '@tanstack/react-query';

export function useTodayTasks(teamId: string) {
  return useQuery({
    queryKey: ['tasks', 'today', teamId],
    queryFn: async () => {
      const today = new Date();
      const q = query(
        collection(db, `teams/${teamId}/tasks_independent`),
        where('due_date', '>=', startOfDay(today)),
        where('due_date', '<=', endOfDay(today))
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as Task);
    },
  });
}
```

실시간 구독 버전:

```typescript
export function useTodayTasksRealtime(teamId: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  
  useEffect(() => {
    const q = query(/* ... */);
    const unsub = onSnapshot(q, (snap) => {
      setTasks(snap.docs.map(d => d.data() as Task));
    });
    return unsub;
  }, [teamId]);
  
  return tasks;
}
```

---

## 13.8 API 설계

### 클라이언트 ↔ Firestore 직접

대부분의 CRUD는 Firestore 직접 (실시간·오프라인).

### 클라이언트 ↔ Cloud Functions

AI 처리·복잡 로직은 함수 경유:

```typescript
import { httpsCallable } from 'firebase/functions';

const processEntry = httpsCallable(functions, 'processEntry');
const result = await processEntry({ entryId });
```

### 외부 → Cloud Functions (Webhook)

- Google Calendar Webhook
- Gmail Webhook
- Notion webhook (옵션)
- Slack events

---

## 13.9 파일 처리

### 업로드

```typescript
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

async function uploadFile(file: File, teamId: string) {
  const storageRef = ref(storage, `teams/${teamId}/uploads/${file.name}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  
  // Attachment entity 생성
  await addDoc(collection(db, `teams/${teamId}/attachments`), {
    storage_url: url,
    file_name: file.name,
    mime_type: file.type,
    // ...
  });
}
```

### 이미지 처리

- 업로드 시 Cloud Function 트리거
- 썸네일 자동 생성
- Vision AI로 텍스트 추출 (옵션)

### 음성 처리

- Recording entity에 storage URL 저장
- Cloud Function으로 STT 실행
- Transcript를 DailyEntry에 연결

---

## 13.10 인증

### Firebase Auth 설정

- Google OAuth (웹 + 모바일)
- Apple Sign In (iOS 필수)
- Email/Password (웹)
- Email Link (Magic Link)
- 카카오 (Phase 2, Custom Token)

### 세션 관리

- Firebase ID Token (1시간 유효)
- Refresh Token (자동 갱신)
- 서버 호출 시 Authorization 헤더

### 커스텀 클레임

```typescript
// Cloud Function
await admin.auth().setCustomUserClaims(userId, {
  primary_team: teamId,
  role: 'owner',
  subscription: 'team',
});
```

Firestore Rules에서 활용.

---

## 13.11 환경 변수 관리

### 클라이언트 (공개 가능)

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
```

### 서버 (비공개)

```env
GEMINI_API_KEY=...
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
STRIPE_SECRET_KEY=...
```

### 관리 방법

- `.env.local` (로컬)
- Vercel Environment Variables (웹)
- Firebase Functions Config (백엔드)
- EAS Secrets (모바일 빌드)

---

## 13.12 테스트

### 단위 테스트

```typescript
// shared/src/utils/__tests__/dateParser.test.ts
import { describe, it, expect } from 'vitest';

describe('parseKoreanDate', () => {
  it('parses "내일"', () => {
    const result = parseKoreanDate('내일');
    expect(result).toBe(tomorrow());
  });
});
```

### 통합 테스트

Firebase Emulator:

```bash
firebase emulators:start --only firestore,functions,auth
```

```typescript
// tests/integration/processEntry.test.ts
describe('processEntry', () => {
  it('creates task from voice input', async () => {
    const entry = await createEntry({ raw_text: '내일 3시 치과' });
    const result = await processEntry({ entryId: entry.id });
    
    const task = await getDoc(result.created_task_ids[0]);
    expect(task.title).toContain('치과');
    expect(task.due_date).toEqual(expectedDate);
  });
});
```

### E2E 테스트

Playwright for 웹:

```typescript
test('user can create task via voice', async ({ page }) => {
  await page.goto('/home');
  await page.click('[aria-label="녹음"]');
  // ... mock audio
  await expect(page.locator('.task-card')).toBeVisible();
});
```

Maestro for 모바일.

---

## 13.13 성능

### 목표

- 앱 시작 ~ 첫 화면: < 2s
- 음성 녹음 → AI 응답: < 10s (30s 녹음 기준)
- 페이지 전환: < 300ms
- 만다라트 렌더: 셀 81개 < 500ms

### 전략

- **코드 스플리팅** (Next.js 자동 + 수동 dynamic import)
- **이미지 최적화** (next/image, Expo Image)
- **Firestore 쿼리 최적화** (인덱스 + limit)
- **React.memo / useMemo** 적극 사용
- **Reanimated** (모바일 60fps 애니메이션)

---

## 13.14 보안

### 데이터 보안

- Firestore Rules
- Storage Rules
- Cloud Functions 권한 체크

### 토큰 보안

- OAuth 토큰 암호화 저장 (KMS)
- Client-side에 노출 금지
- Cloud Function 경유

### 개인정보

- 일기·관계는 UserPrivate 하위
- 건강 데이터 별도 암호화
- 로그에서 PII 마스킹

### 감사

- 모든 쓰기 로그
- 의심스러운 패턴 알림 (Phase 3)

---

## 13.15 E2E 암호화 업그레이드 경로 (Phase 3)

민감 필드 별도 암호화 지원 준비:

```typescript
interface JournalEntry {
  // 일반 필드
  entry_date: Timestamp;
  
  // 암호화 가능 필드
  content_encrypted: string | null;
  content_iv: string | null;
  content_algorithm: 'aes-256-gcm';
}
```

- Client-side 암호화 (Web Crypto API)
- 키는 사용자 기기에만
- Firestore에는 암호문만

현재는 Firebase 기본 암호화에 의존. 사용자 요구 시 활성화.

---

## 13.16 비용 예측

### Phase 1 (소규모, 100 사용자)

| 항목 | 월 예상 |
|------|---------|
| Firebase Firestore | $25 |
| Firebase Functions | $10 |
| Firebase Storage | $5 |
| Gemini API | $50 |
| Whisper API | $20 |
| Vercel Pro | $20 |
| 기타 (Sentry, PostHog) | $20 |
| **합계** | **~$150/월** |

### Phase 3 (1000 사용자)

약 $1500~$2000/월 예상. 유료 전환율 10% 가정 시 BEP 근처.

---

## 13.17 배포 파이프라인

```
Developer → GitHub PR
  ↓
GitHub Actions: Lint + Test
  ↓
Review & Merge to main
  ↓
┌──────────┬──────────┬──────────┐
Vercel    EAS      Firebase
(웹)     (모바일) (백엔드)
  ↓          ↓        ↓
Production 배포 완료
  ↓
Sentry + PostHog 모니터링
```

---

## 13.18 기술 부채 관리

### 로그

- 중요 결정은 ADR (Architecture Decision Records) 작성
- `docs/adr/` 디렉토리

### 리팩토링

- 매 Phase 종료 시 1주일 리팩토링 집중
- Dependency 업데이트 (renovate 또는 수동)

### 의존성 정책

- 메인 의존성은 1개월 이내 업데이트
- 보안 패치 즉시
- 메이저 업데이트는 별도 리서치 후
