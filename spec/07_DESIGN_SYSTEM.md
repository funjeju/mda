# 07. 디자인 시스템

MDA의 디자인 토큰, 컴포넌트, 다꾸 시스템을 정의한다. 구현은 **Tailwind + shadcn/ui**(웹) + **Tamagui 또는 React Native Paper**(모바일)로 공통 토큰을 공유한다.

---

## 7.1 디자인 철학

### 3대 원칙

1. **웜 & 코지** — 차갑지 않은, 손으로 만든 느낌
2. **라이트와 헤비의 공존** — 같은 토큰, 다른 밀도
3. **다꾸는 권리** — 사용자가 언제든 공간을 소유

### 레퍼런스

- **분위기**: Finch, Structured, Moleskine Journey, 노션 한국어 테마
- **정보 밀도**: Things, Linear (조용 모드)
- **한국적 감성**: 카카오 이모티콘, 토스 일러스트

---

## 7.2 컬러 시스템

### Base Palette (웜 톤)

```
--color-ivory:       #FDFBF7   /* 기본 배경 */
--color-cream:       #F6F1E7   /* 카드 배경 */
--color-beige:       #E9DFC9   /* 구분선 */
--color-sand:        #C9B896   /* 서브 */

--color-ink-900:     #2D2A26   /* 주요 텍스트 */
--color-ink-700:     #4A453E   /* 보조 텍스트 */
--color-ink-500:     #7C756B   /* 힌트 */
--color-ink-300:     #ADA598   /* disabled */
--color-ink-100:     #E8E3D7   /* divider light */
```

### Accent Palette (포인트)

```
--color-peach:       #F4A587   /* 활기·경고 */
--color-salmon:      #E88468
--color-mustard:     #D4A547   /* 강조·완료 */
--color-mint:        #8FBFA9   /* 성공·평온 */
--color-sage:        #6FA088
--color-lavender:    #B5A7D4   /* 감성·일기 */
--color-rose:        #D4A5B5   /* 관계·따뜻 */
--color-coral:       #EB8B7C
```

### Semantic Tokens

```
--color-bg:              var(--color-ivory)
--color-bg-card:         var(--color-cream)
--color-bg-elevated:     #FFFFFF
--color-text:            var(--color-ink-900)
--color-text-secondary:  var(--color-ink-700)
--color-text-hint:       var(--color-ink-500)
--color-border:          var(--color-beige)
--color-divider:         var(--color-ink-100)

--color-primary:         var(--color-mustard)
--color-success:         var(--color-mint)
--color-warning:         var(--color-peach)
--color-danger:          var(--color-coral)
--color-info:            var(--color-lavender)

--color-business:        var(--color-mustard)
--color-journal:         var(--color-lavender)
--color-contact:         var(--color-rose)
```

### Dark Mode

```
--color-bg-dark:         #1C1917
--color-bg-card-dark:    #27231F
--color-bg-elevated-dark:#34302B
--color-text-dark:       #F5F1E8
--color-text-secondary-dark: #C5BEB0
--color-border-dark:     #3D3833

/* accent는 동일하되 채도 약간 낮춤 */
```

### 테마 프리셋 (다꾸용)

| 테마 ID | 이름 | 주요 컬러 |
|---------|------|-----------|
| `soft_cream` | 소프트 크림 | ivory + peach + mint (기본) |
| `mint_breeze` | 민트 브리즈 | mint 강조 |
| `peach_garden` | 피치 가든 | peach + rose |
| `lavender_moon` | 라벤더 문 | lavender + sage |
| `mustard_autumn` | 머스터드 가을 | mustard + coral |
| `charcoal_calm` | 차콜 캄 | 다크 베이스 + mint |
| `sakura` | 벚꽃 | rose + 화이트 + 핑크 (Heavy는 hidden) |
| `zen_white` | 젠 화이트 | 화이트 + 검정 (Heavy 추천) |

---

## 7.3 타이포그래피

### 폰트 스택

**한국어 + 영어 혼용**:

```css
--font-display: 'SUIT', 'Pretendard', -apple-system, sans-serif;
--font-body:    'Pretendard', -apple-system, 'Apple SD Gothic Neo', sans-serif;
--font-mono:    'JetBrains Mono', 'D2Coding', monospace;
--font-handwriting: 'Gaegu', 'Nanum Pen Script', cursive; /* 다꾸용 */
```

**이유**:
- Pretendard: 본문, 균형감, 무료 상업 사용
- SUIT: 헤드라인, 둥근 감성
- Gaegu: 손글씨 다꾸용

### 크기 스케일

```
--text-xs:    11px / 16px (mobile: 12px / 18px)
--text-sm:    13px / 20px
--text-base:  15px / 24px
--text-lg:    17px / 26px
--text-xl:    20px / 30px
--text-2xl:   24px / 34px
--text-3xl:   30px / 40px
--text-4xl:   36px / 48px
--text-5xl:   48px / 56px (display)
```

### 무게

```
--font-weight-regular:  400
--font-weight-medium:   500
--font-weight-semibold: 600
--font-weight-bold:     700
```

### 페르소나별 타이포 밀도

- **Light**: 기본 크기 +1px (읽기 쉽게), line-height 넉넉
- **Medium**: 기본
- **Heavy**: 기본 크기 -1px (정보 밀도), line-height 조여짐

---

## 7.4 간격 (Spacing)

8px 그리드 기반:

```
--space-0:   0
--space-1:   4px
--space-2:   8px
--space-3:   12px
--space-4:   16px
--space-5:   20px
--space-6:   24px
--space-8:   32px
--space-10:  40px
--space-12:  48px
--space-16:  64px
--space-20:  80px
--space-24:  96px
```

### 페르소나별 밀도

- Light: space-6 (24px) 기본 갭
- Medium: space-4 (16px)
- Heavy: space-3 (12px)

---

## 7.5 라운드 코너 (Radius)

```
--radius-sm:  6px
--radius-md:  10px  /* 기본 */
--radius-lg:  16px
--radius-xl:  24px
--radius-2xl: 32px
--radius-full: 9999px

--radius-cell: var(--radius-lg)    /* 만다라트 셀 */
--radius-card: var(--radius-xl)    /* 카드 */
--radius-button: var(--radius-md)
--radius-input: var(--radius-md)
```

웜 톤 + 큰 라운드 = 코지 감성 핵심.

---

## 7.6 그림자

```
--shadow-sm:  0 1px 2px rgba(45, 42, 38, 0.04)
--shadow-md:  0 4px 12px rgba(45, 42, 38, 0.06)
--shadow-lg:  0 8px 24px rgba(45, 42, 38, 0.08)
--shadow-xl:  0 16px 40px rgba(45, 42, 38, 0.10)

/* 따뜻한 그림자 — 크림/베이지 톤 */
--shadow-warm-sm: 0 2px 8px rgba(201, 184, 150, 0.15)
--shadow-warm-md: 0 4px 16px rgba(201, 184, 150, 0.20)
```

Light 페르소나는 warm 그림자 사용, Heavy는 일반 그림자.

---

## 7.7 모션 (Animation)

### 기본 Duration

```
--duration-instant: 100ms
--duration-fast:    200ms
--duration-normal:  300ms
--duration-slow:    500ms
--duration-slower:  800ms
```

### Easing

```
--ease-standard:    cubic-bezier(0.4, 0.0, 0.2, 1)
--ease-accelerate:  cubic-bezier(0.4, 0.0, 1, 1)
--ease-decelerate:  cubic-bezier(0.0, 0.0, 0.2, 1)
--ease-bounce:      cubic-bezier(0.68, -0.55, 0.265, 1.55)
```

### 주요 애니메이션

| 용도 | Duration | Easing |
|------|----------|--------|
| 페이지 전환 | normal | decelerate |
| 버튼 press | instant | standard |
| 만다라트 셀 선택 | fast | bounce |
| 피벗 전환 | slower (2500ms) | decelerate |
| 태스크 완료 폭죽 | 1000ms | bounce |
| 다꾸 스티커 부착 | 400ms | bounce |
| 대화 타이핑 효과 | — | — (30ms per char) |

---

## 7.8 아이콘

### 라이브러리

- **Lucide Icons**: 기본 (둥글고 따뜻함)
- **Tabler Icons**: 추가 필요 시
- **커스텀 이모지**: 다꾸용

### 스타일

- 스트로크 1.5~2px
- 라운드 cap
- 24px 기본 크기
- Heavy는 20px

### 카테고리 매핑

```
업무:  💼 briefcase
일기:  📓 book
관계:  👥 users
시간:  ⏰ clock
완료:  ✅ check-circle
녹음:  🎙️ mic
필기:  ✏️ edit
업로드: 📎 paperclip
AI:    🤖 sparkles
홈:    🏠 home
설정:  ⚙️ settings
```

---

## 7.9 컴포넌트 라이브러리

### Button

```tsx
<Button variant="primary" size="md">완료</Button>
<Button variant="secondary" size="md">취소</Button>
<Button variant="ghost" size="sm">더보기</Button>
<Button variant="danger" size="md">삭제</Button>
```

**변형**:
- primary: mustard 배경
- secondary: 테두리만, beige
- ghost: 배경 없음
- danger: coral
- success: mint

**크기**:
- sm: 32px 높이
- md: 40px 높이
- lg: 48px 높이

### Card

```tsx
<Card>
  <CardHeader>
    <CardTitle>...</CardTitle>
    <CardDescription>...</CardDescription>
  </CardHeader>
  <CardContent>...</CardContent>
  <CardFooter>...</CardFooter>
</Card>
```

기본: cream 배경, radius-xl, shadow-warm-sm.

### MandaraCell

```tsx
<MandaraCell
  task={task}
  size="md"           // sm / md / lg
  status="in_progress"
  decoration={decoration}
  onTap={handleTap}
  onLongPress={handleLongPress}
/>
```

상태별 시각:
- `pending`: cream 배경, 회색 텍스트
- `in_progress`: mustard 테두리, 진행률 바
- `done`: mint 배경, 체크 오버레이
- `blocked`: coral 테두리, 경고 아이콘
- `unassigned`: 회색 점선 테두리 (시각적 부채)

### Input

```tsx
<Input placeholder="..." />
<Textarea rows={4} />
<Combobox options={...} />
<DatePicker />
<TimePicker />
```

모두 ivory 배경, beige 테두리, radius-md.

### Dialog / Sheet

- Dialog: 데스크톱 모달
- Sheet: 모바일 bottom sheet
- 둘 다 동일한 API (Radix-like)

### Navigation

- TabBar: 하단 탭 (모바일)
- Sidebar: 좌측 (데스크톱)
- Breadcrumb: 경로 표시

### Feedback

- Toast: 우측 상단 (짧은 메시지)
- Banner: 화면 상단 (중요 공지)
- Empty State: 빈 상태
- Skeleton: 로딩

---

## 7.10 만다라트 특수 컴포넌트

### MandaraGrid

```tsx
<MandaraGrid
  center={project}
  cells={sections}           // 최대 8개
  pivotAxis="section"        // section | assignee | time
  onCellTap={handleTap}
  onCellReorder={handleReorder}
/>
```

### 그리드 레이아웃

```
┌───┬───┬───┐
│ 0 │ 1 │ 2 │
├───┼───┼───┤
│ 7 │ C │ 3 │
├───┼───┼───┤
│ 6 │ 5 │ 4 │
└───┴───┴───┘
```

중심 셀은 프로젝트/섹션 제목, 주변 8셀은 하위 항목.

### 재귀 진입 애니메이션

셀 탭 시:
1. 선택된 셀이 중심으로 이동하면서 확대 (400ms)
2. 다른 셀 페이드 아웃 (200ms)
3. 하위 만다라트가 페이드 인 (300ms)

뒤로가기 시 역순.

### PivotSwitcher

```tsx
<PivotSwitcher
  current="section"
  options={["section", "assignee", "time"]}
  onChange={handlePivotChange}
/>
```

---

## 7.11 Light vs Heavy 비교

### Light 모드 특성

- 큰 라운드 (radius-xl 이상)
- warm shadow
- 넓은 여백 (space-6 기본)
- 스티커·장식 많음
- 둥근 이모지 아이콘
- Gaegu 손글씨 폰트 부분 사용
- 완료 시 폭죽 등 애니메이션

### Heavy 모드 특성

- 작은 라운드 (radius-md)
- 평범 shadow
- 타이트 여백 (space-3)
- 장식 최소
- 라인 아이콘
- Pretendard 일관 사용
- 완료 시 간결한 체크 애니메이션

### 토글 가능

- 페르소나 설정과 독립적으로 개별 기능(장식·애니메이션) 조절 가능
- Heavy 유저도 축하 애니메이션 원하면 켤 수 있음

---

## 7.12 다꾸 (Decoration) 시스템

### 목적

**감정적 소유감 = 리텐션**. 사용자가 "내 공간"으로 느끼게.

### 커스터마이징 요소

#### 1. 테마 프리셋

앞서 정의한 테마 프리셋 8+개 중 선택.

#### 2. 스티커

```
- 기본 스티커팩 (무료): 30개
- 계절 스티커팩 (무료): 봄/여름/가을/겨울
- 프리미엄 팩 (유료, $1.99~$4.99):
  · 제주 풍경 팩
  · 아이돌 팩 (라이선스)
  · 일러스트 작가 팩
  · 이모지 대형 팩
```

#### 3. 셀 커스텀

개별 태스크/섹션 셀에:
- 이모지 배지
- 배경 컬러 (8색)
- 테두리 스타일 (dotted, dashed, double, etc.)
- 배경 패턴 (subtle stripe, dot, etc.)

#### 4. 폰트 옵션

- 기본 (Pretendard)
- 손글씨 (Gaegu)
- 둥근 (SUIT)
- 세리프 (Noto Serif KR)

#### 5. 홈 배경

- 단색
- 그라데이션 (12개)
- 패턴 (8개)
- 사용자 업로드 이미지 (Plus 이상)

#### 6. 완료 애니메이션

- 폭죽
- 꽃잎 떨어지기
- 별가루
- 스탬프 ("완료!" "짱!")
- 미니멀 체크
- 없음

### 다꾸 경제 (Phase 3)

- 일부 스티커팩 구매 (단건 or 서브스크립션)
- 사용자 직접 스티커 업로드 (Plus)
- 커뮤니티 공유 (Business)

---

## 7.13 일관성 규칙

### 컴포넌트 크기 동조

같은 컨텍스트에서 크기 통일:
- 카드 내부 버튼은 sm
- 메인 CTA는 lg
- 인라인 액션은 ghost

### 컬러 사용 원칙

- **한 화면에 주요 컬러 3개 이내**
- mustard는 primary 액션에만
- 일기는 lavender, 업무는 mustard로 구분
- 경고 coral, 성공 mint

### 여백 규칙

- 형제 요소 간: space-3 또는 space-4
- 섹션 간: space-6 또는 space-8
- 페이지 여백: 모바일 16px, 데스크톱 32px

---

## 7.14 반응형

### Breakpoints

```
--bp-sm:  640px   /* 큰 폰 */
--bp-md:  768px   /* 태블릿 */
--bp-lg:  1024px  /* 데스크톱 */
--bp-xl:  1280px
--bp-2xl: 1536px
```

### 레이아웃 변화

| 화면 | 네비 | 만다라트 | 사이드 |
|------|------|----------|--------|
| 모바일 | 하단 탭 | 3x3 꽉 채움 | 없음 |
| 태블릿 | 하단 탭 또는 사이드 | 3x3 중앙 | 선택적 |
| 데스크톱 | 좌측 사이드바 | 중앙 고정 너비 | AI 컴패니언 패널 |

---

## 7.15 로딩 / 빈 / 에러 일러스트

각 상태에 전용 일러스트:

- **로딩**: 펜으로 동그라미 그리는 루프 애니메이션
- **빈 상태 - 프로젝트**: 작은 씨앗 일러스트
- **빈 상태 - 오늘 할 일**: 커피잔과 여유
- **에러 - 네트워크**: 구름 위 고양이
- **에러 - AI**: 당황한 로봇

**한국 일러스트레이터 섭외 권장** (Figma Community 또는 Dribbble).

---

## 7.16 디자인 토큰 구현 (코드)

### Tailwind Config (웹)

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        ivory: '#FDFBF7',
        cream: '#F6F1E7',
        beige: '#E9DFC9',
        // ...
      },
      fontFamily: {
        display: ['SUIT', ...defaultFonts],
        body: ['Pretendard', ...defaultFonts],
      },
      borderRadius: {
        cell: '16px',
        card: '24px',
      },
      boxShadow: {
        'warm-sm': '0 2px 8px rgba(201, 184, 150, 0.15)',
        'warm-md': '0 4px 16px rgba(201, 184, 150, 0.20)',
      },
    },
  },
};
```

### Theme Provider (React)

```tsx
<ThemeProvider
  theme={activeTheme}
  persona={user.persona}
  mode={user.theme_mode} // light | dark
>
  <App />
</ThemeProvider>
```

### React Native (Tamagui)

```ts
// tamagui.config.ts
const tokens = {
  color: { /* ... */ },
  space: { /* ... */ },
  radius: { /* ... */ },
};
```

---

## 7.17 Figma 설정

### 페이지 구조

```
MDA Design System
├── 00_Cover
├── 01_Tokens (Variables)
├── 02_Typography
├── 03_Components
│   ├── Atoms (Button, Input, etc.)
│   ├── Molecules (Card, Cell, etc.)
│   └── Organisms (Header, Dashboard, etc.)
├── 04_Screens
│   ├── Mobile
│   ├── Tablet
│   └── Desktop
├── 05_Decoration (Sticker Packs, Themes)
└── 06_Illustrations
```

### Variables 연동

- Figma Variables → Tokens JSON 내보내기
- Style Dictionary로 코드 토큰 생성
- 디자인 수정 시 자동 반영

---

## 7.18 구현 우선순위

### Phase 1

- [ ] 기본 토큰 (컬러·폰트·여백·라운드)
- [ ] Light 테마
- [ ] 기본 컴포넌트 (Button·Card·Input·Dialog)
- [ ] MandaraGrid 컴포넌트
- [ ] 기본 애니메이션 (fade, slide)

### Phase 2

- [ ] Heavy 모드 토글
- [ ] 다크 모드
- [ ] 테마 프리셋 8개
- [ ] 기본 스티커팩
- [ ] 피벗 전환 애니메이션

### Phase 3

- [ ] 프리미엄 스티커팩
- [ ] 사용자 스티커 업로드
- [ ] 커스텀 폰트 업로드
- [ ] 완료 애니메이션 선택
