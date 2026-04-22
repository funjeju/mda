# MDA — TODO

> Claude Code가 매 작업 후 갱신한다. 완료 항목은 history.md로 이동.

---

## 현재 단계: Phase 3 — 운영 준비 & 잔여 고도화

---

## 지금 당장 (Current Sprint)

### 잔여 고도화 항목 (복잡도 높음 or 외부 의존)
- [x] **F-045** 맥락 기반 임베딩 매칭 — Gemini text-embedding-004 + cosine similarity 완료
- [x] **F-048** 학습 기반 개인화 — input_logs 패턴 분석 + classify context 주입 완료
- [x] **F-087** 사용자 스티커 업로드 / 커뮤니티 공유 완료
- [x] **F-112** Gmail 메타데이터 — gmail.readonly scope + 태스크 변환 완료
- [x] **F-113** Google Calendar 양방향 — MDA → GCal PUT API + TaskDetailPanel 버튼 완료
- [x] **F-107** SAML SSO / 외부 Guest — Firebase Auth SAML + Guest 초대 API 완료
- [x] **F-135** Business/Enterprise 티어 — 플랜 정의 + 설정 UI + 영업 문의 링크 완료

### 추가 완료 항목
- [x] **F-007** Web Share Target — manifest.json share_target + /share-target 페이지 + SmartInput initialText
- [x] **F-010** 오디오 파일 임포트 — AudioFileImporter (MP3/M4A/WAV 25MB) + SmartInput 📂 버튼
- [x] **F-091** 캘린더 기반 알림 — /api/notifications/calendar-reminder (Vercel Cron 5분) + FCM
- [x] **F-114** Google Fit 웹 버전 — /api/integrations/google-fit + 설정 UI
- [x] PWA Service Worker — public/sw.js (Cache first + FCM push)
- [x] 활동 히트맵 — stats/page.tsx ActivityHeatmap (12주 GitHub 스타일)

### 보류 항목 (Expo SDK / 모바일 네이티브 전용)
- [ ] **F-123** iOS 위젯 Large + 잠금화면
- [ ] **F-124** Live Activity (iOS) — ActivityKit
- [ ] **F-125** Apple Watch 앱
- [ ] **F-126** Siri / Google Assistant 단축어

---

## 플랫폼 & 위젯 (Expo SDK 지원 대기)

| 항목 | 비고 |
|------|------|
| F-120/121 | iOS/Android 위젯 — Expo SDK 위젯 지원 확인 후 |
| F-123 | iOS 위젯 Large + 잠금화면 |
| F-124 | Live Activity (iOS) |
| F-125 | Apple Watch 앱 |
| F-126 | Siri / Google Assistant 단축어 |

---

## Phase 2/3 — 플랫폼 & 위젯

| 항목 | 설명 | 선행조건 |
|------|------|----------|
| F-120/121 | iOS/Android 위젯 S/M | Expo SDK 위젯 지원 확인 |
| F-123 | iOS 위젯 Large + 잠금화면 | F-120 완료 |
| F-124 | Live Activity (iOS) | Expo Plugins |
| F-125 | Apple Watch 앱 | 별도 target 필요 |
| F-126 | Siri / Google Assistant 단축어 | App Intent 등록 |

---

## 운영 & 인프라

- [ ] Firebase 프로젝트 환경 분리 (dev / staging / prod)
- [ ] Firestore Security Rules Firebase Console 배포 (`firebase deploy --only firestore:rules`)
- [ ] GitHub 레포 생성 + 브랜치 전략 확정
- [x] GitHub Actions CI (.github/workflows/ci.yml — lint + type-check + build)
- [x] Firestore indexes.json 구성 (input_logs, custom_stickers, community_stickers, activity_feed, comments 인덱스 추가)
- [x] .env.example 생성 + 갱신 (VAPID, CRON_SECRET, INTERNAL_API_SECRET, FIREBASE_SERVICE_ACCOUNT_JSON 추가)
- [x] vercel.json env vars 완성 (ANTHROPIC_API_KEY, Firebase Admin, Resend, Stripe, CRON_SECRET 등)
- [x] firebase-admin.ts: JSON 방식 + 개별 필드 방식 양쪽 지원 (FIREBASE_SERVICE_ACCOUNT_JSON || FIREBASE_PROJECT_ID+...)
- [ ] RESEND_API_KEY 발급 및 .env 설정 (이메일 초대 활성화)
- [ ] STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET + STRIPE_PRICE_IDs 발급
- [ ] 도메인 + Vercel 프로덕션 배포
- [ ] Firestore indexes 배포 (`firebase deploy --only firestore:indexes`)

---

## 완료됨 (2026-04-22 기준)

### Phase 1
- [x] F-001 타이핑 입력 (SmartInput.tsx)
- [x] F-002 AI 의도 분류 10종 (Gemini 2.0 Flash Lite)
- [x] F-003 확신도 기반 분기 (ReviewSheet)
- [x] F-004 음성 녹음 (Expo Audio)
- [x] F-005 Whisper API STT
- [x] F-006 파일 업로드 (FileUploader.tsx + Firebase Storage + TaskDetailPanel)
- [x] F-008 저녁 보고서 자동 생성 (EveningReportCard + /api/evening-report)
- [x] F-020 Team 구조 (1인 팀 자동 생성)
- [x] F-021 Project/Section/Task 3단계 구조
- [x] F-022 독립 태스크 (tasks_independent)
- [x] F-023 JournalEntry
- [x] F-024 PersonContact
- [x] F-025 DailyReport
- [x] F-026 Recording (음성 녹음 메타 + duration_ms)
- [x] F-027 Soft delete
- [x] F-028 Firestore Security Rules
- [x] F-040 Gemini 2.0 Flash Lite 통합
- [x] F-041 의도 분류 JSON + Zod 검증
- [x] F-042 Context Matcher
- [x] F-043 프로젝트 분해 + AI 섹션 자동 생성
- [x] F-044 Claude API Fallback
- [x] F-060 로그인/가입 (Google)
- [x] F-061 온보딩 (페르소나 선택)
- [x] F-062 홈 화면
- [x] F-063 태스크 상세 (TaskDetailPanel)
- [x] F-064 투두 리스트 뷰
- [x] F-065 프로젝트 만다라트 뷰
- [x] F-066 캘린더 뷰
- [x] F-067 일기 리스트
- [x] F-068 저녁 보고서 뷰
- [x] F-069 간트 뷰
- [x] F-082 Light 테마
- [x] F-083 완료 애니메이션
- [x] F-090 기본 푸시 알림 (FCM)
- [x] F-100 이메일 초대 (링크 생성/수락/발송)
- [x] F-101 역할 (owner/admin/member/viewer)
- [x] F-102 담당자 배정
- [x] F-103 팀 전환
- [x] F-122 Deep Link

### Phase 3
- [x] F-045 맥락 기반 임베딩 매칭 (/api/ai-match + useEmbeddingMatch + SmartInput 제안)
- [x] F-048 학습 기반 개인화 (lib/ai/personalization.ts + classify context 주입)
- [x] F-087 사용자 스티커 업로드 / 커뮤니티 공유 (CustomStickerUploader + community_stickers)
- [x] F-107 SAML SSO / 외부 Guest (/api/auth/saml + Firebase Auth SAML)
- [x] F-112 Gmail 메타데이터 (/api/integrations/gmail + 설정 UI)
- [x] F-113 Google Calendar 양방향 (PUT handler + TaskDetailPanel 내보내기)
- [x] F-135 Business/Enterprise 티어 (PLAN_FEATURES/PRICE + 설정 UI 3-tier)

### Phase 2
- [x] F-009 앱 내 대화창 (AI 회고 탭)
- [x] F-046 감정 트렌드 분석 (7/14/30일 바 차트)
- [x] F-047 AI Companion 저녁 회고 대화
- [x] F-070 다축 피벗 전환 (PivotView 섹션/담당자/시간대)
- [x] F-071 재귀 만다라트 (sub_project_id + 드릴다운)
- [x] F-072 간트 고도화 (줌, 상태필터, 섹션그룹, 마감초과)
- [x] F-080 기본 디자인 토큰
- [x] F-081 MandaraCell 컴포넌트
- [x] F-084 테마 프리셋 8개
- [x] F-085 기본 스티커팩 (80개)
- [x] F-086 계절 스티커팩 (40개)
- [x] F-104 댓글 & 멘션 (CommentThread)
- [x] F-105 팀 활동 피드 (TeamActivityFeed)
- [x] F-106 자동 스탠드업 (StandupCard + /api/standup/generate)
- [x] F-092 묶음알림 배치모드 (useNotificationPrefs + 설정 UI)
- [x] F-093 DND 자동 (시간대 설정 + /api/push 체크)
- [x] F-130 Free 티어 (useSubscription + PLAN_LIMITS + 설정 페이지 플랜 섹션)
- [x] F-131 Stripe 연결 준비 (/api/billing/checkout + /api/billing/webhook)
- [x] F-132 Plus 티어 게이트 (프로젝트 제한 + UpgradePrompt)
- [x] F-110 Google Calendar IN (/api/integrations/google-calendar + 설정 UI)
- [x] F-111 Notion 임포트 (/api/integrations/notion + 설정 UI)
- [x] F-133 Team 티어 멤버 제한 (invite/accept 체크)
- [x] F-134 프리미엄 스티커팩 (4팩 추가 + PACK_TIER 잠금)
- [x] F-115 Slack 봇 (/api/integrations/slack + 설정 UI)
- [x] F-116 GitHub 연동 (/api/integrations/github + 설정 UI)
- [x] F-117 Public API v1 (/api/v1/tasks + /api/v1/keys)
