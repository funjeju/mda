---
name: ui-component-library
description: 07_DESIGN_SYSTEM.md 기반 UI 컴포넌트 생성. 웜 톤 컬러, 라운드 코너, 다꾸 시스템, Light/Heavy 변형. React 컴포넌트 작성 시 로드한다.
---

# UI Component Library

## 디자인 토큰

```
배경: bg-cream (#F6F1E7), bg-ivory (#FDFBF7), bg-beige (#E9DFC9)
텍스트: text-ink-900 (#2D2A26), text-ink-500 (#7C756B), text-ink-300 (#ADA598)
강조: bg-mustard (#D4A547), bg-coral (#E07B5A)
보더: border-beige (#E9DFC9)
```

## 컴포넌트 패턴

```tsx
import { cn } from '@/lib/utils';

export function Button({ variant = 'primary', size = 'md', className, ...props }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-md transition',
        {
          'bg-mustard text-ivory hover:bg-mustard/90': variant === 'primary',
          'border border-beige hover:bg-cream': variant === 'secondary',
          'hover:bg-cream/50': variant === 'ghost',
          'bg-coral text-white': variant === 'danger',
        },
        {
          'h-8 px-3 text-sm': size === 'sm',
          'h-10 px-4 text-base': size === 'md',
          'h-12 px-6 text-lg': size === 'lg',
        },
        className
      )}
      {...props}
    />
  );
}
```

## 토큰 사용 원칙

- raw hex 금지 (`bg-[#F6F1E7]` ❌ → `bg-cream` ✅)
- semantic token 사용
- 8px 그리드 간격
- 라운드: `rounded-md` (버튼), `rounded-xl` (카드), `rounded-lg` (셀)

## 페르소나 변형

```tsx
function Cell({ task, persona }: { task: Task; persona: Persona }) {
  const isLight = persona === 'light';
  return (
    <div
      className={cn(
        'p-4 bg-cream border border-beige',
        isLight ? 'rounded-xl shadow-warm-sm' : 'rounded-md shadow-sm'
      )}
      role="button"
      aria-label={task.title}
      tabIndex={0}
    >
      {/* ... */}
    </div>
  );
}
```

## shadcn/ui 활용

```tsx
// shadcn 기본 컴포넌트를 MDA 토큰으로 오버라이드
import { Button } from '@/components/ui/button';

// variants는 cva()로 정의, className으로 토큰 교체
```

## 접근성 필수 체크

- 모든 interactive 요소에 `aria-label`
- 키보드 내비게이션 (`tabIndex={0}`, `onKeyDown`)
- 색상만으로 정보 전달 금지 (아이콘·레이블 병행)
- 대비 4.5:1 이상 (ink-500 on cream 기준 충족)

## 다꾸 시스템

```tsx
// 셀 데코레이션
interface TaskDecoration {
  emoji?: string;
  bg_color?: string;   // 'cream' | 'mint' | 'lavender' | ...
  border_color?: string;
  sticker_ids?: string[];
}

// 스티커 렌더링
function StickerLayer({ stickers }: { stickers: string[] }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {stickers.map(id => <Sticker key={id} id={id} />)}
    </div>
  );
}
```

## 자주 하는 실수

- ❌ hex 하드코딩 (`#F6F1E7`) — semantic token 사용
- ❌ `style={{ ... }}` 인라인 — Tailwind 클래스 사용
- ❌ 접근성 속성 누락 (`aria-label`, `role`)
- ❌ Heavy 페르소나에 과도한 장식
- ❌ Light 페르소나에 과도한 밀도

## 관련 문서

- `spec/07_DESIGN_SYSTEM.md` — 전체 디자인 시스템
- `apps/web/components/ui/` — shadcn 기본 컴포넌트
- `apps/web/components/features/` — 기능별 컴포넌트
