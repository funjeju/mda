# MDA — 개발 히스토리 & 이슈 로그

> 날짜 역순 정렬 (최신 위). Claude Code가 이슈 발생·해결·주요 결정 시 여기에 기록한다.

---

## 형식

```
### [YYYY-MM-DD] 제목
- **유형**: 결정 | 이슈 | 해결 | 논의
- **내용**: 무슨 일이 있었는지
- **결과**: 어떻게 됐는지 / 어떤 결정을 내렸는지
- **관련 문서**: 어떤 MD가 영향을 받았는지
```

---

## 2026-04

### [2026-04-22] API 라우트 전수 rate limit 보강 + Zod 스키마 수정 (5차)
- **유형**: 버그 수정 / 보안
- **내용**:
  - **버그** `apps/web/app/api/evening-report/route.ts`: Claude fallback 블록 내 `const claudeKey` 재선언이 outer scope shadow → 중복 선언 제거.
  - **버그** `apps/web/app/api/ai-sections/route.ts`: `z.array(...).length(8)` — 모델이 정확히 8개를 반환하지 못할 경우 502. → `.min(3).max(8)` 으로 완화.
  - **보안** `apps/web/app/api/v1/keys/route.ts` POST: rate limit 없음 → `rateLimit('uid:api-keys', 5, 60_000)` 추가.
  - **보안** 6개 통합 라우트 (google-calendar POST/PUT, notion, gmail, github, google-fit, slack) rate limit 전무 → 각 라우트에 `rateLimit` 추가.
  - **보안** `apps/web/app/api/auth/saml/route.ts`: rate limit 없음 → 추가.
  - **보안** `apps/web/app/api/invite/create`, `invite/accept`, `invite/email`: rate limit 없음 → 추가.
  - **보안** `apps/web/app/api/v1/tasks` GET/POST: Public API Key 기반 — API 키별 `rateLimit` 추가 (GET 60회/분, POST 30회/분).
  - **보안** `apps/web/app/api/billing/checkout`: rate limit 없음 → `rateLimit(uid:checkout, 5, 60_000)` 추가.
- **결과**: 모든 POST/PUT API 라우트에 rate limiting 적용 완료. 브루트포스·API 남용 방지.
- **관련 문서**: 없음

### [2026-04-22] 스펙 전체 검토 및 미구현 항목 구현 (4차)
- **유형**: 기능 구현 / 문서 갱신
- **내용**:
  - **결제** `apps/web/app/api/billing/webhook/route.ts`: `invoice.payment_failed` 핸들러 누락. Stripe 스펙(15_MONETIZATION.md)에 명시된 이벤트 미처리 → `status: 'past_due'` Firestore 업데이트 + 인앱 알림 생성 추가. `collectionGroup('settings')` 쿼리로 customerId → userId 역방향 조회.
  - **Skills 시스템** `/tooling/skills/` 디렉토리 신규 생성: 17_SKILLS_SPEC.md에 명세된 12개 SKILL.md 파일 구현 (mda-domain-knowledge, gemini-prompt-engineering, firestore-schema-guardian, ui-component-library, korean-nlp-helper, mandarart-renderer, voice-input-pipeline, evening-report-composer, notification-planner, team-collaboration-patterns, integration-adapter, stripe-billing-flows).
  - **문서** `spec/00_MASTER.md`: "현재 상태" 섹션이 초기 상태("대기")로 outdated → 실제 Phase 1 완료 항목 반영, 운영 인프라 사용자 액션 목록 추가.
  - **문서** `spec/16_CLAUDE_CODE_GUIDE.md`: Phase 1 진행률 체크리스트 전체 갱신, Skills 시스템 완료 항목 추가.
- **결과**: Stripe 결제 실패 흐름 완성 (payment_failed → past_due → 인앱알림 → Stripe 자동재시도 → deleted → free), Skills 시스템 구축으로 미래 Claude Code 작업 품질 향상 기반 마련.
- **관련 문서**: spec/15_MONETIZATION.md, spec/17_SKILLS_SPEC.md, spec/00_MASTER.md, spec/16_CLAUDE_CODE_GUIDE.md

### [2026-04-22] 보안·버그 전수 점검 (컴포넌트/라우트 3차)
- **유형**: 버그 수정/보안
- **내용**:
  - **보안** `firestore.rules`: `teams/{teamId}/members` 컬렉션에 `canWrite(teamId)`(member 역할 포함) 허용 → 일반 멤버가 다른 멤버 문서를 수정해 역할 상승 가능. `isTeamOwner(teamId)`(오너/어드민만)로 강화.
  - **보안** `apps/web/next.config.js`: 보안 헤더 전무 → `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-DNS-Prefetch-Control` 추가.
  - **버그** `apps/web/app/(app)/projects/page.tsx`: AI 섹션 자동 생성 시 `progress_percent: 0` 누락.
- **결과**: Firestore 역할 상승 공격 차단, HTTP 보안 헤더로 Clickjacking·MIME sniffing 방지.
- **관련 문서**: 없음

### [2026-04-22] 보안·버그 전수 점검 (컴포넌트/라우트 2차)
- **유형**: 버그 수정/보안
- **내용**:
  - **보안** `apps/web/app/api/integrations/slack/route.ts`: `handleSendNotification`에서 `webhookUrl` 검증 없이 임의 URL로 POST 가능 → SSRF. `https://hooks.slack.com/` prefix 검증 추가.
  - **보안** `apps/web/app/api/invite/email/route.ts`: `senderName`·`teamName`이 HTML에 미이스케이프 삽입 → HTML injection. `esc()` 함수로 이스케이프 + `inviteLink`를 앱 도메인 출처 검증.
  - **버그** `apps/web/public/firebase-messaging-sw.js`: `self.__WEB_PUSH_CONFIG`가 메인 스레드에서 설정되지 않아 FCM 초기화 항상 실패 → `message` 이벤트 기반 `FIREBASE_CONFIG` 수신 패턴으로 전환.
  - **버그** `apps/web/lib/notifications/usePushNotifications.ts`: SW 등록 후 Firebase config를 postMessage로 전달하는 `sendSwConfig()` 추가.
  - **버그** `apps/web/lib/hooks/useMonthTasks.ts`: `inMonth` 변수 계산 후 미사용 → 제거.
  - **버그** `apps/web/components/features/feed/TeamActivityFeed.tsx`: `where` import 미사용 → 제거.
  - **버그** `apps/web/app/api/v1/tasks/route.ts`: 태스크 생성 시 `position`, `assignee_name`, `due_time`, `start_date`, `duration_minutes`, `ai_source_entry_id`, `decoration`, `reminders` 누락 → 추가.
  - **버그** `apps/web/app/api/integrations/slack/route.ts`: Slack slash command 태스크 생성에서 동일 누락 필드 추가.
- **결과**: FCM 백그라운드 알림 정상화, SSRF·HTML injection 차단, Task 타입 완전성 확보.
- **관련 문서**: 없음

### [2026-04-22] 패키지 의존성 수정
- **유형**: 버그 수정/인프라
- **내용**:
  - **버그 수정** `apps/web/package.json`: `@mda/prompts`가 API 라우트들에서 import되지만 dependencies에 미등록 → `"*"` 워크스페이스 참조 추가.
  - **버그 수정** `packages/shared/package.json`: zod `^3.25.20` → `^4.3.6` 업데이트. `apps/web`이 zod 4를 사용하는데 shared는 zod 3을 의존해 버전 충돌 발생 가능.
- **결과**: 패키지 의존성 일관성 확보. CI 빌드에서 모듈 해석 오류 방지.
- **관련 문서**: 없음

### [2026-04-22] useTeam 리팩토링 + 데드 코드 제거
- **유형**: 리팩토링/버그 수정
- **내용**:
  - **버그 수정** `useTeam.ts` `useTeamMembers`: 불필요한 `getDocs(membersCol)` 중복 호출(결과 `userSnap` 미사용) 제거. `import('firebase/firestore').then(({ getDoc })` dynamic import → 직접 `getDoc` import로 교체.
  - **데드 코드 제거** `useTeamInvites.createInvite`: Settings 페이지가 서버 API `/api/invite/create`를 직접 호출하므로 미사용. `invite_codes` 최상위 컬렉션에 저장하지 않아 실제 작동 불가능이던 구현 제거.
  - **데드 코드 제거** `acceptInvite` 함수: 클라이언트 SDK로 비멤버가 멤버 추가를 시도하는 Security Rules 위반 구현. 아무도 import하지 않아 사용 안 됨. 전체 제거.
  - **정리** `settings/page.tsx`: `createInvite` destructure 제거.
  - **정리** `useTeam.ts`: 미사용 import(`addDoc`, `updateDoc`, `serverTimestamp`, `doc`, `uuidv4`, `db`, `getDocs`) 제거.
- **결과**: useTeam 훅이 실제 사용 패턴(서버 API)과 일치하게 정리됨. Security Rules 위반 가능성 코드 제거.
- **관련 문서**: 없음

### [2026-04-22] 태스크 생성 필드 일관성 전수 수정 + 알림 타입 확장
- **유형**: 버그 수정/타입 일관성
- **내용**:
  - **버그 수정** `useTasks.ts` `createTask` + 반복 태스크 생성: `external_id: null`, `external_source: null` 누락 추가.
  - **버그 수정** `useSectionTasks.ts` `createTask`: 동일 필드 누락 추가.
  - **버그 수정** `SmartInput.tsx` `handleDirectSave`: `recurrence: null`, `external_id: null`, `external_source: null` 누락 추가.
  - **타입 수정** `packages/shared/src/types/task.ts`: `external_source` 유니온에 `'gmail'` 추가 (gmail 통합 라우트가 이미 저장 중이었으나 타입 오류).
  - **타입 수정** `gmail/route.ts`: `recurrence: null` 누락 추가.
  - **알림 타입 확장** `notifications/page.tsx`: `NotifType`에 `calendar_reminder` 추가, `TYPE_META` 아이콘/색상 추가.
  - **알림 타입 확장** `push/route.ts`: `PushRequest.type`에 `calendar_reminder` 추가.
  - **환경변수** `vercel.json`: `NEXT_PUBLIC_STRIPE_PLUS_PRICE_ID`, `NEXT_PUBLIC_STRIPE_TEAM_PRICE_ID` 추가.
  - **정리** `.env.example`: 미사용 `FCM_SERVER_KEY` 제거 (Admin SDK로 대체됨).
- **결과**: 모든 태스크 생성 경로에서 Firestore 문서 스키마가 Task 타입과 완전히 일치. 캘린더 리마인더 알림이 UI에서 올바르게 표시됨.
- **관련 문서**: 없음

### [2026-04-22] 통합 라우트 보안 + 태스크 타입 완전성 수정
- **유형**: 보안/버그 수정
- **내용**:
  - **🔴 버그 수정** `push/route.ts`: FCM 토큰을 `users/{uid}.fcm_token` 단일 필드에서 읽고 있었으나, `usePushNotifications.ts`는 `fcm_tokens` 서브컬렉션에 저장 → FCM 발송이 항상 실패하던 문제. 서브컬렉션 읽기 + `sendEachForMulticast()` + 만료 토큰 batch delete로 전면 재작성.
  - **🔴 보안 수정** `invite/create/route.ts`: 인증된 사용자라면 누구든 임의 팀의 초대 코드 생성 가능 → 팀 오너/어드민 역할 검증 추가.
  - **버그 수정** `export/route.ts`: 멤버십 검증이 `where('user_id', '==', userId)` 쿼리였으나 실제 멤버 문서 ID가 uid → `.doc(userId).get()` 직접 조회로 수정.
  - **타입 일관성** `google-calendar`, `notion`, `github` 통합 라우트의 태스크 생성에 누락된 필드 추가: `position`, `assignee_name`, `due_time`, `start_date`, `duration_minutes`, `ai_source_entry_id`, `decoration`, `reminders`. 이제 모든 통합 라우트의 Firestore 문서가 Task 타입과 완전히 일치.
  - **추가** `google-calendar` POST: 임포트 시 `due_time`을 GCal 이벤트 `start.dateTime`에서 추출(HH:MM 형식).
- **결과**: FCM 푸시 알림 실제 작동, 초대 코드 보안 강화, 태스크 문서 스키마 일관성 확보.
- **관련 문서**: 없음

### [2026-04-22] AI 라우트 Rate Limiting + createEntities 타입 일관성 수정
- **유형**: 보안/품질
- **내용**:
  - **보안** `lib/auth/rateLimit.ts` 신규 생성 — in-memory 슬라이딩 윈도우 rate limiter (프로덕션 멀티인스턴스는 Upstash Redis로 교체 필요).
  - **보안** AI 라우트 7개에 per-uid rate limiting 적용:
    - `classify`: 분당 20회, `ai-companion`: 분당 30회, `ai-match`: 분당 30회
    - `ai-sections`: 분당 10회, `transcribe`: 분당 10회
    - `evening-report`: 분당 5회, `standup/generate`: 분당 5회
  - **버그 수정** `createEntities.ts`: AI 생성 태스크에 `external_id: null`, `external_source: null` 필드 추가 — Task 타입 인터페이스와 일관성 확보 (`task_creation`/`schedule` 케이스, `reminder_set` 케이스 모두).
- **결과**: AI API 남용/무한 호출 방지. Firestore에 저장되는 태스크 문서가 Task 타입과 완전히 일치.
- **관련 문서**: 없음

### [2026-04-22] Cron/Firestore/보안 인프라 수정
- **유형**: 이슈/해결
- **내용**:
  - **🔴 버그 수정** `calendar-reminder` Cron 라우트: Vercel Cron은 GET 요청을 보내지만 POST만 export → GET으로 재설계. 배치 처리로 변경: Firestore `collectionGroup('settings').where('google_calendar.token_expires_at', '>', now)` 쿼리로 유효한 토큰을 가진 모든 사용자 처리.
  - **개선** `google-calendar/route.ts` POST: 동기화 성공 시 `accessToken`과 `token_expires_at`을 `settings/integrations`에 저장 → Cron이 재사용 가능.
  - **개선** FCM 발송: 레거시 `/fcm/send` HTTP v1 + FCM_SERVER_KEY 방식 → `adminMessaging.sendEachForMulticast()` Admin SDK 방식으로 교체.
  - **vercel.json**: cron에 `"method": "GET"` 명시.
  - **firestore.indexes.json**: 누락 인덱스 추가 — `api_keys`(key+active, user_id+active), `slack_user_mappings`(slack_user_id+slack_team_domain), `tasks_independent`(deleted_at+status+created_at), `settings` collectionGroup(google_calendar.token_expires_at).
  - **firestore.rules**: `settings/integrations` 클라이언트 쓰기를 Slack webhook 필드만 허용하도록 정밀화. `notification_sent_log` Admin SDK 전용 명시.
  - **보안** `invite/email`, `slack handleSendNotification` 인증 추가.
  - **billing/webhook**: Pages Router 전용 `export const config` 제거 (App Router에서 dead code).
  - **settings/page.tsx**: `ApiKeyManager` `user` prop 제거 (미사용), `getIdToken` 인라인 함수 → `fetchWithAuth`로 교체.
- **결과**: Cron 기반 캘린더 알림이 실제로 동작하는 구조로 재설계됨. Firestore indexes 완성.
- **관련 문서**: vercel.json, firestore.indexes.json, firestore.rules

### [2026-04-22] 전체 API 인증 강화 + GIS OAuth 리팩토링
- **유형**: 보안/리팩토링
- **내용**:
  - **🔴 보안 수정** 공통 `lib/auth/verifyUser.ts` 유틸 생성. 기존 인증 없던 API 라우트 전수 적용:
    - `/api/classify`, `/api/evening-report`, `/api/ai-sections`, `/api/ai-companion`, `/api/ai-match`, `/api/standup/generate`, `/api/transcribe` — AI/OpenAI 키 소비 라우트에 Firebase ID 토큰 인증 추가.
    - `/api/integrations/google-calendar`, `gmail`, `google-fit`, `notion`, `github` — 통합 라우트에 인증 추가 + body에서 `userId` 제거(토큰에서 추출).
    - `/api/invite/create`, `/api/invite/accept` — body의 `userId` 신뢰 제거 → 토큰에서 uid 추출.
    - `/api/billing/checkout` — 인증 추가 + body에서 `userId` 제거.
    - `/api/export` 인라인 `verifyUser` → 공통 유틸리티로 교체.
    - `/api/v1/keys` 인라인 `verifyIdToken` → 공통 유틸리티로 교체.
  - **리팩토링** `lib/auth/fetchWithAuth.ts` 생성 — Firebase ID 토큰을 Authorization 헤더에 자동 포함하는 fetch 래퍼. 클라이언트 API 호출 파일 전수 교체:
    - `lib/ai/classify.ts`, `lib/ai/useEmbeddingMatch.ts`
    - `components/features/report/EveningReportCard.tsx`, `StandupCard.tsx`
    - `components/features/input/VoiceButton.tsx`
    - `components/features/tasks/TaskDetailPanel.tsx`
    - `app/(app)/journal/page.tsx`, `projects/page.tsx`
    - `app/(app)/settings/page.tsx` (invite/create, invite/email, billing, 통합 API 전부)
    - `app/invite/[code]/page.tsx`
  - **리팩토링** `lib/auth/requestGoogleToken.ts` 공통 유틸 적용 — `TaskDetailPanel`, `settings/page.tsx` (CalendarImport/GmailImport/GoogleFitSync) 인라인 GIS 코드 교체.
  - **정리** `settings/page.tsx`: 미사용 `onSnapshot`, `query`, `where` import 제거. dead code `query()` 블록 제거.
- **결과**: 모든 API 라우트에 일관된 Firebase ID 토큰 인증 적용. body에서 userId를 신뢰하던 보안 취약점 해결.
- **관련 문서**: todo.md

### [2026-04-22] 버그 수정 & 품질 개선 — 프롭 불일치 + 보안 + SDK 마이그레이션
- **유형**: 이슈/해결
- **내용**:
  - **🔴 보안 수정** `invite/create`, `invite/accept`: 클라이언트 Firebase SDK → Admin SDK 마이그레이션. 서버에서 클라이언트 SDK 사용 시 Firestore Security Rules가 인증 없음으로 처리해 모든 쓰기 거부됨.
  - **🔴 보안 수정** `/api/export`: 팀 멤버십 검증 누락 → `members` 컬렉션 조회로 확인 추가.
  - **버그 수정** `todo/page.tsx`: `TaskFilterBar`에 `value` 대신 `active` 프롭 전달 (필터 UI가 선택 상태 표시 안 되던 문제).
  - **버그 수정** `todo/page.tsx`: `TaskList`에 필수 `loading` 프롭 누락 → 추가.
  - **개선** `/api/classify`: `buildUserPrompt`에 `frequent_intents`/`preferred_projects` 힌트 포함 (PersonalizationHints가 prompt에 반영되지 않던 문제).
  - **개선** `createEntities.ts`: AI 생성 태스크에 `recurrence: null` 필드 추가 (스키마 일관성).
  - **추가** `(app)/not-found.tsx`: 앱 내부 404 페이지 (AppShell 포함, 인증된 사용자 대상).
  - **모바일 UX**: AppShell MOBILE_NAV에 `/todo` 추가 (기존 Stats 대신).
  - **vercel.json**: `ANTHROPIC_API_KEY`, `FIREBASE_*`, `RESEND_API_KEY`, `INTERNAL_API_SECRET` 등 누락 env var 추가.
  - **.env.example**: `NEXT_PUBLIC_FIREBASE_VAPID_KEY`, `CRON_SECRET`, `INTERNAL_API_SECRET` 추가.
- **결과**: 초대 플로우가 실제로 작동하는 상태로 수정됨. 보안 취약점 2개 해결.
- **관련 문서**: todo.md

### [2026-04-22] UX 완성도 고도화 — 검색 팔레트 + 알림 배지 + 에러 바운더리 + 내보내기
- **유형**: 결정
- **내용**:
  - **Cmd+K 커맨드 팔레트**: `CommandPalette.tsx` — 태스크/프로젝트/일기 Firestore 검색 + 정적 페이지 이동. AppShell에 전역 Cmd+K 단축키 등록. `?` 키로 단축키 도움말 오버레이.
  - **알림 배지**: `useNotifications` 훅 → AppShell 헤더 🔔 아이콘에 읽지 않은 수 배지 표시.
  - **에러 바운더리**: `(app)/error.tsx` + 루트 `error.tsx` + `(app)/loading.tsx` (Next.js App Router 규약).
  - **데이터 내보내기**: `/api/export` (GET, Firebase ID Token 인증) — 태스크/일기/프로젝트 JSON 또는 CSV. 설정 페이지 "데이터 내보내기" 섹션.
  - **`/todo` 페이지**: `app/(app)/todo/page.tsx` — 전체 태스크 리스트, 필터 바, 완료율 프로그레스 표시.
- **결과**: 전체 UX 완성도 크게 향상. 🔴 항목 0개 유지.
- **관련 문서**: feature.md, todo.md

### [2026-04-22] 웹 완성도 고도화 — PWA + 히트맵 + 나머지 기능 구현
- **유형**: 결정
- **내용**:
  - **F-007** Web Share Target: `manifest.json`에 `share_target` 추가 (GET, title/text/url 파라미터). `/share-target` 페이지에서 sessionStorage 경유 → HomeContent initialText → SmartInput 자동 주입.
  - **F-010** 오디오 파일 임포트: `AudioFileImporter` 컴포넌트 — 오디오 파일(MP3/M4A/WAV, 25MB) 업로드 → `/api/transcribe` STT → SmartInput 텍스트 주입. SmartInput 하단 📂 버튼.
  - **F-091** 캘린더 기반 알림: `/api/notifications/calendar-reminder` — Google Calendar 이벤트 35분 이내 시작 감지 → FCM 알림. Vercel Cron `*/5 * * * *`으로 자동 실행. 중복 방지: `notification_sent_log` 컬렉션.
  - **F-114** Google Fit: `/api/integrations/google-fit` — fitness.activity.read scope, 일별 버킷 집계(걸음/칼로리/활동분). 설정 페이지 동기화 버튼.
  - **PWA Service Worker**: `public/sw.js` — Cache first (정적), Network first (네비), FCM push 수신, 알림 클릭 앱 열기. layout.tsx에 SW 등록 스크립트.
  - **활동 히트맵**: stats/page.tsx에 `ActivityHeatmap` 추가 — 최근 12주 일별 완료 태스크 수, GitHub 스타일 그리드, 색상 농도 인코딩.
  - **F-123~126** ⏸ 보류: iOS 위젯/Live Activity/Watch/Siri는 Expo SDK/네이티브 미지원으로 보류 처리.
- **결과**: feature.md 기준 웹 구현 가능한 모든 항목 완료. 남은 항목은 모바일 네이티브(F-123~126, ⏸ 보류)와 운영 인프라(env 설정, Vercel 배포)만 남음.
- **관련 문서**: feature.md, todo.md, vercel.json

### [2026-04-22] Phase 3 마무리 — AI 고도화 + 연동 완성 + Enterprise
- **유형**: 결정
- **내용**:
  - **F-045** 임베딩 매칭: `text-embedding-004` API 기반 `/api/ai-match` + `useEmbeddingMatch` 훅. SmartInput에서 600ms 디바운스 후 activeProjectNames와 유사도 계산, 상위 3개 프로젝트 배지로 제안.
  - **F-048** 학습 기반 개인화: `lib/ai/personalization.ts` — 최근 30개 processed input_logs에서 frequent_intents / preferred_time_blocks / common_project_names 집계. SmartInput 마운트 시 로드 → classifyEntry context에 주입.
  - **F-087** 커스텀 스티커: `CustomStickerUploader.tsx` — Firebase Storage 업로드 (500KB 제한), Firestore `teams/{teamId}/custom_stickers` 저장. 팀/커뮤니티 탭 분리. StickerPicker에 "커스텀" 모드 탭 추가. `community_stickers` 전역 컬렉션으로 공유.
  - **F-112** Gmail: `/api/integrations/gmail` — gmail.readonly OAuth, 읽지 않은 메일 20개 조회 → 액션 키워드 필터링 → tasks_independent 저장. 설정 페이지 "가져오기" 버튼.
  - **F-113** Calendar 양방향: `/api/integrations/google-calendar` PUT 핸들러 추가 — MDA 태스크 → GCal 이벤트 생성/수정. TaskDetailPanel 헤더에 📅 버튼으로 직접 내보내기.
  - **F-107** SAML SSO: `/api/auth/saml` — Firebase Auth SAML provider 지원, 게스트 초대(customToken 발급), `SAML_PROVIDER_IDS` env로 엔터프라이즈 IdP 목록 관리.
  - **F-135** Business 티어: `PLAN_FEATURES` + `PLAN_PRICE` + `STRIPE_PRICE_IDS` 추가. 설정 페이지 플랜 섹션에 Plus/Team/Business 카드 3종 표시. Business는 영업 mailto 링크.
- **결과**: feature.md 기준 웹 구현 가능한 모든 항목 완료. 남은 항목은 모바일 네이티브(F-091, F-114, F-120~126) 또는 운영 인프라(CI/CD, env 설정) 뿐.
- **관련 문서**: feature.md, todo.md, firestore.rules

### [2026-04-22] Phase 2 기능 대규모 구현 완료
- **유형**: 결정 + 해결
- **내용**: 세션 2회에 걸쳐 feature.md의 🔴 항목 다수 구현
  - **F-043** AI 섹션 자동 생성: `/api/ai-sections` + projects/page.tsx 미리보기 & 일괄 생성
  - **F-046** 감정 트렌드 분석: stats/page.tsx 7/14/30일 바 차트, 평균 기분점수
  - **F-047/009** AI Companion 회고 대화: `/api/ai-companion` + journal "🤖 AI 회고" 탭
  - **F-026** 음성 녹음: HomeScreen 모바일 expo-av + /api/transcribe STT, duration_ms 저장
  - **F-084** 테마 프리셋 8개: globals.css data-theme + ThemeProvider.tsx + 설정 페이지 UI
  - **F-085/086** 스티커팩 + 계절팩: StickerPicker.tsx 12팩 120개, TaskDetailPanel 통합
  - **F-100** 이메일 초대: `/api/invite/email` Resend + 설정 페이지 UI, 미설정 시 링크 복사 fallback
  - **F-071** 재귀 만다라트: Section.sub_project_id, MandaraCell 연결 표시, 드릴다운 네비게이션
  - **F-072** 간트 고도화: 줌(일/주), 상태 필터, 섹션 그룹, 마감 초과 표시, 클릭 콜백
  - **F-102** 담당자 배정: TaskDetailPanel 팀 멤버 선택 UI, assignee_id 저장
  - **F-104** 댓글 & 멘션: CommentThread.tsx @멘션 자동완성, 이모지 리액션, Firestore subcollection
  - **F-105** 팀 활동 피드: TeamActivityFeed.tsx + logActivity(), 홈 하단 통합
  - **F-006** 파일 업로드: FileUploader.tsx Firebase Storage, TaskAttachment 공유타입, TaskDetailPanel 통합
  - **F-106** 자동 스탠드업: StandupCard.tsx + `/api/standup/generate`, 홈 페이지 통합
  - **F-070** 다축 피벗: PivotView.tsx 섹션/담당자/시간대 3축, 프로젝트 상세 3번째 탭
- **결과**: Phase 1 전체 완료, Phase 2 대부분 완료. 잔여: 외부 연동(F-110~117), 수익(F-130~135), 플랫폼(F-120~126), 알림고도화(F-091~093)
- **관련 문서**: feature.md, todo.md

### [2026-04-22] Phase 3 완성 — 연동 확장 + 수익화 게이트 + Public API
- **유형**: 결정
- **내용**:
  - **F-133** Team 티어: `invite/accept` API에 `TEAM_MEMBER_LIMITS` 테이블 기반 멤버 수 제한 체크. team 오너의 구독 티어를 Firestore에서 조회해 초과 시 403 반환.
  - **F-134** 프리미엄 스티커팩: `PACK_TIER` 맵으로 팩별 tier 정의. Free 사용자에게 잠금 오버레이 표시. 프리미엄 팩 4개 추가(음식/여행/스포츠/예술).
  - **F-115** Slack 봇: `/api/integrations/slack` — Slash Command(`/mda 할일`) → AI 분류 후 태스크 생성 + Incoming Webhook 발송. `slack_user_mappings` 컬렉션으로 Slack↔MDA 유저 매핑.
  - **F-116** GitHub 연동: `/api/integrations/github` — PAT + repo로 오픈 이슈 조회 → tasks_independent 저장. 라벨로 우선순위 매핑, milestone 마감일 연동.
  - **F-117** Public API v1: `/api/v1/tasks` (GET/POST) + `/api/v1/keys` (발급/목록/삭제). `api_keys` Firestore 컬렉션. 설정 페이지에 API 키 관리 섹션 추가.
- **결과**: feature.md 기준 🔴 항목이 F-091(맥락감지), F-112(Gmail), F-113(Calendar양방향), F-114(Health), F-123~126(위젯/Watch/Siri), F-135(Enterprise), F-045/048(AI 고도화)만 남음.
- **관련 문서**: feature.md, todo.md, firestore.rules

### [2026-04-22] Phase 3 진입 — 수익화 게이트 + 외부 연동
- **유형**: 결정
- **내용**:
  - **F-132** Plus 티어 게이트: `useSubscription`·`isLimitReached`로 프로젝트 생성 시 Free 제한(3개) 초과 체크 → `UpgradePrompt` 표시. `UpgradePrompt.tsx` + `LimitBanner.tsx` 재사용 컴포넌트.
  - **F-110** Google Calendar IN: `/api/integrations/google-calendar` — Google Identity Services OAuth로 accessToken 수신 → Calendar API 조회 → Firestore tasks_independent 저장. `external_id: gcal:{id}` 중복 방지. 설정 페이지 "가져오기" 버튼.
  - **F-111** Notion 임포트: `/api/integrations/notion` — Integration Token으로 Search API 호출 → 페이지 → 태스크 변환. 체크박스/날짜/상태 프로퍼티 파싱. 설정 페이지 토큰 입력 UI.
  - **Task 타입**: `external_id: string | null`, `external_source: 'google_calendar' | 'notion' | 'github' | null` 필드 추가.
  - **layout.tsx**: Google Identity Services 스크립트 (`accounts.google.com/gsi/client`) 추가.
- **결과**: 외부 데이터 임포트 파이프라인 완성. 남은 연동: F-112 Gmail, F-113 Calendar 양방향, F-115 Slack, F-116 GitHub.
- **관련 문서**: feature.md, todo.md, packages/shared/src/types/task.ts

### [2026-04-22] Stripe 결제 API 뼈대 완성 (F-131)
- **유형**: 결정
- **내용**: `/api/billing/checkout` (Checkout Session 생성) + `/api/billing/webhook` (구독 상태 Firestore 반영) 구현. `stripe` 패키지는 optional dynamic import로 처리 — 패키지 미설치 시 503 반환하여 빌드 오류 방지.
- **결과**: STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET + NEXT_PUBLIC_STRIPE_PLUS_PRICE_ID 환경변수만 설정하면 즉시 활성화 가능. Stripe Dashboard에서 Price ID를 생성해 env에 넣으면 됨.
- **관련 문서**: feature.md, todo.md

### [2026-04-22] 알림 고도화 + Free 티어 구조 추가
- **유형**: 결정
- **내용**:
  - F-092: `useNotificationPrefs` 훅 → Firestore `users/{id}/settings/notification_prefs` 저장. 배치 모드(즉시/1시간묶음/하루3번) + 알림 유형 ON/OFF 설정 UI
  - F-093: DND 시간대 설정(시작~종료 시간) + `/api/push` 서버에서 현재 시각 체크 → DND 중이면 `delivered: false` 반환
  - F-130: `useSubscription` 훅 + `PLAN_LIMITS` 객체(free/plus/team/business) + 설정 페이지 플랜 섹션 (제한 현황 표시 + 업그레이드 CTA)
  - `UpgradePrompt.tsx` + `LimitBanner.tsx` 재사용 가능한 업그레이드 유도 컴포넌트
  - `firestore.rules`: `users/{id}/settings/*`, `users/{id}/fcm_tokens/*`, 프로젝트 태스크 댓글 규칙 추가
- **결과**: F-130 완료, F-131(Stripe 실결제)은 STRIPE_SECRET_KEY 발급 후 진행 예정
- **관련 문서**: feature.md, firestore.rules

### [2026-04-22] TaskAttachment 공유 타입 추가
- **유형**: 해결
- **내용**: `packages/shared/src/types/task.ts`의 `attachments: string[]`를 `TaskAttachment[]`로 변경. `TaskAttachment { name, url, type, size, path }` 인터페이스 추가.
- **결과**: FileUploader 컴포넌트와 Task Firestore 문서가 동일한 타입 사용. 기존 `[]` 초기값은 모두 호환.
- **관련 문서**: packages/shared/src/types/task.ts

### [2026-04-21] Phase 1 모노레포 기반 셋업 완료
- **유형**: 결정
- **내용**: Turborepo + npm으로 `mda-app/` 모노레포 생성. apps/web (Next.js 16), apps/mobile (Expo), packages/shared (공통 타입), packages/prompts (AI 프롬프트) 구조 완성.
- **결과**: localhost:3000 웹 앱 동작 확인. Firebase `mydailyagent` 프로젝트 연결 완료. 전체 데이터 모델 TypeScript 타입 정의 완성.
- **관련 문서**: 13_TECH_STACK.md, 03_DATA_MODEL.md
- **다음 단계**: Google 로그인 화면 구현 → 타이핑 입력 + Task 생성


### [2026-04-21] 전체 설계 문서 초안 완성
- **유형**: 결정
- **내용**: MDA 프로덕트의 설계 문서 18개 (00_MASTER ~ 17_SKILLS_SPEC) 초안 작성 완료
- **결과**: Phase 1 개발 진입 조건 충족. 10대 결정 사항 확정. 기술 스택 확정.
- **관련 문서**: 00_MASTER.md, 14_PHASE_ROADMAP.md

### [2026-04-21] 북극성 & 10대 결정 확정
- **유형**: 결정
- **내용**: 프로덕트명(MDA), 타겟(3 페르소나), 플랫폼(웹+iOS+Android), 디자인 톤, 수익 모델 등 핵심 10대 사항 확정
- **결과**: 00_MASTER.md에 불변 결정으로 기록됨. 이후 모든 기능 판단의 기준.
- **관련 문서**: 00_MASTER.md, 01_PRODUCT_VISION.md

### [2026-04-21] 기술 스택 확정
- **유형**: 결정
- **내용**: Web(Next.js 14), Mobile(Expo), Backend(Firebase), AI(Gemini 2.0 + Claude fallback), 모노레포(Turborepo)
- **결과**: 13_TECH_STACK.md에 확정 기록. Next Curator 경험 기반으로 Firebase 선택.
- **관련 문서**: 13_TECH_STACK.md

### [2026-04-21] history.md / todo.md / feature.md 도입
- **유형**: 결정
- **내용**: 개발 진행에 따른 이슈·할 일·기능 정의를 별도 파일로 추적하기로 결정
- **결과**: 이 파일(history.md), todo.md, feature.md 생성
- **관련 문서**: 00_MASTER.md, 16_CLAUDE_CODE_GUIDE.md

---

<!-- 새 기록은 맨 위 날짜 섹션에 추가 -->
