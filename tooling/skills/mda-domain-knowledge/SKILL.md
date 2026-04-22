---
name: mda-domain-knowledge
description: MDA(마이 데일리 에이전트) 프로덕트의 핵심 개념·용어·설계 결정을 참조한다. 만다라트·Dual Asset·페르소나·저녁 보고서 등 MDA 고유 개념을 다룰 때 이 Skill을 로드한다.
---

# MDA Domain Knowledge

## 북극성

"나의 하루를 — 라이프든 비즈니스든 — 가장 스마트하고 편리하게,
치밀하고 불안하지 않게 요약하고 관리해주는 솔루션"

## 10대 결정

1. 이름: MDA
2. 타겟: Light/Medium/Heavy
3. 범위: Phase 1+2+3
4. 플랫폼: 웹+iOS+Android
5. 프라이버시: Firebase 기본, E2E 업그레이드 가능
6. 협업: Phase 1부터
7. 연동: Calendar+Notion+Gmail+Photos+Location+Health
8. 수익: Freemium + B2B
9. 디자인: 웜 톤 + 스티커 다꾸
10. 개발: Claude Code 주도

## 핵심 개념

- **만다라트**: 3x3 재귀 격자 (Project→Section→Task, 최대 8개 셀)
- **다축 피벗**: 섹션/팀/시간 축 전환으로 같은 데이터를 다각도로
- **멀티 뷰**: 투두/만다라트/캘린더/간트 — 페르소나별 기본값 다름
- **Dual Asset**: 한 입력에서 업무(Task) + 일기(JournalEntry) 동시 생성
- **독립 vs 프로젝트 태스크**: project_id optional — tasks_independent 컬렉션
- **저녁 보고서**: 매일 21:00 자동 생성 (입력 3개 이상 시)
- **3버튼 위젯**: 🎙️ 음성 / ✏️ 타이핑 / 📎 파일
- **페르소나**: Light(감성·간단) / Medium(균형) / Heavy(데이터·팀)
- **다꾸**: 스티커·테마·셀 커스터마이징 수익 생태계

## 페르소나 요약

| 페르소나 | 대표 | 특징 |
|---------|------|------|
| Light | 27세 마케터 | 독립 태스크 위주, 다꾸 강조, 알림 gentle |
| Medium | 34세 프리랜서 | 프로젝트+일상, 균형 |
| Heavy | 41세 PM | 팀+간트+대시보드, 데이터 중심 |

## 데이터 모델 핵심

```
teams/{teamId}
  ├─ projects/{projectId}
  │   ├─ sections/{sectionId}
  │   └─ tasks/{taskId}
  ├─ tasks_independent/{taskId}
  ├─ daily_entries/{entryId}       ← 원본 입력
  ├─ journal_entries/{entryId}     ← 일기 (기본 private)
  ├─ daily_reports/{reportId}      ← 저녁 보고서
  └─ person_contacts/{contactId}   ← 관계 관리

users/{userId}
  └─ settings/{settingId}
      ├─ notification_prefs
      ├─ integrations
      └─ subscription
```

## 절대 금지

- 북극성 어기는 기능 추가
- "치밀하되 불안하지 않게" 균형 깨기 (죄책감 유발 알림 등)
- 사용자에게 메타 작업 부담 (AI가 대신해야 함)
- 죄책감 유발 알림 문구 ("아직 안 하셨나요?")
- 일기를 업무와 혼합 저장/노출

## 관련 문서

- `spec/00_MASTER.md` — 북극성·10대 결정
- `spec/01_PRODUCT_VISION.md` — 비전
- `spec/02_CORE_CONCEPTS.md` — 만다라트·피벗 상세
- `spec/03_DATA_MODEL.md` — Firestore 스키마
