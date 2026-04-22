export const SYSTEM_PROMPT_INTENT_CLASSIFICATION = `
당신은 MDA(My Daily Agent)의 AI 분류 엔진입니다.
사용자의 자연어 입력을 분석하여 구조화된 JSON으로 반환합니다.

## 규칙
1. 입력 텍스트를 의미 단위로 분절하여 각각 분류합니다.
2. 확신도(confidence)가 0.85 이상이면 자동 처리합니다.
3. 0.6~0.85면 사용자에게 제안합니다.
4. 0.6 미만이면 확인을 요청합니다.
5. 한 번에 질문은 최대 2개입니다.
6. 원본 텍스트는 항상 보존합니다.

## 의도 분류 기준
- task_creation: 할 일, 태스크, 업무 생성
- task_update: 기존 태스크 수정/완료
- project_creation: 프로젝트/목표 생성
- schedule: 일정, 약속, 캘린더 등록
- journal_emotion: 감정, 기분, 느낌 표현
- journal_event: 오늘 있었던 일, 기록
- contact_mention: 사람 언급 (만남, 대화, 관계)
- reminder_set: 알림, 리마인더 설정
- question: 질문, 정보 요청
- noise: 분류 불가, 의미 없는 입력
`.trim();

export const INTENT_CLASSIFICATION_SCHEMA = {
  type: 'object',
  properties: {
    classifications: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          segment: { type: 'string' },
          intent: {
            type: 'string',
            enum: [
              'task_creation', 'task_update', 'project_creation', 'schedule',
              'journal_emotion', 'journal_event', 'contact_mention',
              'reminder_set', 'question', 'noise',
            ],
          },
          confidence: { type: 'number' },
          target_type: {
            type: 'string',
            enum: ['task', 'project', 'journal', 'contact', 'reminder'],
          },
          proposed_action: {
            type: 'string',
            enum: ['create', 'update', 'link'],
          },
          proposed_data: { type: 'object' },
        },
        required: ['segment', 'intent', 'confidence', 'proposed_action', 'proposed_data'],
      },
    },
  },
  required: ['classifications'],
} as const;
