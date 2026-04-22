'use client';

import { useState } from 'react';
import type { Task } from '@mda/shared';
import type { JournalEntryDoc } from '@/lib/hooks/useJournal';
import type { EveningReport } from '@/app/api/evening-report/route';
import { fetchWithAuth } from '@/lib/auth/fetchWithAuth';

const C = {
  cream:   '#F6F1E7',
  beige:   '#E9DFC9',
  ink900:  '#2D2A26',
  ink500:  '#7C756B',
  ink100:  '#E8E3D7',
  mustard: '#D4A547',
};

const MOOD_BG: Record<string, string> = {
  positive: '#F0F7F4',
  neutral:  '#F6F1E7',
  negative: '#FDF4F3',
};

interface Props {
  tasks: Task[];
  journals: JournalEntryDoc[];
}

export function EveningReportCard({ tasks, journals }: Props) {
  const [report, setReport] = useState<EveningReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/evening-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks: tasks.map((t) => ({ title: t.title, status: t.status })),
          journals: journals.map((j) => ({ content: j.content, emotion: j.emotion })),
          date: new Date().toLocaleDateString('ko-KR'),
        }),
      });
      if (!res.ok) throw new Error('API error');
      const data = (await res.json()) as EveningReport;
      setReport(data);
      setGenerated(true);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  if (!generated) {
    const hour = new Date().getHours();
    if (hour < 17) return null;

    return (
      <div
        className="rounded-2xl p-4 flex items-center justify-between"
        style={{ background: C.cream, border: `1px solid ${C.beige}` }}
      >
        <div>
          <p className="text-sm font-medium" style={{ color: C.ink900 }}>🌙 이브닝 리포트</p>
          <p className="text-xs mt-0.5" style={{ color: C.ink500 }}>오늘 하루를 AI가 요약합니다</p>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="text-sm px-3 py-1.5 rounded-xl font-medium"
          style={{ background: C.mustard, color: '#fff' }}
        >
          {loading ? '생성 중...' : '리포트 생성'}
        </button>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-3"
      style={{ background: MOOD_BG[report.mood] ?? C.cream, border: `1px solid ${C.beige}` }}
    >
      <div className="flex items-center gap-2">
        <span className="text-2xl">{report.emoji}</span>
        <p className="text-sm font-medium" style={{ color: C.ink900 }}>이브닝 리포트</p>
      </div>

      <p className="text-sm leading-relaxed" style={{ color: C.ink900 }}>{report.summary}</p>

      <div className="flex gap-3 pt-1">
        <div
          className="flex-1 rounded-xl p-2 text-center"
          style={{ background: C.beige }}
        >
          <p className="text-lg font-bold" style={{ color: C.mustard }}>{report.done_count}</p>
          <p className="text-xs" style={{ color: C.ink500 }}>완료</p>
        </div>
        <div
          className="flex-1 rounded-xl p-2 text-center"
          style={{ background: C.beige }}
        >
          <p className="text-lg font-bold" style={{ color: C.ink500 }}>{report.todo_count}</p>
          <p className="text-xs" style={{ color: C.ink500 }}>남은 태스크</p>
        </div>
      </div>

      <button
        onClick={() => { setGenerated(false); setReport(null); }}
        className="text-xs self-end"
        style={{ color: C.ink500 }}
      >
        닫기
      </button>
    </div>
  );
}
