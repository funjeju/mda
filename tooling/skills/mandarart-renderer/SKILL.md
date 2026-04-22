---
name: mandarart-renderer
description: 만다라트(3x3 재귀 격자) UI 구현. 셀 레이아웃, 재귀 진입 애니메이션, 피벗 전환. 만다라트 관련 컴포넌트 작성 시 로드한다.
---

# Mandarart Renderer

## 셀 인덱스 → 위치

```
index: 0=top-left  1=top-center  2=top-right
       7=mid-left  C=CENTER      3=mid-right
       6=bot-left  5=bot-center  4=bot-right

시계 방향 0→1→2→3→4→5→6→7, 중앙이 C
```

## 기본 레이아웃

```tsx
export function MandaraGrid({ center, cells }: { center: Section; cells: (Task | null)[] }) {
  // positions 배열로 9칸 정렬 (인덱스 4가 center)
  const positions = [
    cells[0], cells[1], cells[2],
    cells[7], center,   cells[3],
    cells[6], cells[5], cells[4],
  ];

  return (
    <div className="grid grid-cols-3 gap-2 aspect-square w-full max-w-[700px]">
      {positions.map((cell, i) => (
        <MandaraCell
          key={cell?.id ?? `empty-${i}`}
          data={cell}
          isCenter={i === 4}
        />
      ))}
    </div>
  );
}
```

## 재귀 진입 애니메이션

```tsx
import { AnimatePresence, motion } from 'framer-motion';

<AnimatePresence mode="wait">
  <motion.div
    key={currentSectionId}
    initial={{ opacity: 0, scale: 0.85 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 1.15 }}
    transition={{ duration: 0.3, ease: 'easeOut' }}
  >
    <MandaraGrid center={currentSection} cells={tasks} />
  </motion.div>
</AnimatePresence>
```

## 피벗 전환

```tsx
type PivotAxis = 'section' | 'assignee' | 'time';

function useMandaraPivot(tasks: Task[], axis: PivotAxis) {
  return useMemo(() => {
    switch (axis) {
      case 'section':
        return groupBy(tasks, 'section_id').map(sectionToCell);
      case 'assignee':
        return groupBy(tasks, 'assignee_id').map(assigneeToCell);
      case 'time':
        return groupByTimeBlock(tasks).map(timeToCell);
    }
  }, [tasks, axis]);
}
```

## 진행률 계산

```typescript
function calcProgress(tasks: Task[]): number {
  if (tasks.length === 0) return 0;
  const done = tasks.filter(t => t.status === 'done').length;
  return Math.round((done / tasks.length) * 100);
}

// progress_percent는 Firestore에 denormalized로 저장
// Task 상태 변경 시 Section의 progress_percent 업데이트 필요
```

## 반응형 크기

| 화면 | 크기 |
|------|------|
| 모바일 | `w-full aspect-square` |
| 태블릿 | `max-w-[500px]` |
| 데스크톱 | `max-w-[700px]` |

## 접근성

```tsx
<div
  role="button"
  tabIndex={0}
  aria-label={`${section.title}: ${tasks.length}개 태스크, ${progress}% 완료`}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') onEnter();
    if (e.key === 'ArrowRight') moveFocus('right');
  }}
/>
```

## 자주 하는 실수

- ❌ 셀 인덱스 순서 틀림 (시계방향, 4번이 CENTER)
- ❌ 8개 초과 허용 (Section 최대 8개)
- ❌ `progress_percent` 계산 오류 (완료율 = done/total, 취소는 제외)
- ❌ 애니메이션 duration > 0.5초 (지루함)
- ❌ 재귀 깊이 무한 (Project→Section까지만, Task 이하 없음)

## 관련 문서

- `spec/02_CORE_CONCEPTS.md` — 만다라트 개념
- `spec/06_UI_UX_SPEC.md` — 만다라트 UI 상세
- `apps/web/components/features/mandara/` — 구현
