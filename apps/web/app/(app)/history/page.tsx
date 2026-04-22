'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onSnapshot, query, orderBy, limit, where } from 'firebase/firestore';
import { useAuth } from '../../../lib/auth/AuthContext';
import { inputLogsCol } from '../../../lib/firestore/collections';
import { AppShell } from '../../../components/layout/AppShell';
import type { InputLogType } from '../../../lib/ai/inputLog';
import type { ClassificationResult } from '../../../lib/ai/schemas';

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
  lavender:'#B5A7D4',
};

interface LogDoc {
  id: string;
  type: InputLogType;
  raw_text: string;
  audio_url: string | null;
  transcript: string | null;
  ai_result: ClassificationResult | null;
  processed: boolean;
  created_at: Date | null;
  created_by: string;
}

const INTENT_KO: Record<string, string> = {
  task_creation: '태스크', task_update: '태스크 수정', project_creation: '프로젝트',
  schedule: '일정', journal_emotion: '감정 일기', journal_event: '일기',
  contact_mention: '인맥', reminder_set: '리마인더', question: '질문', noise: '기타',
};

export default function HistoryPage() {
  const { user, teamId, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  if (loading || !user || !teamId) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C.ivory }}>
        <div className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: C.mustard, borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <AppShell>
      <HistoryContent teamId={teamId} userId={user.uid} />
    </AppShell>
  );
}

function HistoryContent({ teamId, userId }: { teamId: string; userId: string }) {
  const [logs, setLogs] = useState<LogDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'text' | 'voice'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      inputLogsCol(teamId),
      where('created_by', '==', userId),
      orderBy('created_at', 'desc'),
      limit(100),
    );
    return onSnapshot(q, (snap) => {
      setLogs(
        snap.docs.map((d) => ({
          id: d.id,
          type: (d.data().type ?? 'text') as InputLogType,
          raw_text: d.data().raw_text ?? '',
          audio_url: d.data().audio_url ?? null,
          transcript: d.data().transcript ?? null,
          ai_result: d.data().ai_result ?? null,
          processed: d.data().processed ?? false,
          created_at: d.data().created_at?.toDate?.() ?? null,
          created_by: d.data().created_by ?? '',
        })),
      );
      setLoading(false);
    });
  }, [teamId, userId]);

  const filtered = filterType === 'all' ? logs : logs.filter((l) => l.type === filterType);

  // 날짜 그룹
  const grouped = groupByDate(filtered);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: C.ink900 }}>입력 기록 📜</h2>
          <p className="text-sm mt-0.5" style={{ color: C.ink500 }}>
            타이핑·음성 원본이 모두 보존됩니다
          </p>
        </div>
        <span className="text-xs px-2 py-1 rounded-full" style={{ background: C.beige, color: C.ink500 }}>
          총 {logs.length}개
        </span>
      </div>

      {/* 필터 탭 */}
      <div className="flex gap-1.5">
        {([['all', '전체'], ['text', '⌨️ 타이핑'], ['voice', '🎙️ 음성']] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setFilterType(k)}
            className="text-xs px-3 py-1.5 rounded-xl font-medium"
            style={{
              background: filterType === k ? C.mustard : C.cream,
              color: filterType === k ? '#fff' : C.ink500,
              border: `1px solid ${filterType === k ? C.mustard : C.beige}`,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 rounded-full animate-spin"
            style={{ borderColor: C.mustard, borderTopColor: 'transparent' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-sm" style={{ color: C.ink300 }}>아직 입력 기록이 없습니다</p>
          <p className="text-xs mt-1" style={{ color: C.ink300 }}>
            홈에서 텍스트나 음성을 입력하면 원본이 여기에 보존됩니다
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {grouped.map(({ dateLabel, items }) => (
            <div key={dateLabel}>
              <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: C.ink300 }}>
                {dateLabel}
              </p>
              <div className="flex flex-col gap-2">
                {items.map((log) => (
                  <LogCard
                    key={log.id}
                    log={log}
                    expanded={expandedId === log.id}
                    onToggle={() => setExpandedId(expandedId === log.id ? null : log.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LogCard({ log, expanded, onToggle }: { log: LogDoc; expanded: boolean; onToggle: () => void }) {
  const isVoice = log.type === 'voice';
  const segmentCount = log.ai_result?.segments?.filter((s) => s.intent !== 'noise').length ?? 0;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: C.cream, border: `1px solid ${C.beige}` }}
    >
      {/* 헤더 행 */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        onClick={onToggle}
        style={{ borderBottom: expanded ? `1px solid ${C.beige}` : 'none' }}
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
          style={{ background: isVoice ? C.coral + '20' : C.mustard + '20' }}
        >
          {isVoice ? '🎙️' : '⌨️'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm truncate" style={{ color: C.ink900 }}>
            {log.raw_text || log.transcript || '(내용 없음)'}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            {log.created_at && (
              <span className="text-xs" style={{ color: C.ink300 }}>
                {log.created_at.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            {log.processed ? (
              <span className="text-xs px-1.5 py-0.5 rounded-md" style={{ background: C.mint + '25', color: C.mint }}>
                처리됨
              </span>
            ) : (
              <span className="text-xs px-1.5 py-0.5 rounded-md" style={{ background: C.beige, color: C.ink300 }}>
                미처리
              </span>
            )}
            {segmentCount > 0 && (
              <span className="text-xs" style={{ color: C.ink500 }}>
                AI {segmentCount}개 분류
              </span>
            )}
          </div>
        </div>
        <span className="text-xs" style={{ color: C.ink300 }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {/* 펼쳐진 상세 */}
      {expanded && (
        <div className="px-4 py-3 flex flex-col gap-3">
          {/* 원본 텍스트 */}
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: C.ink300 }}>원본 입력</p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: C.ink900 }}>
              {log.raw_text || log.transcript || '—'}
            </p>
          </div>

          {/* AI 분류 결과 */}
          {log.ai_result && log.ai_result.segments.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-1.5" style={{ color: C.ink300 }}>AI 분류 결과</p>
              <div className="flex flex-col gap-1.5">
                {log.ai_result.segments.map((seg, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-xl px-3 py-2"
                    style={{ background: C.ivory, border: `1px solid ${C.beige}` }}>
                    <span className="text-xs px-1.5 py-0.5 rounded-md flex-shrink-0"
                      style={{ background: C.mustard + '20', color: C.mustard }}>
                      {INTENT_KO[seg.intent] ?? seg.intent}
                    </span>
                    <span className="text-xs flex-1" style={{ color: C.ink900 }}>
                      {seg.proposed_data.title ?? seg.segment}
                    </span>
                    <span className="text-xs flex-shrink-0" style={{ color: C.ink300 }}>
                      {Math.round(seg.confidence * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 처리 안된 경우 안내 */}
          {!log.processed && !log.ai_result && (
            <p className="text-xs" style={{ color: C.ink300 }}>
              AI 처리 전 보존된 원본입니다
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function groupByDate(items: LogDoc[]) {
  const map = new Map<string, LogDoc[]>();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);

  for (const item of items) {
    let label: string;
    if (!item.created_at) {
      label = '날짜 불명';
    } else {
      const d = new Date(item.created_at); d.setHours(0, 0, 0, 0);
      if (d.getTime() === today.getTime()) label = '오늘';
      else if (d.getTime() === yesterday.getTime()) label = '어제';
      else label = item.created_at.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
    }
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(item);
  }
  return Array.from(map.entries()).map(([dateLabel, items]) => ({ dateLabel, items }));
}
