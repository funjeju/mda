'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { addDoc, serverTimestamp } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../../../lib/auth/AuthContext';
import { useJournalEntries } from '../../../lib/hooks/useJournal';
import { journalEntriesCol } from '../../../lib/firestore/collections';
import { fetchWithAuth } from '../../../lib/auth/fetchWithAuth';
import { SmartInput } from '../../../components/features/input/SmartInput';
import { AppShell } from '../../../components/layout/AppShell';
import type { JournalEntryDoc } from '../../../lib/hooks/useJournal';

const C = {
  ivory:   '#FDFBF7',
  cream:   '#F6F1E7',
  beige:   '#E9DFC9',
  ink900:  '#2D2A26',
  ink700:  '#4A453E',
  ink500:  '#7C756B',
  ink300:  '#ADA598',
  mustard: '#D4A547',
  mint:    '#8FBFA9',
  coral:   '#EB8B7C',
  lavender:'#B5A7D4',
};

const EMOTION_EMOJI: Record<string, string> = {
  joy: '😄', calm: '😌', excited: '🤩', anxious: '😰',
  sad: '😢', angry: '😠', tired: '😴', grateful: '🙏',
  proud: '😤', neutral: '😐',
};

const EMOTION_LIST = Object.entries(EMOTION_EMOJI).map(([key, emoji]) => ({ key, emoji }));

const MOOD_LABEL: Record<string, string> = {
  emotional: '감정 일기', event: '일기',
};

const MOOD_COLOR: Record<string, string> = {
  joy: C.mustard, calm: C.mint, excited: C.coral,
  anxious: C.lavender, sad: C.lavender, angry: C.coral,
  tired: C.ink300, grateful: C.mint, proud: C.mustard, neutral: C.ink300,
};

export default function JournalPage() {
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
      <JournalContent user={user} teamId={teamId} />
    </AppShell>
  );
}

function JournalContent({
  user, teamId,
}: {
  user: { displayName: string | null; uid: string };
  teamId: string;
}) {
  const { entries, loading } = useJournalEntries(teamId, user.uid);
  const [writeMode, setWriteMode] = useState<'ai' | 'manual' | 'companion'>('ai');
  const [manualText, setManualText] = useState('');
  const [manualEmotion, setManualEmotion] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [emotionFilter, setEmotionFilter] = useState<string | null>(null);

  // AI 회고 대화 상태
  interface ChatMsg { role: 'user' | 'assistant'; content: string }
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSaving, setChatSaving] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 대화 탭 진입 시 AI가 먼저 말 걸기
  useEffect(() => {
    if (writeMode === 'companion' && chatMessages.length === 0) {
      setChatLoading(true);
      fetchWithAuth('/api/ai-companion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: '안녕, 오늘 하루 회고하고 싶어.' }],
        }),
      })
        .then((r) => r.json())
        .then((d: { reply?: string }) => {
          if (d.reply) setChatMessages([{ role: 'assistant', content: d.reply }]);
        })
        .catch(() => {
          setChatMessages([{ role: 'assistant', content: '안녕하세요 😊 오늘 하루 어떠셨나요? 편하게 이야기해 주세요.' }]);
        })
        .finally(() => setChatLoading(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [writeMode]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  async function handleChatSend() {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg: ChatMsg = { role: 'user', content: chatInput.trim() };
    const next = [...chatMessages, userMsg];
    setChatMessages(next);
    setChatInput('');
    setChatLoading(true);
    try {
      const res = await fetchWithAuth('/api/ai-companion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json() as { reply?: string };
      if (data.reply) setChatMessages([...next, { role: 'assistant', content: data.reply }]);
    } catch {
      setChatMessages([...next, { role: 'assistant', content: '잠시 연결이 끊겼어요. 다시 시도해 주세요.' }]);
    } finally {
      setChatLoading(false);
    }
  }

  async function handleSaveChat() {
    if (chatMessages.length < 2) return;
    setChatSaving(true);
    try {
      const content = chatMessages
        .map((m) => `${m.role === 'user' ? '나' : 'AI'}: ${m.content}`)
        .join('\n\n');
      await addDoc(journalEntriesCol(teamId), {
        id: uuidv4(), team_id: teamId,
        content,
        emotion: null, mood: 'emotional', is_private: true, tags: ['AI회고'],
        linked_task_ids: [], linked_project_ids: [],
        ai_generated: true, ai_confidence: null,
        created_at: serverTimestamp(), updated_at: serverTimestamp(),
        created_by: user.uid, deleted_at: null, metadata: { type: 'companion_chat' },
      });
      setChatMessages([]);
      setWriteMode('ai');
    } finally {
      setChatSaving(false);
    }
  }

  // 감정 통계
  const emotionStats = useMemo(() => {
    const counts: Record<string, number> = {};
    entries.forEach((e) => {
      if (e.emotion) counts[e.emotion] = (counts[e.emotion] ?? 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([emotion, count]) => ({ emotion, count, emoji: EMOTION_EMOJI[emotion] ?? '💬' }));
  }, [entries]);

  const totalEmotions = emotionStats.reduce((s, e) => s + e.count, 0);

  // 필터링 + 그룹
  const filtered = emotionFilter ? entries.filter(e => e.emotion === emotionFilter) : entries;
  const grouped  = groupByDate(filtered);

  async function handleManualSave() {
    if (!manualText.trim()) return;
    setSaving(true);
    try {
      const now = serverTimestamp();
      await addDoc(journalEntriesCol(teamId), {
        id: uuidv4(), team_id: teamId,
        content: manualText.trim(),
        emotion: manualEmotion || null,
        mood: manualEmotion ? 'emotional' : 'event',
        is_private: true, tags: [],
        linked_task_ids: [], linked_project_ids: [],
        ai_generated: false, ai_confidence: null,
        created_at: now, updated_at: now,
        created_by: user.uid, deleted_at: null, metadata: {},
      });
      setManualText('');
      setManualEmotion('');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: C.ink900 }}>일기장 📓</h2>
          <p className="text-sm mt-0.5" style={{ color: C.ink500 }}>감정·기억을 자유롭게 기록하세요</p>
        </div>
        <span className="text-xs px-2 py-1 rounded-full" style={{ background: C.beige, color: C.ink500 }}>
          총 {entries.length}개
        </span>
      </div>

      {/* 감정 통계 바 */}
      {emotionStats.length > 0 && (
        <div className="rounded-2xl p-4 flex flex-col gap-3"
          style={{ background: C.cream, border: `1px solid ${C.beige}` }}>
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: C.ink300 }}>감정 분포</p>
          <div className="flex h-3 rounded-full overflow-hidden gap-px">
            {emotionStats.map(({ emotion, count }) => (
              <div key={emotion}
                className="cursor-pointer transition-opacity"
                style={{
                  width: `${Math.round((count / totalEmotions) * 100)}%`,
                  background: MOOD_COLOR[emotion] ?? C.ink300,
                  opacity: emotionFilter === null || emotionFilter === emotion ? 1 : 0.3,
                }}
                title={`${EMOTION_EMOJI[emotion] ?? ''} ${emotion} (${count})`}
                onClick={() => setEmotionFilter(emotionFilter === emotion ? null : emotion)}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {emotionStats.slice(0, 6).map(({ emotion, count, emoji }) => (
              <button
                key={emotion}
                onClick={() => setEmotionFilter(emotionFilter === emotion ? null : emotion)}
                className="text-xs flex items-center gap-1"
                style={{ color: emotionFilter === emotion ? MOOD_COLOR[emotion] ?? C.ink900 : C.ink500 }}>
                {emoji} {count}
              </button>
            ))}
            {emotionFilter && (
              <button onClick={() => setEmotionFilter(null)}
                className="text-xs" style={{ color: C.ink300 }}>전체 보기</button>
            )}
          </div>
        </div>
      )}

      {/* 입력 모드 탭 */}
      <div>
        <div className="flex rounded-2xl overflow-hidden mb-4" style={{ border: `1px solid ${C.beige}` }}>
          {([['ai', '✨ AI 분류'], ['companion', '🤖 AI 회고'], ['manual', '✏️ 직접 작성']] as const).map(([m, label]) => (
            <button key={m} onClick={() => setWriteMode(m)}
              className="flex-1 py-2 text-xs font-medium"
              style={{ background: writeMode === m ? C.mustard : C.cream, color: writeMode === m ? '#fff' : C.ink500 }}>
              {label}
            </button>
          ))}
        </div>

        {writeMode === 'ai' ? (
          <SmartInput teamId={teamId} userId={user.uid} />
        ) : writeMode === 'companion' ? (
          <div className="rounded-2xl flex flex-col overflow-hidden"
            style={{ background: C.cream, border: `1px solid ${C.beige}` }}>
            {/* 채팅 헤더 */}
            <div className="px-4 py-3 flex items-center gap-2"
              style={{ borderBottom: `1px solid ${C.beige}` }}>
              <span className="text-lg">🤖</span>
              <div>
                <p className="text-sm font-semibold" style={{ color: C.ink900 }}>AI 회고 동반자</p>
                <p className="text-xs" style={{ color: C.ink500 }}>오늘 하루를 함께 돌아봐요</p>
              </div>
            </div>
            {/* 메시지 목록 */}
            <div className="flex flex-col gap-3 px-4 py-3 overflow-y-auto" style={{ maxHeight: 320, minHeight: 160 }}>
              {chatMessages.length === 0 && !chatLoading && (
                <p className="text-xs text-center py-4" style={{ color: C.ink300 }}>
                  대화를 시작하는 중...
                </p>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className="rounded-2xl px-3 py-2 text-sm max-w-[80%] leading-relaxed"
                    style={{
                      background: msg.role === 'user' ? C.mustard : C.ivory,
                      color: msg.role === 'user' ? '#fff' : C.ink900,
                      borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl px-4 py-2.5 flex gap-1"
                    style={{ background: C.ivory, borderRadius: '18px 18px 18px 4px' }}>
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                        style={{ background: C.ink300, animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            {/* 입력 영역 */}
            <div className="px-3 py-3 flex gap-2" style={{ borderTop: `1px solid ${C.beige}` }}>
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleChatSend(); } }}
                placeholder="메시지를 입력하세요..."
                className="flex-1 text-sm outline-none px-3 py-1.5 rounded-xl"
                style={{ background: C.ivory, border: `1px solid ${C.beige}`, color: C.ink900 }}
                disabled={chatLoading}
              />
              <button onClick={() => void handleChatSend()}
                disabled={!chatInput.trim() || chatLoading}
                className="px-3 py-1.5 rounded-xl text-sm font-medium"
                style={{ background: C.mustard, color: '#fff', opacity: (!chatInput.trim() || chatLoading) ? 0.5 : 1 }}>
                전송
              </button>
            </div>
            {/* 저장 버튼 */}
            {chatMessages.length >= 2 && (
              <div className="px-3 pb-3">
                <button onClick={() => void handleSaveChat()}
                  disabled={chatSaving}
                  className="w-full py-2 rounded-xl text-sm font-semibold"
                  style={{ background: C.mint, color: '#fff', opacity: chatSaving ? 0.7 : 1 }}>
                  {chatSaving ? '저장 중...' : '📓 대화를 일기로 저장'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl p-4 flex flex-col gap-3"
            style={{ background: C.cream, border: `1px solid ${C.beige}` }}>
            {/* 감정 선택 */}
            <div className="flex flex-wrap gap-1.5">
              {EMOTION_LIST.map(({ key, emoji }) => (
                <button key={key} onClick={() => setManualEmotion(manualEmotion === key ? '' : key)}
                  className="w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all"
                  style={{
                    background: manualEmotion === key ? C.mustard+'25' : C.ivory,
                    border: `1.5px solid ${manualEmotion === key ? C.mustard : C.beige}`,
                  }}
                  title={key}>
                  {emoji}
                </button>
              ))}
            </div>
            <textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="오늘 있었던 일이나 감정을 적어보세요..."
              rows={4}
              className="w-full text-sm outline-none resize-none rounded-xl px-3 py-2"
              style={{ background: C.ivory, border: `1px solid ${C.beige}`, color: C.ink900 }}
            />
            <button
              onClick={handleManualSave}
              disabled={!manualText.trim() || saving}
              className="w-full py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: C.mustard, color: '#fff', opacity: saving ? 0.7 : 1 }}>
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        )}
      </div>

      {/* 일기 목록 */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 rounded-full animate-spin"
            style={{ borderColor: C.mustard, borderTopColor: 'transparent' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-3xl mb-3">📭</p>
          <p className="text-sm" style={{ color: C.ink300 }}>
            {emotionFilter ? `"${EMOTION_EMOJI[emotionFilter]}" 감정의 일기가 없습니다` : '아직 일기가 없습니다'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {grouped.map(({ dateLabel, items }) => (
            <div key={dateLabel}>
              <p className="text-xs font-medium mb-2 uppercase tracking-wide" style={{ color: C.ink300 }}>
                {dateLabel}
              </p>
              <div className="flex flex-col gap-2">
                {items.map((entry) => <JournalCard key={entry.id} entry={entry} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function JournalCard({ entry }: { entry: JournalEntryDoc }) {
  const emoji     = entry.emotion ? (EMOTION_EMOJI[entry.emotion] ?? '💬') : '💬';
  const moodLabel = MOOD_LABEL[entry.mood] ?? '일기';
  const accentColor = entry.emotion ? (MOOD_COLOR[entry.emotion] ?? C.ink300) : C.ink300;

  return (
    <div className="rounded-2xl p-4 flex gap-3"
      style={{ background: C.cream, border: `1px solid ${C.beige}`, borderLeft: `3px solid ${accentColor}` }}>
      <span className="text-xl flex-shrink-0 mt-0.5">{emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-relaxed" style={{ color: C.ink900 }}>{entry.content}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: accentColor + '20', color: accentColor }}>
            {moodLabel}
          </span>
          {entry.emotion && (
            <span className="text-xs" style={{ color: C.ink500 }}>{entry.emotion}</span>
          )}
          {entry.created_at && (
            <span className="text-xs ml-auto" style={{ color: C.ink300 }}>
              {entry.created_at.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function groupByDate(entries: JournalEntryDoc[]) {
  const map = new Map<string, JournalEntryDoc[]>();
  for (const entry of entries) {
    const label = entry.created_at
      ? entry.created_at.toLocaleDateString('ko-KR', {
          year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
        })
      : '날짜 불명';
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(entry);
  }
  return Array.from(map.entries()).map(([dateLabel, items]) => ({ dateLabel, items }));
}
