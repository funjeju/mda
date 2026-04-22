# 12. 플랫폼 전략

웹·iOS·Android 세 플랫폼의 역할 분담과 기능 매트릭스.

---

## 12.1 플랫폼별 정체성

### 웹 (Desktop Web)

**역할**: **설계 · 분석 · 협업의 무대**

- 큰 화면에서 프로젝트 구조 설계
- 대시보드 인사이트
- 팀 관리
- 깊이 있는 편집
- 데이터 분석·내보내기

**사용 시점**: 근무 중 데스크톱 앞, 회의 중 화면 공유

### iOS / Android 앱

**역할**: **입력 · 알림 · 일상의 무대**

- 위젯 통한 즉각 입력
- 푸시 알림 수신
- 통화 녹음 임포트
- 간편 확인·완료
- 저녁 보고서 확인

**사용 시점**: 외출·이동 중·회의 중·휴식 중 — 언제 어디서나

### 공통 영역

모든 플랫폼에서 가능:
- 태스크 생성·수정·완료
- 일기 작성
- 팀 협업 (댓글·멘션)
- 저녁 보고서 보기
- 설정 변경

---

## 12.2 기능 매트릭스

### 핵심 기능

| 기능 | 웹 | iOS | Android |
|------|-----|-----|---------|
| 태스크 CRUD | ✓ | ✓ | ✓ |
| 만다라트 뷰 | ✓ | ✓ | ✓ |
| 캘린더 뷰 | ✓ | ✓ | ✓ |
| 간트 뷰 | ✓ | 제한 | 제한 |
| 리스트 뷰 | ✓ | ✓ | ✓ |
| 음성 입력 | ✓ | ✓ | ✓ |
| 필기 입력 | ✓ | ✓ | ✓ |
| 파일 업로드 | ✓ | ✓ | ✓ |
| 대화창 | ✓ | ✓ | ✓ |
| 저녁 보고서 | ✓ | ✓ | ✓ |
| 다꾸 편집 | ✓ | ✓ | ✓ |

### 플랫폼 특화

| 기능 | 웹 | iOS | Android |
|------|-----|-----|---------|
| 위젯 (홈/잠금화면) | ✗ | ✓ | ✓ |
| 푸시 알림 | 제한(Web Push) | ✓ | ✓ |
| 공유 시트 통합 | ✗ | ✓ | ✓ |
| Siri/Assistant | ✗ | ✓ | ✓ |
| 통화 녹음 임포트 | ✗ | 부분(에이닷) | ✓ |
| 백그라운드 녹음 | ✗ | 제한 | ✓ |
| 위치 서비스 | 제한 | ✓ | ✓ |
| 건강 데이터 | ✗ | ✓ | ✓ |
| 키보드 단축키 | ✓ | 외부 키보드 | 외부 키보드 |
| 멀티 윈도우 | ✓ | iPad | 태블릿 |
| 대시보드 (풍부한) | ✓ | 요약 | 요약 |
| 데이터 내보내기 | ✓ | 제한 | 제한 |
| 팀 관리 UI | ✓ | 기본 | 기본 |
| Zapier/Make | ✓ | ✗ | ✗ |

### 웨어러블 (Phase 3)

| 기능 | Apple Watch | Wear OS |
|------|-------------|---------|
| 음성 입력 | ✓ | ✓ |
| 오늘 태스크 보기 | ✓ | ✓ |
| 빠른 완료 | ✓ | ✓ |
| 알림 | ✓ | ✓ |
| 다꾸 | ✗ | ✗ |
| 프로젝트 편집 | ✗ | ✗ |

---

## 12.3 모노레포 구조

### Turborepo 기반

```
/mda-monorepo
├── /apps
│   ├── /web                  # Next.js 14
│   ├── /mobile               # Expo (React Native)
│   └── /backend              # Firebase Functions
├── /packages
│   ├── /shared               # 공통 타입·유틸·상수
│   ├── /shared-hooks         # 공통 React hooks
│   ├── /ui-web               # 웹 전용 컴포넌트
│   ├── /ui-mobile            # 모바일 전용 컴포넌트
│   ├── /ui-tokens            # 디자인 토큰 (공통)
│   ├── /prompts              # AI 프롬프트 (공통)
│   ├── /sdk                  # MDA API SDK (공통)
│   └── /config-eslint        # ESLint 공통 설정
├── /tooling
│   ├── /scripts              # 빌드·배포 스크립트
│   └── /skills               # Claude Code용 Skill
├── turbo.json
├── package.json
└── pnpm-workspace.yaml
```

### 패키지 의존성

```
apps/web → ui-web, shared, shared-hooks, ui-tokens, prompts, sdk
apps/mobile → ui-mobile, shared, shared-hooks, ui-tokens, prompts, sdk
apps/backend → shared, prompts, sdk
```

### Turbo 파이프라인

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**", "build/**"]
    },
    "lint": {},
    "test": {
      "dependsOn": ["build"]
    },
    "deploy": {
      "dependsOn": ["build", "test"]
    }
  }
}
```

---

## 12.4 코드 공유 전략

### 100% 공유

- 타입 정의 (`packages/shared`)
- 비즈니스 로직 (`packages/shared`)
- AI 프롬프트 (`packages/prompts`)
- API 호출 (`packages/sdk`)
- 디자인 토큰 (`packages/ui-tokens`)

### 부분 공유 (로직)

- 훅 (컨테이너 로직)
- Zustand 스토어
- 유틸 함수

### 개별 구현

- 네이티브 기능 (위젯, 센서, 공유)
- 플랫폼별 UI 컴포넌트
- 라우팅 (Next.js vs Expo Router)

---

## 12.5 웹 (Next.js 14)

### 스택

- **Next.js 14** (App Router)
- **Tailwind CSS** + **shadcn/ui**
- **Zustand** (상태)
- **TanStack Query** (서버 상태)
- **Firebase Web SDK** (Auth + Firestore)
- **React Hook Form** + **Zod** (폼)

### 라우트 구조

```
/app
  /(marketing)          # 공개 페이지
    /page.tsx           # 랜딩
    /pricing
    /blog
  /(auth)
    /login
    /signup
  /(app)                # 인증 필요
    /layout.tsx         # 사이드바
    /home
    /projects
      /[id]
    /calendar
    /dashboard
    /chat
    /journal
    /contacts
    /settings
  /api                  # API routes (Firebase Functions 프록시)
```

### 배포

- Vercel (기본)
- 커스텀 도메인 (my-daily-agent.com)
- SSR: 공개 페이지만
- CSR: 인증 필요 페이지

### 성능 목표

- LCP < 2s
- FID < 100ms
- CLS < 0.1
- Bundle size < 400KB (initial)

---

## 12.6 모바일 (Expo)

### 스택

- **Expo SDK 최신**
- **React Native 최신**
- **Expo Router** (파일 기반 라우팅)
- **Tamagui** 또는 **React Native Paper** (UI)
- **React Native Reanimated 3** (애니메이션)
- **Zustand** + **TanStack Query** (웹과 공유)
- **Firebase React Native SDK**

### 프로젝트 구조

```
/apps/mobile
  /app              # Expo Router
    /(tabs)
      /home
      /dashboard
      /chat
      /settings
    /project/[id]
    /task/[id]
    /journal
  /components
  /hooks
  /widgets
    /ios            # Swift (WidgetKit)
    /android        # Kotlin (Glance)
  /native-modules   # 플랫폼별 커스텀
  /assets
```

### 네이티브 기능

- **Expo Modules**: 공식 지원 기능
- **Custom Native Modules**: 위젯·통화녹음·건강 데이터 등
- **EAS Build**: CI/CD

### 배포

- **EAS Submit**: App Store · Play Store 자동 업로드
- **OTA Update**: JS/RN 번들 즉시 배포 (코드푸시 유사)

---

## 12.7 위젯 구현 (핵심 차별화)

### iOS: WidgetKit

```swift
// Swift
struct MDAWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(
      kind: "MDAWidget",
      provider: MDAWidgetProvider()
    ) { entry in
      MDAWidgetView(entry: entry)
    }
    .configurationDisplayName("MDA 빠른 입력")
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
  }
}

struct MDAWidgetView: View {
  var body: some View {
    HStack {
      Button(action: { /* App Intent: 녹음 */ }) {
        Image(systemName: "mic.fill")
      }
      Button(action: { /* App Intent: 필기 */ }) {
        Image(systemName: "pencil")
      }
      Button(action: { /* App Intent: 업로드 */ }) {
        Image(systemName: "paperclip")
      }
    }
  }
}
```

**App Intents**로 위젯 버튼 → 앱 기능 호출.

### Android: Glance API

```kotlin
// Kotlin
class MDAWidget : GlanceAppWidget() {
  @Composable
  override fun Content() {
    Row {
      Button(
        onClick = actionRunCallback<StartRecordingAction>(),
        text = { Text("🎙️") }
      )
      // ...
    }
  }
}

class StartRecordingAction : ActionCallback {
  override suspend fun onAction(context: Context, ...) {
    // Foreground Service로 녹음 시작
  }
}
```

### 공유 UI 원칙

두 플랫폼 위젯이 **동일한 시각 언어**:
- 크림 배경
- 3버튼 (🎙️ / ✏️ / 📎)
- 하단에 "오늘 기록 N개"

### 위젯 크기

| 크기 | 구성 |
|------|------|
| Small | 3버튼만 |
| Medium | 3버튼 + 오늘 입력 수 |
| Large | 3버튼 + 오늘 태스크 상위 3개 |

---

## 12.8 Deep Link 전략

### Universal Link / App Link

- `https://my-daily-agent.com/task/{id}`
- 앱 설치 시 → 앱에서 열림
- 미설치 → 웹에서 열림

### Custom Scheme (Fallback)

- `mda://task/{id}`
- `mda://widget/record`

### 사용 사례

- 알림 탭 → 해당 태스크로 점프
- 이메일 링크 → 보고서 열기
- 공유 URL → 앱에서 열기

---

## 12.9 상태 동기화

### 실시간 (Firestore onSnapshot)

- 모든 디바이스에서 즉시 반영
- 웹↔모바일↔웹 간 동시 편집 가능

### 오프라인 지원

- Firestore 오프라인 캐시 (전 플랫폼)
- 네트워크 복구 시 자동 머지
- 충돌: last-write-wins + 알림

### 세션 관리

- 한 계정 최대 동시 세션: 10개
- 디바이스별 "최근 활성 시각" 추적
- 수상한 접근 알림

---

## 12.10 인증 & 계정

### 지원 방식

- Google Sign-In (모든 플랫폼)
- Apple Sign-In (iOS 필수)
- 이메일 + 비밀번호 (웹 중심)
- 매직 링크 (이메일)
- 카카오 로그인 (한국 특화, Phase 2)

### 크로스 플랫폼 계정

- 동일 Firebase Auth 사용자
- 모든 디바이스 동기화

---

## 12.11 앱 크기 목표

### 초기 다운로드

- iOS: < 50MB
- Android: < 30MB (App Bundle)

### 런타임 메모리

- 모바일: < 200MB
- 웹: < 300MB (Chrome DevTools 기준)

---

## 12.12 빌드 & 배포

### 웹 배포

```
GitHub push → Vercel 자동 빌드 → Production
```

- `main` 브랜치 → Production
- `dev` 브랜치 → Staging
- PR → Preview URL

### 모바일 배포

```
main merge
  ↓
EAS Build (iOS + Android)
  ↓
EAS Submit → TestFlight / Internal Testing
  ↓
검증 후 → Production 릴리즈
```

- Semver 버전 관리
- Release Notes 자동 생성
- OTA 업데이트로 긴급 패치

### 환경 분리

- `dev` Firebase 프로젝트
- `staging` Firebase 프로젝트  
- `prod` Firebase 프로젝트

---

## 12.13 테스트 전략

### 단위 테스트

- Vitest (웹 + shared)
- Jest (모바일)
- 비즈니스 로직 커버리지 > 80%

### 통합 테스트

- Firebase Emulator 기반
- 주요 플로우 시나리오

### E2E 테스트

- Playwright (웹)
- Maestro (모바일)
- 핵심 플로우만

### 수동 테스트

- 실 디바이스 테스트 체크리스트
- 위젯·알림·백그라운드 기능 중심

---

## 12.14 모니터링

### 에러 추적

- Sentry (웹 + 모바일)
- Firebase Crashlytics (모바일)

### 성능 모니터링

- Vercel Analytics (웹)
- Firebase Performance (모바일)
- Custom metrics (중요 플로우)

### 사용자 분석

- PostHog 또는 Mixpanel
- 주요 이벤트: 입력·확인·완료·페르소나 전환

---

## 12.15 접근성 표준

### WCAG 2.1 AA 준수 (웹)

- 키보드 내비게이션
- 스크린 리더
- 컬러 대비 4.5:1 이상
- 포커스 표시

### 모바일 접근성

- VoiceOver / TalkBack
- Dynamic Type (iOS)
- TextSize (Android)
- 제스처 대안

---

## 12.16 플랫폼별 리스크

### 웹

- 브라우저 호환성 (Safari 제한적 기능)
- 오프라인 제한
- 위젯 불가

### iOS

- 앱스토어 심사 엄격
- 통화녹음 공식 API 없음
- 백그라운드 제약

### Android

- 파편화 (제조사별 커스텀 OS)
- Doze 모드에서 백그라운드 제한
- 삼성 갤럭시 특화 기능 활용 고려

### 공통

- Firebase 비용 (사용자 증가 시)
- Gemini API 비용
- 개인정보 규제 (K-PIPA, GDPR)

---

## 12.17 Phase 1 배포 목표

### 웹

- [ ] Vercel 배포
- [ ] 커스텀 도메인
- [ ] 기본 페이지 (/home, /project, /settings)
- [ ] 반응형 (모바일 브라우저)

### iOS

- [ ] TestFlight 내부 배포
- [ ] App Store 심사
- [ ] 기본 위젯
- [ ] 기본 알림

### Android

- [ ] Internal Testing
- [ ] Play Store 심사
- [ ] 기본 위젯
- [ ] 기본 알림

### Milestone

제작자(펀제주) 본인·가족 사용 가능 수준.
