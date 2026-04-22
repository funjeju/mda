'use client';

import { useState, useCallback } from 'react';
import type { StandupReport } from '../../../app/api/standup/generate/route';
import { fetchWithAuth } from '../../../lib/auth/fetchWithAuth';

const C = {
  ivory:   '#FDFBF7',
  cream:   '#F6F1E7',
  beige:   '#E9DFC9',
  ink900:  '#2D2A26',
  ink500:  '#7C756B',
  ink300:  '#ADA598',
  mustard: '#D4A547',
  mint:    '#8FBFA9',
  coral:   '#EB8B7C',
};

interface Props {
  yesterdayDone: { title: string }[];
  todayTasks:    { title: string; priority: string }[];
  userName?: string;
}

export function StandupCard({ yesterdayDone, todayTasks, userName }: Props) {
  const [report, setReport] = useState<StandupReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth('/api/standup/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yesterdayDone, todayTasks, userName }),
      });
      if (!res.ok) throw new Error('생성 실패');
      setReport((await res.json()) as StandupReport);
    } catch {
      setError('스탠드업 생성에 실패했습니다');
    } finally {
      setLoading(false);
    }
  }, [yesterdayDone, todayTasks, userName]);

  if (dismissed) return null;

  return (
    <div className="rounded-2xl p-4 flex flex-col gap-3"
      style={{ background: C.cream, border: `1px solid ${C.beige}` }}>
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">☀️</span>
          <p className="text-sm font-semibold" style={{ color: C.ink900 }}>오늘의 스탠드업</p>
        </div>
        <button onClick={() => setDismissed(true)} className="text-xs" style={{ color: C.ink300 }}>
          ×
        </button>
      </div>

      {!report && !loading && (
        <div className="flex flex-col gap-2">
          <p className="text-xs" style={{ color: C.ink500 }}>
            어제 {yesterdayDone.length}개 완료 · 오늘 {todayTasks.length}개 예정
          </p>
          <button
            onClick={() => void generate()}
            className="text-xs px-3 py-1.5 rounded-xl font-medium self-start"
            style={{ background: C.mustard, color: '#fff' }}
          >
            ✨ AI 스탠드업 생성
          </button>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 py-1">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full animate-bounce"
                style={{ background: C.mustard, animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
          <p className="text-xs" style={{ color: C.ink300 }}>생성 중...</p>
        </div>
      )}

      {error && (
        <p className="text-xs" style={{ color: C.coral }}>{error}</p>
      )}

      {report && (
        <div className="flex flex-col gap-2.5">
          <p className="text-sm font-medium" style={{ color: C.mustard }}>{report.greeting}</p>

          <div className="flex flex-col gap-1.5">
            <Row icon="✅" label="어제" text={report.yesterday} />
            <Row icon="📋" label="오늘" text={report.today} />
            {report.blocker && <Row icon="⚠️" label="블로커" text={report.blocker} color={C.coral} />}
          </div>

          {report.highlight && (
            <div className="rounded-xl px-3 py-2 flex items-center gap-2"
              style={{ background: C.mustard + '18', border: `1px solid ${C.mustard}40` }}>
              <span className="text-sm">🎯</span>
              <div>
                <p className="text-[10px] font-medium" style={{ color: C.mustard }}>오늘의 집중</p>
                <p className="text-xs font-semibold" style={{ color: C.ink900 }}>{report.highlight}</p>
              </div>
            </div>
          )}

          <button
            onClick={() => void generate()}
            className="text-[10px] self-start"
            style={{ color: C.ink300 }}
          >
            다시 생성
          </button>
        </div>
      )}
    </div>
  );
}

function Row({ icon, label, text, color = C.ink500 }: { icon: string; label: string; text: string; color?: string }) {
  return (
    <div className="flex gap-2 items-start">
      <span className="text-xs flex-shrink-0 mt-0.5">{icon}</span>
      <div>
        <span className="text-[10px] font-semibold mr-1" style={{ color: C.ink300 }}>{label}</span>
        <span className="text-xs" style={{ color }}>{text}</span>
      </div>
    </div>
  );
}
