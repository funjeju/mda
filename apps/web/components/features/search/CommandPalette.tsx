'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Task } from '@mda/shared';

const C = {
  ivory:   '#FDFBF7',
  cream:   '#F6F1E7',
  beige:   '#E9DFC9',
  ink900:  '#2D2A26',
  ink500:  '#7C756B',
  ink300:  '#ADA598',
  ink100:  '#E8E3D7',
  mustard: '#D4A547',
};

interface SearchResult {
  id: string;
  type: 'task' | 'project' | 'journal' | 'action';
  title: string;
  subtitle?: string;
  icon: string;
  href?: string;
  action?: () => void;
}

const STATIC_ACTIONS: SearchResult[] = [
  { id: 'goto-home',     type: 'action', icon: '🏠', title: '홈으로',          href: '/home' },
  { id: 'goto-projects', type: 'action', icon: '🗂️', title: '프로젝트',        href: '/projects' },
  { id: 'goto-todo',     type: 'action', icon: '✅', title: '투두 리스트',      href: '/todo' },
  { id: 'goto-calendar', type: 'action', icon: '📅', title: '캘린더',          href: '/calendar' },
  { id: 'goto-journal',  type: 'action', icon: '📓', title: '일기',            href: '/journal' },
  { id: 'goto-stats',    type: 'action', icon: '📊', title: '통계',            href: '/stats' },
  { id: 'goto-settings', type: 'action', icon: '⚙️', title: '설정',            href: '/settings' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  teamId: string;
  userId: string;
}

export function CommandPalette({ open, onClose, teamId, userId }: Props) {
  const [query_,   setQuery]   = useState('');
  const [results,  setResults] = useState<SearchResult[]>(STATIC_ACTIONS);
  const [selected, setSelected]= useState(0);
  const [loading,  setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults(STATIC_ACTIONS);
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults(STATIC_ACTIONS); return; }
    setLoading(true);

    try {
      const lower = q.toLowerCase();
      const found: SearchResult[] = [];

      // 태스크 검색 (tasks_independent)
      const tasksSnap = await getDocs(
        query(
          collection(db, 'teams', teamId, 'tasks_independent'),
          where('deleted_at', '==', null),
          orderBy('created_at', 'desc'),
          limit(20)
        )
      );
      for (const doc of tasksSnap.docs) {
        const t = doc.data() as Task;
        if (t.title.toLowerCase().includes(lower)) {
          found.push({
            id: doc.id, type: 'task', icon: t.emoji ?? '✅',
            title: t.title,
            subtitle: `태스크 · ${t.status === 'done' ? '완료' : t.status === 'in_progress' ? '진행 중' : '할 일'}`,
          });
        }
      }

      // 프로젝트 검색
      const projectsSnap = await getDocs(
        query(
          collection(db, 'teams', teamId, 'projects'),
          where('deleted_at', '==', null),
          orderBy('created_at', 'desc'),
          limit(10)
        )
      );
      for (const doc of projectsSnap.docs) {
        const p = doc.data() as { title: string; emoji?: string; id: string };
        if (p.title.toLowerCase().includes(lower)) {
          found.push({
            id: doc.id, type: 'project', icon: p.emoji ?? '🗂️',
            title: p.title, subtitle: '프로젝트',
            href: `/projects/${doc.id}`,
          });
        }
      }

      // 일기 검색
      const journalSnap = await getDocs(
        query(
          collection(db, 'teams', teamId, 'journal_entries'),
          where('created_by', '==', userId),
          where('deleted_at', '==', null),
          orderBy('created_at', 'desc'),
          limit(10)
        )
      );
      for (const doc of journalSnap.docs) {
        const j = doc.data() as { content?: string; emotion?: string };
        if ((j.content ?? '').toLowerCase().includes(lower)) {
          found.push({
            id: doc.id, type: 'journal', icon: '📓',
            title: (j.content ?? '').slice(0, 50) + ((j.content ?? '').length > 50 ? '…' : ''),
            subtitle: `일기 · ${j.emotion ?? ''}`,
          });
        }
      }

      // 정적 액션 필터링
      const matchedActions = STATIC_ACTIONS.filter((a) => a.title.includes(lower));

      setResults([...matchedActions, ...found].slice(0, 12));
    } finally {
      setLoading(false);
    }
  }, [teamId, userId]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query_), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query_, search]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((s) => Math.min(s + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
    if (e.key === 'Enter')     { e.preventDefault(); handleSelect(results[selected]); }
    if (e.key === 'Escape')    { onClose(); }
  }

  function handleSelect(item: SearchResult | undefined) {
    if (!item) return;
    if (item.href) { router.push(item.href); onClose(); }
    else if (item.action) { item.action(); onClose(); }
    else onClose();
  }

  if (!open) return null;

  return (
    <>
      {/* 백드롭 */}
      <div className="fixed inset-0 z-50" style={{ background: 'rgba(45,42,38,0.4)' }} onClick={onClose} />

      {/* 팔레트 */}
      <div
        className="fixed left-1/2 top-24 z-50 w-full max-w-lg -translate-x-1/2 rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: C.ivory, border: `1px solid ${C.beige}` }}
      >
        {/* 검색 입력 */}
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: `1px solid ${C.beige}` }}>
          <span className="text-base">🔍</span>
          <input
            ref={inputRef}
            value={query_}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="태스크, 프로젝트, 일기 검색... 또는 이동"
            className="flex-1 outline-none text-sm bg-transparent"
            style={{ color: C.ink900 }}
          />
          {loading && (
            <div className="w-4 h-4 border-2 rounded-full animate-spin"
              style={{ borderColor: C.mustard, borderTopColor: 'transparent' }} />
          )}
          <kbd className="text-xs px-1.5 py-0.5 rounded" style={{ background: C.beige, color: C.ink500 }}>Esc</kbd>
        </div>

        {/* 결과 목록 */}
        <div style={{ maxHeight: 360, overflowY: 'auto' }}>
          {results.length === 0 ? (
            <p className="text-xs text-center py-6" style={{ color: C.ink300 }}>결과 없음</p>
          ) : (
            results.map((item, i) => (
              <button
                key={item.id}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelected(i)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                style={{
                  background: selected === i ? C.cream : 'transparent',
                  borderBottom: i < results.length - 1 ? `1px solid ${C.ink100}` : 'none',
                }}
              >
                <span className="text-base flex-shrink-0">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate" style={{ color: C.ink900 }}>{item.title}</p>
                  {item.subtitle && (
                    <p className="text-xs truncate" style={{ color: C.ink300 }}>{item.subtitle}</p>
                  )}
                </div>
                {selected === i && (
                  <kbd className="text-xs px-1.5 py-0.5 rounded flex-shrink-0"
                    style={{ background: C.beige, color: C.ink500 }}>↵</kbd>
                )}
              </button>
            ))
          )}
        </div>

        {/* 푸터 */}
        <div className="flex items-center gap-3 px-4 py-2" style={{ borderTop: `1px solid ${C.beige}` }}>
          <span className="text-[10px]" style={{ color: C.ink300 }}>↑↓ 이동</span>
          <span className="text-[10px]" style={{ color: C.ink300 }}>↵ 선택</span>
          <span className="text-[10px]" style={{ color: C.ink300 }}>Esc 닫기</span>
        </div>
      </div>
    </>
  );
}
