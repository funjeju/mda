'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth/AuthContext';
import { useProjects, useSections } from '../../../lib/hooks/useProjects';
import { fetchWithAuth } from '../../../lib/auth/fetchWithAuth';
import { MandaraGrid } from '../../../components/features/mandarart/MandaraGrid';
import { AppShell } from '../../../components/layout/AppShell';
import { useSubscription } from '../../../lib/billing/useSubscription';
import { UpgradePrompt } from '../../../components/features/billing/UpgradePrompt';
import type { Project, Section } from '@mda/shared';
import { Button } from '@/components/ui/button';

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
};

type ViewMode = 'mandarart' | 'list';

export default function ProjectsPage() {
  const { user, teamId, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  if (loading || !user || !teamId) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C.ivory }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: C.mustard, borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <AppShell>
      <ProjectsContent teamId={teamId} userId={user.uid} />
    </AppShell>
  );
}

function ProjectsContent({ teamId, userId }: { teamId: string; userId: string }) {
  const router = useRouter();
  const { projects, loading, createProject } = useProjects(teamId);
  const { subscription, isLimitReached } = useSubscription(userId);
  const [showNew, setShowNew] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newEmoji, setNewEmoji] = useState('');
  const [creating, setCreating] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiSections, setAiSections] = useState<{ title: string; description: string; emoji: string }[] | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('mandarart');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('active');

  async function handleAIGenerate() {
    if (!newTitle.trim()) return;
    setAiGenerating(true);
    try {
      const res = await fetchWithAuth('/api/ai-sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: newTitle.trim() }),
      });
      if (!res.ok) throw new Error('AI generation failed');
      const data = await res.json() as {
        sections: { title: string; description: string; emoji: string }[];
        project_emoji: string;
        summary: string;
      };
      setAiSections(data.sections);
      if (!newEmoji && data.project_emoji) setNewEmoji(data.project_emoji);
    } catch {
      // 실패해도 수동 생성 가능
    } finally {
      setAiGenerating(false);
    }
  }

  async function handleCreate(withAI = false) {
    if (!newTitle.trim()) return;
    // Free 티어 제한 체크 (F-132)
    const activeProjects = projects.filter((p) => p.status !== 'completed' && !p.deleted_at);
    if (isLimitReached('projects', activeProjects.length)) {
      setShowNew(false);
      setShowUpgrade(true);
      return;
    }
    setCreating(true);
    try {
      const docId = await createProject(
        { title: newTitle.trim(), emoji: newEmoji || null, ai_generated: withAI },
        userId,
      );
      // AI 섹션 자동 생성
      if (withAI && aiSections) {
        const { addDoc, serverTimestamp: sts } = await import('firebase/firestore');
        const { sectionsCol } = await import('../../../lib/firestore/collections');
        const { v4: uuidv4 } = await import('uuid');
        await Promise.all(
          aiSections.map((s, i) =>
            addDoc(sectionsCol(teamId, docId), {
              id: uuidv4(),
              team_id: teamId,
              project_id: docId,
              title: s.title,
              description: s.description,
              emoji: s.emoji,
              color: null,
              position: i,
              status: 'active',
              progress_percent: 0,
              tasks_total: 0,
              tasks_completed: 0,
              ai_generated: true,
              created_at: sts(),
              updated_at: sts(),
              created_by: userId,
              deleted_at: null,
              metadata: {},
            }),
          ),
        );
      }
      setNewTitle('');
      setNewEmoji('');
      setAiSections(null);
      setShowNew(false);
      router.push(`/projects/${docId}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'SUIT', sans-serif", color: C.ink900 }}>
            프로젝트
          </h1>
          <p className="text-sm mt-1" style={{ color: C.ink500 }}>
            만다라트로 목표를 구조화하세요
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* 뷰 토글 */}
          <div
            className="flex rounded-xl overflow-hidden"
            style={{ border: `1px solid ${C.beige}` }}
          >
            <button
              onClick={() => setViewMode('mandarart')}
              className="px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                background: viewMode === 'mandarart' ? C.mustard : C.cream,
                color: viewMode === 'mandarart' ? '#fff' : C.ink500,
              }}
            >
              🔷 만다라트
            </button>
            <button
              onClick={() => setViewMode('list')}
              className="px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                background: viewMode === 'list' ? C.mustard : C.cream,
                color: viewMode === 'list' ? '#fff' : C.ink500,
              }}
            >
              ≡ 목록
            </button>
          </div>
          <Button
            onClick={() => setShowNew(true)}
            style={{ background: C.mustard, color: '#fff', border: 'none' }}
          >
            + 새 프로젝트
          </Button>
        </div>
      </div>

      {/* 업그레이드 프롬프트 (F-132) */}
      {showUpgrade && (
        <div className="mb-6">
          <UpgradePrompt
            feature="프로젝트 추가"
            currentTier={subscription.tier}
            requiredTier="plus"
            onUpgrade={() => router.push('/settings')}
          />
          <button onClick={() => setShowUpgrade(false)} className="mt-2 text-xs w-full text-center"
            style={{ color: C.ink300 }}>닫기</button>
        </div>
      )}

      {/* 새 프로젝트 입력 */}
      {showNew && (
        <div
          className="rounded-2xl p-5 mb-6 flex flex-col gap-3"
          style={{ background: C.cream, border: `1px solid ${C.beige}` }}
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={newEmoji}
              onChange={(e) => setNewEmoji(e.target.value)}
              placeholder="🎯"
              className="w-12 text-center text-xl outline-none rounded-lg bg-transparent"
              style={{ border: `1px solid ${C.beige}` }}
              maxLength={2}
            />
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
              placeholder="프로젝트 이름을 입력하세요"
              className="flex-1 outline-none bg-transparent text-sm"
              style={{ color: C.ink900 }}
              autoFocus
            />
            <Button
              size="sm"
              onClick={handleAIGenerate}
              disabled={!newTitle.trim() || aiGenerating}
              style={{ background: C.mint, color: '#fff', border: 'none', whiteSpace: 'nowrap' }}
            >
              {aiGenerating ? '분석 중...' : '✨ AI 자동 생성'}
            </Button>
          </div>

          {/* AI 섹션 미리보기 */}
          {aiSections && (
            <div className="rounded-xl p-3 flex flex-col gap-2"
              style={{ background: C.ivory, border: `1px solid ${C.beige}` }}>
              <p className="text-xs font-semibold" style={{ color: C.ink500 }}>
                ✨ AI가 생성한 8개 핵심 영역
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {aiSections.map((s, i) => (
                  <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
                    style={{ background: C.cream }}>
                    <span className="text-sm">{s.emoji}</span>
                    <span className="text-xs truncate" style={{ color: C.ink700 }}>{s.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => { setShowNew(false); setAiSections(null); }}
              style={{ color: C.ink500 }}>취소</Button>
            <Button size="sm" onClick={() => handleCreate(false)} disabled={!newTitle.trim() || creating}
              style={{ background: C.beige, color: C.ink700, border: 'none' }}>
              {creating ? '생성 중...' : '만들기'}
            </Button>
            {aiSections && (
              <Button size="sm" onClick={() => handleCreate(true)} disabled={!newTitle.trim() || creating}
                style={{ background: C.mustard, color: '#fff', border: 'none' }}>
                {creating ? '생성 중...' : '✨ AI 섹션으로 만들기'}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* 상태 필터 탭 */}
      {!loading && projects.length > 0 && (
        <div className="flex gap-1.5 mb-2">
          {([
            ['all', `전체 (${projects.length})`],
            ['active', `진행 중 (${projects.filter(p => p.status === 'active').length})`],
            ['completed', `완료 (${projects.filter(p => p.status === 'completed').length})`],
          ] as const).map(([key, label]) => (
            <button key={key} onClick={() => setStatusFilter(key)}
              className="text-xs px-3 py-1.5 rounded-xl font-medium"
              style={{ background: statusFilter === key ? C.mustard : C.cream, color: statusFilter === key ? '#fff' : C.ink500, border: `1px solid ${statusFilter === key ? C.mustard : C.beige}` }}>
              {label}
            </button>
          ))}
        </div>
      )}

      {/* 프로젝트 목록 */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: C.mustard, borderTopColor: 'transparent' }} />
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <span className="text-5xl">🌱</span>
          <p className="text-sm" style={{ color: C.ink500 }}>첫 프로젝트를 만들어보세요</p>
        </div>
      ) : (() => {
        const filtered = statusFilter === 'all' ? projects : projects.filter(p => p.status === statusFilter);
        // 서브 프로젝트와 최상위 프로젝트 분리
        const topLevel = filtered.filter(p => !p.parent_task_id);
        const subProjects = filtered.filter(p => !!p.parent_task_id);
        return viewMode === 'mandarart' ? (
          <div className="flex flex-wrap gap-8">
            {topLevel.map((project) => (
              <ProjectCard key={project.id} project={project} teamId={teamId}
                onClick={() => router.push(`/projects/${project.id}`)} />
            ))}
            {subProjects.length > 0 && (
              <>
                <div className="w-full">
                  <p className="text-xs font-medium uppercase tracking-wide mb-3" style={{ color: C.ink300 }}>
                    🔗 서브 프로젝트 ({subProjects.length})
                  </p>
                  <div className="flex flex-wrap gap-6">
                    {subProjects.map((project) => (
                      <ProjectCard key={project.id} project={project} teamId={teamId}
                        onClick={() => router.push(`/projects/${project.id}`)} />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {topLevel.map((project) => (
              <ProjectListItem key={project.id} project={project}
                onClick={() => router.push(`/projects/${project.id}`)} />
            ))}
            {subProjects.length > 0 && (
              <>
                <p className="text-xs font-medium uppercase tracking-wide mt-2" style={{ color: C.ink300 }}>
                  🔗 서브 프로젝트
                </p>
                {subProjects.map((project) => (
                  <ProjectListItem key={project.id} project={project} isSub
                    onClick={() => router.push(`/projects/${project.id}`)} />
                ))}
              </>
            )}
          </div>
        );
      })()}
    </div>
  );
}

function ProjectCard({
  project,
  teamId,
  onClick,
}: {
  project: Project;
  teamId: string;
  onClick: () => void;
}) {
  const { sections } = useSections(teamId, project.id);

  return (
    <div className="flex flex-col gap-2 cursor-pointer" onClick={onClick}>
      <MandaraGrid
        project={project}
        sections={sections}
        onProjectClick={onClick}
        onCellClick={() => onClick()}
      />
      <p className="text-xs text-center" style={{ color: C.ink500 }}>
        {project.emoji ? `${project.emoji} ` : ''}{project.title}
        {project.sections_total > 0
          ? ` · ${project.sections_completed}/${project.sections_total}`
          : ''}
      </p>
    </div>
  );
}

function ProjectListItem({
  project, onClick, isSub,
}: {
  project: Project;
  onClick: () => void;
  isSub?: boolean;
}) {
  const progress = project.tasks_total > 0
    ? Math.round((project.tasks_completed / project.tasks_total) * 100)
    : project.sections_total > 0
      ? Math.round((project.sections_completed / project.sections_total) * 100)
      : 0;
  const statusColor = project.status === 'completed' ? C.mint : project.status === 'active' ? C.mustard : C.ink300;

  return (
    <div
      className="rounded-2xl p-4 flex items-center gap-4 cursor-pointer transition-colors"
      style={{
        background: C.cream, border: `1px solid ${C.beige}`,
        marginLeft: isSub ? 16 : 0,
        borderLeft: isSub ? `3px solid ${C.ink300}` : undefined,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.mustard)}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = isSub ? C.ink300 : C.beige)}
      onClick={onClick}
    >
      <span className="text-2xl">{project.emoji ?? '🎯'}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <p className="text-sm font-semibold" style={{ color: C.ink900 }}>{project.title}</p>
          <span className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: statusColor + '20', color: statusColor }}>
            {project.status === 'active' ? '진행 중' : project.status === 'completed' ? '완료' : '대기'}
          </span>
          {isSub && <span className="text-xs" style={{ color: C.ink300 }}>🔗 서브</span>}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: C.beige }}>
            <div className="h-full rounded-full transition-all"
              style={{ width: `${progress}%`, background: statusColor }} />
          </div>
          <span className="text-xs flex-shrink-0" style={{ color: C.ink300 }}>{progress}%</span>
          {project.sections_total > 0 && (
            <span className="text-xs" style={{ color: C.ink300 }}>
              {project.sections_completed}/{project.sections_total} 섹션
            </span>
          )}
          {project.tasks_total > 0 && (
            <span className="text-xs" style={{ color: C.ink300 }}>
              {project.tasks_completed}/{project.tasks_total} 태스크
            </span>
          )}
        </div>
      </div>
      <span style={{ color: C.ink300 }}>›</span>
    </div>
  );
}

