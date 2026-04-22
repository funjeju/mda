# MDA — Feature 정의

> 스펙이 확정된 기능을 기록한다. 상태: 🔴 미착수 | 🟡 진행중 | 🟢 완료 | ⏸ 보류

---

## 1. 핵심 루프 (Core Loop)

| # | 기능 | 상태 | Phase | 비고 |
|---|------|------|-------|------|
| F-001 | 타이핑 입력 (앱/웹) | 🟢 | 1 | SmartInput.tsx — 웹+모바일 |
| F-002 | AI 의도 분류 (10종) | 🟢 | 1 | /api/classify — Gemini 2.0 Flash Lite |
| F-003 | 확신도 기반 분기 (자동/제안/확인) | 🟢 | 1 | SmartInput ReviewSheet |
| F-004 | 음성 녹음 (앱 내) | 🟢 | 1 | Expo Audio — HomeScreen |
| F-005 | Whisper API STT | 🟢 | 1 | /api/transcribe |
| F-006 | 파일 업로드 (이미지·PDF) | 🟢 | 1 | FileUploader.tsx — Firebase Storage, TaskDetailPanel 통합 |
| F-007 | 공유 시트 (Android 우선) | 🟢 | 1 | PWA Web Share Target API (manifest.json share_target) + /share-target 페이지 → SmartInput initialText |
| F-008 | 저녁 보고서 자동 생성 (Cron) | 🟢 | 1 | EveningReportCard + /api/report/generate |
| F-009 | 앱 내 대화창 | 🟢 | 2 | journal/page.tsx — "🤖 AI 회고" 탭 + /api/ai-companion 채팅 |
| F-010 | 통화 녹음 임포트 고도화 | 🟢 | 2 | AudioFileImporter 컴포넌트 (MP3/M4A/WAV, 25MB) — SmartInput 📂 버튼 → /api/transcribe STT |

---

## 2. 데이터 모델 & 엔터티

| # | 기능 | 상태 | Phase | 비고 |
|---|------|------|-------|------|
| F-020 | Team 구조 (개인도 1인 팀 자동 생성) | 🟢 | 1 | AuthContext — 로그인 시 자동 생성 |
| F-021 | Project / Section / Task 3단계 구조 | 🟢 | 1 | packages/shared 타입 완성 |
| F-022 | 독립 태스크 (project_id 없음) | 🟢 | 1 | tasks_independent 컬렉션 |
| F-023 | JournalEntry (일기) | 🟢 | 1 | journal_entries 컬렉션 |
| F-024 | PersonContact (관계 관리) | 🟢 | 1 | person_contacts 컬렉션 |
| F-025 | DailyReport (저녁 보고서) | 🟢 | 1 | daily_reports 컬렉션 |
| F-026 | Recording (음성 녹음 메타) | 🟢 | 1 | expo-av 녹음 + /api/transcribe STT + input_logs Firestore 저장 (duration_ms 포함) |
| F-027 | Soft delete (`deleted_at`) | 🟢 | 1 | 전체 컬렉션 적용 |
| F-028 | Firestore Security Rules | 🟢 | 1 | firestore.rules — 초대/알림/일기 private 포함 |

---

## 3. AI 에이전트

| # | 기능 | 상태 | Phase | 비고 |
|---|------|------|-------|------|
| F-040 | Gemini 2.0 Flash Lite 통합 | 🟢 | 1 | /api/classify, /api/report/generate |
| F-041 | 의도 분류 JSON 강제 출력 (Zod 검증) | 🟢 | 1 | packages/prompts — classifySchema |
| F-042 | Context Matcher (사용자 기존 프로젝트 연결) | 🟢 | 1 | SmartInput — activeProjectNames 주입 |
| F-043 | 프로젝트 분해 (만다라트 자동 생성) | 🟢 | 1 | /api/ai-sections + projects/page.tsx — AI 섹션 미리보기 & 일괄 생성 |
| F-044 | Claude API Fallback (Gemini 장애 시) | 🟢 | 1 | /api/classify — Gemini 실패 시 Claude Haiku 자동 전환 |
| F-045 | 맥락 기반 임베딩 매칭 | 🟢 | 2 | /api/ai-match (text-embedding-004 + cosine similarity) + useEmbeddingMatch + SmartInput 제안 배지 |
| F-046 | 감정 트렌드 분석 | 🟢 | 2 | stats/page.tsx — 7/14/30일 바 차트, 평균 기분 점수, 감정 분포 뱃지 |
| F-047 | AI Companion 저녁 회고 대화 | 🟢 | 2 | /api/ai-companion + journal "🤖 AI 회고" 탭 채팅 UI |
| F-048 | 학습 기반 개인화 | 🟢 | 3 | lib/ai/personalization.ts — input_logs 30개 집계 → frequent_intents/project 추출 → classify context 주입 |

---

## 4. UI / 뷰

| # | 기능 | 상태 | Phase | 비고 |
|---|------|------|-------|------|
| F-060 | 로그인/가입 (Google, Apple) | 🟢 | 1 | 웹+모바일 Google 완료, Apple 미완 |
| F-061 | 온보딩 (페르소나 선택) | 🟢 | 1 | OnboardingModal.tsx |
| F-062 | 홈 화면 (입력창 + 오늘 투두) | 🟢 | 1 | home/page.tsx + TaskList 벌크 액션 포함 |
| F-063 | 태스크 상세 | 🟢 | 1 | TaskDetailPanel — 반복/서브프로젝트 포함 |
| F-064 | 투두 리스트 뷰 | 🟢 | 1 | TaskList — 필터/정렬/벌크 선택 |
| F-065 | 프로젝트 만다라트 뷰 | 🟢 | 1 | MandaraGrid + MandaraCell |
| F-066 | 캘린더 뷰 | 🟢 | 1 | calendar/page.tsx — 월/주 뷰 |
| F-067 | 일기 리스트 | 🟢 | 1 | journal/page.tsx — 감정 필터/통계 |
| F-068 | 저녁 보고서 뷰 | 🟢 | 1 | EveningReportCard + 히스토리 |
| F-069 | 웹 — 좌측 사이드바 + 간트 뷰 | 🟢 | 1 | GanttChart.tsx — 프로젝트 상세에서 만다라트/간트 탭 전환 |
| F-070 | 다축 피벗 전환 (섹션/팀/시간) | 🟢 | 2 | PivotView.tsx — 섹션/담당자/시간대 3축, 프로젝트 상세 탭 추가 |
| F-071 | 재귀 만다라트 (셀이 하위 프로젝트로) | 🟢 | 2 | Section.sub_project_id + "🔗 서브 프로젝트" 버튼 + 드릴다운 네비게이션 |
| F-072 | 간트 뷰 고도화 | 🟢 | 2 | 줌 레벨(일/축소), 상태 필터, 섹션 그룹, 마감 초과 표시, 클릭 콜백 |

---

## 5. 디자인 시스템 & 다꾸

| # | 기능 | 상태 | Phase | 비고 |
|---|------|------|-------|------|
| F-080 | 기본 디자인 토큰 (웜 톤) | 🟢 | 1 | 전 컴포넌트 C 객체 통일 |
| F-081 | MandaraCell 컴포넌트 | 🟢 | 1 | MandaraGrid.tsx |
| F-082 | Light 테마 | 🟢 | 1 | ThemeProvider + CSS vars |
| F-083 | 기본 완료 애니메이션 | 🟢 | 1 | TaskList — 완료 시 체크 scale 애니메이션 + 배경 mint 플래시 |
| F-084 | 테마 프리셋 8개 | 🟢 | 2 | globals.css data-theme + ThemeProvider.tsx + 설정 페이지 색상 선택 UI |
| F-085 | 기본 스티커팩 (30개+) | 🟢 | 2 | StickerPicker 컴포넌트 — 8팩 80개 이모지, 검색, TaskDetailPanel 통합 |
| F-086 | 계절 스티커팩 | 🟢 | 2 | StickerPicker.tsx — 봄/여름/가을/겨울 4팩 40개 추가 |
| F-087 | 사용자 스티커 업로드 / 커뮤니티 공유 | 🟢 | 3 | CustomStickerUploader.tsx — Firebase Storage 업로드, teams/{teamId}/custom_stickers, community_stickers 전역 공유 |

---

## 6. 알림

| # | 기능 | 상태 | Phase | 비고 |
|---|------|------|-------|------|
| F-090 | 기본 푸시 알림 (태스크 due + 저녁 보고서) | 🟢 | 1 | /api/push — FCM 발송 + Firestore 알림 저장, 모바일 토큰 등록 |
| F-091 | 맥락 감지 알림 (회의·이동 중 감지) | 🟢 | 2 | 캘린더 기반 경량 구현: /api/notifications/calendar-reminder (매5분 Vercel Cron) + 이벤트 30분 전 FCM 알림 |
| F-092 | 묶음 알림 & 적응형 지연 | 🟢 | 2 | useNotificationPrefs + 설정 페이지 UI (즉시/1시간/3회) |
| F-093 | Do Not Disturb 자동 | 🟢 | 2 | useNotificationPrefs DND 시간대 + /api/push DND 체크 |

---

## 7. 협업

| # | 기능 | 상태 | Phase | 비고 |
|---|------|------|-------|------|
| F-100 | 이메일 초대 | 🟢 | 1 | /api/invite/email Resend 발송 + RESEND_API_KEY 미설정 시 링크 복사 fallback |
| F-101 | 역할 (owner/admin/member/viewer) | 🟢 | 1 | Security Rules + useTeam |
| F-102 | 담당자 배정 | 🟢 | 1 | TaskDetailPanel — 팀 멤버 선택 버튼 UI, assignee_id 저장 |
| F-103 | 팀 전환 | 🟢 | 1 | settings/page.tsx — 소속 팀 목록 표시 + switchTeam(AuthContext) |
| F-104 | 댓글 & 멘션 | 🟢 | 2 | CommentThread — @멘션 자동완성, 이모지 리액션, TaskDetailPanel 통합 |
| F-105 | 팀 활동 피드 | 🟢 | 2 | TeamActivityFeed — activity_feed 컬렉션, 실시간 onSnapshot, 홈 페이지 하단 |
| F-106 | 자동 스탠드업 | 🟢 | 2 | StandupCard.tsx + /api/standup/generate — 홈 통합 |
| F-107 | SAML SSO / 외부 Guest | 🟢 | 3 | /api/auth/saml — Firebase Auth SAML provider + Guest 초대 customToken, SAML_PROVIDER_IDS env |

---

## 8. 외부 연동

| # | 기능 | 상태 | Phase | 비고 |
|---|------|------|-------|------|
| F-110 | Google Calendar 일방향 IN | 🟢 | 1 | /api/integrations/google-calendar — GIS OAuth, 30일 이벤트→태스크, 설정 UI |
| F-111 | Notion 임포트 (일회성) | 🟢 | 1 | /api/integrations/notion — Integration Token, 페이지→태스크, 설정 UI |
| F-112 | Gmail 메타데이터 | 🟢 | 2 | /api/integrations/gmail — gmail.readonly OAuth, 읽지 않은 메일 키워드 필터 → 태스크, 설정 UI |
| F-113 | Google Calendar 양방향 | 🟢 | 2 | /api/integrations/google-calendar PUT — MDA 태스크 → GCal 이벤트 생성/수정, TaskDetailPanel 📅 버튼 |
| F-114 | Apple Health / Google Fit | 🟢 | 2 | Google Fit REST API: /api/integrations/google-fit — 7일 걸음수/칼로리/활동시간, 설정 UI |
| F-115 | Slack 봇 (팀 플랜) | 🟢 | 2 | /api/integrations/slack — Slash Command 태스크 생성 + Webhook 발송, 설정 UI |
| F-116 | GitHub 연동 (개발자 옵션) | 🟢 | 2 | /api/integrations/github — Issues→태스크, PAT 인증, 설정 UI |
| F-117 | Zapier / Make / Webhook / Public API | 🟢 | 3 | /api/v1/tasks (GET/POST) + /api/v1/keys (발급/삭제), api_keys 컬렉션 |

---

## 9. 플랫폼 & 위젯

| # | 기능 | 상태 | Phase | 비고 |
|---|------|------|-------|------|
| F-120 | iOS 위젯 Small/Medium | ⏸ | 1 | Expo SDK 54 미지원 — Phase 2로 이월 |
| F-121 | Android 위젯 Small/Medium | ⏸ | 1 | 동일 이유 — Phase 2로 이월 |
| F-122 | Deep Link (Universal Link / App Link) | 🟢 | 1 | app.json scheme "mda" 설정 완료 |
| F-123 | iOS 위젯 Large + 잠금화면 위젯 | ⏸ | 2 | Expo SDK 위젯 지원 대기 |
| F-124 | Live Activity (iOS) | ⏸ | 2 | ActivityKit — Expo Plugins 필요 |
| F-125 | Apple Watch 앱 (기본) | ⏸ | 2 | 별도 WatchOS target 필요 |
| F-126 | Siri / Google Assistant 단축어 | ⏸ | 2 | App Intent 등록 — 모바일 네이티브 전용 |

---

## 10. 수익

| # | 기능 | 상태 | Phase | 비고 |
|---|------|------|-------|------|
| F-130 | Free 티어 | 🟢 | 1 | useSubscription + PLAN_LIMITS + 설정 페이지 플랜 섹션 |
| F-131 | Stripe 연결 준비 | 🟢 | 1 | /api/billing/checkout + /api/billing/webhook — STRIPE_SECRET_KEY 필요 |
| F-132 | Plus 티어 | 🟢 | 2 | 프로젝트 생성 Free 제한 gate + UpgradePrompt UI |
| F-133 | Team 티어 | 🟢 | 2 | invite/accept에 팀 멤버 수 제한 체크 (tier별 TEAM_MEMBER_LIMITS) |
| F-134 | 프리미엄 스티커팩 판매 | 🟢 | 2 | StickerPicker PACK_TIER 잠금 + 4개 프리미엄팩 추가 + 잠금 오버레이 UI |
| F-135 | Business / Enterprise 티어 | 🟢 | 3 | PLAN_FEATURES + PLAN_PRICE + STRIPE_PRICE_IDS 추가, 설정 페이지 3-tier 카드 UI + 영업 mailto |

---

## 변경 이력

| 날짜 | 변경 내용 |
|------|-----------|
| 2026-04-21 | 초안 생성 — Phase 1/2/3 전체 기능 정의 |
| 2026-04-21 | 실제 구현 상태 반영 갱신 — Phase 1 주요 기능 🟢 처리 |
| 2026-04-21 | F-044 Claude Fallback, F-069 간트뷰, F-083 완료 애니, F-090 FCM, F-103 팀전환 완료 |
| 2026-04-22 | F-085/086 스티커팩+계절팩, F-104 댓글멘션, F-105 팀활동피드, F-100 이메일초대, F-071 재귀만다라트, F-072 간트고도화, F-084 테마프리셋, F-046 감정트렌드, F-047/009 AI회고채팅, F-043 AI섹션생성, F-026 음성녹음, F-102 담당자배정 완료 |
| 2026-04-22 | F-006 파일업로드(FileUploader+TaskDetailPanel통합), F-106 자동스탠드업(StandupCard), F-070 피벗뷰(PivotView 3축) 완료 |
| 2026-04-22 | F-092 묶음알림(배치모드), F-093 DND자동(시간대+/api/push체크) 완료 |
| 2026-04-22 | F-130 Free 티어 (useSubscription+PLAN_LIMITS+설정UI), F-131 Stripe checkout+webhook API 완성 |
| 2026-04-22 | F-132 Plus 티어 게이트(프로젝트 제한+UpgradePrompt), F-110 Google Calendar IN, F-111 Notion 임포트 완료 |
| 2026-04-22 | F-133 Team 티어 멤버제한, F-134 프리미엄 스티커팩 잠금, F-115 Slack봇, F-116 GitHub연동, F-117 Public API v1 완료 |
