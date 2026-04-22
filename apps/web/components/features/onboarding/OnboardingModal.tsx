'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProjects } from '@/lib/hooks/useProjects';

const C = {
  ivory:   '#FDFBF7',
  cream:   '#F6F1E7',
  beige:   '#E9DFC9',
  ink900:  '#2D2A26',
  ink500:  '#7C756B',
  ink300:  '#ADA598',
  mustard: '#D4A547',
};

const TEMPLATES = [
  { emoji: '💪', title: '건강 & 운동', hint: '운동 루틴, 식단, 수면 관리' },
  { emoji: '📚', title: '학습 & 자기계발', hint: '공부 계획, 독서, 강의' },
  { emoji: '💼', title: '업무 & 커리어', hint: '프로젝트, 회의, 목표' },
  { emoji: '🎨', title: '취미 & 창작', hint: '그림, 음악, 글쓰기' },
  { emoji: '🌱', title: '직접 만들기', hint: '나만의 목표 구조화' },
];

interface Props {
  teamId: string;
  userId: string;
  userName: string | null;
  onDismiss?: () => void;
}

export function OnboardingModal({ teamId, userId, userName, onDismiss }: Props) {
  const [step, setStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const { createProject } = useProjects(teamId);
  const router = useRouter();

  const firstName = userName?.split(' ')[0] ?? '사용자';

  async function handleStart() {
    if (selectedTemplate === null) return;
    const tmpl = TEMPLATES[selectedTemplate]!;
    setCreating(true);
    try {
      const docId = await createProject(
        { title: tmpl.title, emoji: tmpl.emoji },
        userId,
      );
      if (tmpl.title === '직접 만들기') {
        router.push('/projects');
      } else {
        router.push(`/projects/${docId}`);
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(45,42,38,0.5)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-md rounded-3xl p-6 flex flex-col gap-5"
        style={{ background: C.ivory, border: `1px solid ${C.beige}` }}
      >
        {step === 0 ? (
          <>
            <div className="text-center">
              <span className="text-5xl">🗒️</span>
              <h2 className="text-xl font-bold mt-3" style={{ color: C.ink900 }}>
                환영합니다, {firstName}님!
              </h2>
              <p className="text-sm mt-2" style={{ color: C.ink500 }}>
                MDA는 할 일·일정·감정을 자유롭게 입력하면{'\n'}
                AI가 자동으로 분류하고 만다라트로 구조화합니다
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {[
                { icon: '🤖', text: 'AI가 텍스트/음성을 자동 분류' },
                { icon: '🔷', text: '만다라트로 목표를 9칸으로 세분화' },
                { icon: '📓', text: '감정 일기 + 이브닝 리포트' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl p-3"
                  style={{ background: C.cream }}>
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-sm" style={{ color: C.ink900 }}>{item.text}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setStep(1)}
              className="w-full py-3 rounded-2xl font-semibold text-sm"
              style={{ background: C.mustard, color: '#fff' }}
            >
              시작하기 →
            </button>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="w-full text-xs py-1"
                style={{ color: C.ink300 }}
              >
                나중에 하기
              </button>
            )}
          </>
        ) : (
          <>
            <div>
              <h2 className="text-lg font-bold" style={{ color: C.ink900 }}>
                첫 프로젝트 주제를 선택하세요
              </h2>
              <p className="text-sm mt-1" style={{ color: C.ink500 }}>
                나중에 얼마든지 추가하거나 변경할 수 있습니다
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {TEMPLATES.map((tmpl, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedTemplate(i)}
                  className="flex items-center gap-3 rounded-xl p-3 text-left transition-all"
                  style={{
                    background: selectedTemplate === i ? C.mustard + '18' : C.cream,
                    border: `1.5px solid ${selectedTemplate === i ? C.mustard : C.beige}`,
                  }}
                >
                  <span className="text-2xl">{tmpl.emoji}</span>
                  <div>
                    <p className="text-sm font-medium" style={{ color: C.ink900 }}>{tmpl.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: C.ink500 }}>{tmpl.hint}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep(0)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: C.cream, color: C.ink500 }}
              >
                이전
              </button>
              <button
                onClick={handleStart}
                disabled={selectedTemplate === null || creating}
                className="flex-2 px-6 py-2.5 rounded-xl text-sm font-semibold"
                style={{
                  background: selectedTemplate !== null ? C.mustard : C.beige,
                  color: selectedTemplate !== null ? '#fff' : C.ink300,
                  flex: 2,
                }}
              >
                {creating ? '생성 중...' : '만들기'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
