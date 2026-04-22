'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { useAuth } from '../../../lib/auth/AuthContext';
import {
  independentTasksCol, journalEntriesCol, projectsCol, personContactsCol,
} from '../../../lib/firestore/collections';
import { AppShell } from '../../../components/layout/AppShell';

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

type ResultType = 'task' | 'journal' | 'project' | 'contact';
type FilterType = 'all' | ResultType;

interface SearchResult {
  id: string;
  type: ResultType;
  title: string;
  subtitle?: string;
  href?: string;
  emoji?: string;
  badge?: string;
  badgeColor?: string;
}

const TYPE_META: Record<ResultType, { icon: string; label: string; color: string }> = {
  task:    { icon: '✅', label: '태스크',   color: C.mustard },
  project: { icon: '🗂️', label: '프로젝트', color: C.coral   },
  journal: { icon: '📓', label: '일기',     color: C.lavender },
  contact: { icon: '👤', label: '연락처',   color: C.mint    },
};

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all',     label: '전체' },
  { key: 'task',    label: '태스크' },
  { key: 'project', label: '프로젝트' },
  { key: 'journal', label: '일기' },
  { key: 'contact', label: '연락처' },
];

const RECENT_KEY = 'mda-recent-searches';

function getRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as string[]; }
  catch { return []; }
}
function saveRecent(kw: string) {
  try {
    const prev = getRecent().filter((r) => r !== kw);
    localStorage.setItem(RECENT_KEY, JSON.stringify([kw, ...prev].slice(0, 8)));
  } catch { /* */ }
}
function removeRecent(kw: string) {
  try {
    const prev = getRecent().filter((r) => r !== kw);
    localStorage.setItem(RECENT_KEY, JSON.stringify(prev));
  } catch { /* */ }
}

export default function SearchPage() {
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
      <SearchContent teamId={teamId} userId={user.uid} />
    </AppShell>
  );
}

function highlight(text: string, kw: string): React.ReactNode {
  if (!kw) return text;
  const idx = text.toLowerCase().indexOf(kw.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: C.mustard + '40', color: C.ink900, borderRadius: 2 }}>
        {text.slice(idx, idx + kw.length)}
      </mark>
      {text.slice(idx + kw.length)}
    </>
  );
}

function SearchContent({ teamId, userId }: { teamId: string; userId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    setRecent(getRecent());
    inputRef.current?.focus();
  }, []);

  const search = useCallback(async (keyword: string) => {
    if (!keyword.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const kw = keyword.trim().toLowerCase();
      const found: SearchResult[] = [];

      const [taskSnap, projSnap, journalSnap, contactSnap] = await Promise.all([
        getDocs(query(independentTasksCol(teamId), where('deleted_at', '==', null), where('created_by', '==', userId), orderBy('created_at', 'desc'), limit(100))),
        getDocs(query(projectsCol(teamId), where('deleted_at', '==', null), orderBy('created_at', 'desc'), limit(50))),
        getDocs(query(journalEntriesCol(teamId), where('deleted_at', '==', null), where('created_by', '==', userId), orderBy('created_at', 'desc'), limit(100))),
        getDocs(query(personContactsCol(teamId), where('deleted_at', '==', null), orderBy('last_mentioned_at', 'desc'), limit(50))),
      ]);

      taskSnap.forEach((d) => {
        const data = d.data();
        if ((data.title ?? '').toLowerCase().includes(kw)) {
          found.push({
            id: d.id, type: 'task',
            title: data.title,
            subtitle: data.status === 'done' ? '완료' : data.status === 'in_progress' ? '진행 중' : '할 일',
            badge: data.priority === 'urgent' ? '긴급' : data.priority === 'high' ? '높음' : undefined,
            badgeColor: data.priority === 'urgent' ? C.coral : C.mustard,
          });
        }
      });

      projSnap.forEach((d) => {
        const data = d.data();
        if ((data.title ?? '').toLowerCase().includes(kw)) {
          found.push({
            id: d.id, type: 'project',
            title: data.title,
            emoji: data.emoji ?? undefined,
            subtitle: data.status === 'active' ? '진행 중' : '완료',
            href: `/projects/${d.id}`,
          });
        }
      });

      journalSnap.forEach((d) => {
        const data = d.data();
        if ((data.content ?? '').toLowerCase().includes(kw)) {
          found.push({
            id: d.id, type: 'journal',
            title: (data.content ?? '').slice(0, 80),
            subtitle: data.emotion ?? '일기',
          });
        }
      });

      contactSnap.forEach((d) => {
        const data = d.data();
        if ((data.name ?? '').toLowerCase().includes(kw) || (data.relationship ?? '').toLowerCase().includes(kw)) {
          found.push({
            id: d.id, type: 'contact',
            title: data.name,
            subtitle: data.relationship ? `${data.relationship} · 언급 ${data.mention_count ?? 0}회` : `언급 ${data.mention_count ?? 0}회`,
            href: `/contacts`,
          });
        }
      });

      setResults(found.slice(0, 50));
    } finally {
      setSearching(false);
    }
  }, [teamId, userId]);

  useEffect(() => {
    const timer = setTimeout(() => search(q), 300);
    return () => clearTimeout(timer);
  }, [q, search]);

  function handleResultClick(r: SearchResult) {
    if (q.trim()) {
      saveRecent(q.trim());
      setRecent(getRecent());
    }
    if (r.href) router.push(r.href);
  }

  function useRecentQuery(kw: string) {
    setQ(kw);
    inputRef.current?.focus();
  }

  const filtered = filter === 'all' ? results : results.filter((r) => r.type === filter);

  const grouped = {
    task:    filtered.filter((r) => r.type === 'task'),
    project: filtered.filter((r) => r.type === 'project'),
    journal: filtered.filter((r) => r.type === 'journal'),
    contact: filtered.filter((r) => r.type === 'contact'),
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-4">
      <h2 className="text-xl font-semibold" style={{ color: C.ink900 }}>검색 🔍</h2>

      {/* 검색창 */}
      <div className="relative">
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setQ('');
          }}
          placeholder="태스크, 일기, 프로젝트, 연락처 검색..."
          className="w-full rounded-2xl pl-10 pr-10 py-3 text-sm outline-none"
          style={{ background: C.cream, border: `1px solid ${C.beige}`, color: C.ink900 }}
        />
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm" style={{ color: C.ink300 }}>🔍</span>
        {q ? (
          <button
            onClick={() => setQ('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-lg leading-none"
            style={{ color: C.ink300 }}
          >
            ×
          </button>
        ) : searching ? (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 border-2 rounded-full animate-spin"
            style={{ borderColor: C.mustard, borderTopColor: 'transparent' }} />
        ) : null}
      </div>

      {/* 필터 탭 */}
      {q.trim() && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {FILTERS.map((f) => {
            const count = f.key === 'all' ? results.length : results.filter((r) => r.type === f.key).length;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className="text-xs px-3 py-1.5 rounded-xl font-medium whitespace-nowrap"
                style={{
                  background: filter === f.key ? C.mustard : C.cream,
                  color: filter === f.key ? '#fff' : C.ink500,
                  border: `1px solid ${filter === f.key ? C.mustard : C.beige}`,
                }}
              >
                {f.label} {count > 0 && `(${count})`}
              </button>
            );
          })}
        </div>
      )}

      {/* 최근 검색어 */}
      {!q.trim() && recent.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium" style={{ color: C.ink300 }}>최근 검색</p>
            <button
              onClick={() => { localStorage.removeItem(RECENT_KEY); setRecent([]); }}
              className="text-xs"
              style={{ color: C.ink300 }}
            >
              전체 삭제
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recent.map((kw) => (
              <div key={kw} className="flex items-center gap-1 rounded-xl px-3 py-1.5"
                style={{ background: C.cream, border: `1px solid ${C.beige}` }}>
                <button
                  className="text-xs"
                  style={{ color: C.ink500 }}
                  onClick={() => useRecentQuery(kw)}
                >
                  🕐 {kw}
                </button>
                <button
                  onClick={() => { removeRecent(kw); setRecent(getRecent()); }}
                  className="text-xs leading-none ml-1"
                  style={{ color: C.ink300 }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 결과 없음 */}
      {!q.trim() && recent.length === 0 && (
        <div className="text-center py-10">
          <p className="text-3xl mb-3">🔍</p>
          <p className="text-sm" style={{ color: C.ink300 }}>검색어를 입력하세요</p>
        </div>
      )}
      {q.trim() && filtered.length === 0 && !searching && (
        <div className="text-center py-10">
          <p className="text-3xl mb-3">📭</p>
          <p className="text-sm" style={{ color: C.ink300 }}>"{q}"에 대한 결과가 없습니다</p>
        </div>
      )}

      {/* 검색 결과 (카테고리별 그룹) */}
      {filtered.length > 0 && (
        <div className="flex flex-col gap-5">
          {(Object.entries(grouped) as [ResultType, SearchResult[]][])
            .filter(([, items]) => items.length > 0)
            .map(([type, items]) => (
              <div key={type}>
                <p className="text-xs font-medium uppercase tracking-wide mb-2"
                  style={{ color: TYPE_META[type].color }}>
                  {TYPE_META[type].icon} {TYPE_META[type].label} ({items.length})
                </p>
                <div className="flex flex-col gap-1.5">
                  {items.map((r) => (
                    <button
                      key={`${r.type}-${r.id}`}
                      className="flex items-center gap-3 rounded-2xl px-4 py-3 text-left w-full"
                      style={{ background: C.cream, border: `1px solid ${C.beige}` }}
                      onClick={() => handleResultClick(r)}
                    >
                      <span className="text-lg flex-shrink-0">
                        {r.emoji ?? TYPE_META[r.type].icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate" style={{ color: C.ink900 }}>
                          {highlight(r.title, q.trim())}
                        </p>
                        {r.subtitle && (
                          <p className="text-xs mt-0.5" style={{ color: C.ink500 }}>{r.subtitle}</p>
                        )}
                      </div>
                      {r.badge && (
                        <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: (r.badgeColor ?? C.mustard) + '20', color: r.badgeColor ?? C.mustard }}>
                          {r.badge}
                        </span>
                      )}
                      {r.href && (
                        <span className="text-xs flex-shrink-0" style={{ color: C.ink300 }}>›</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
