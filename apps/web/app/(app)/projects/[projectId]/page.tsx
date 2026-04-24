'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onSnapshot, query, where } from 'firebase/firestore';
import { useAuth } from '../../../../lib/auth/AuthContext';
import { useSections, useProjects } from '../../../../lib/hooks/useProjects';
import { MandaraGrid } from '../../../../components/features/mandarart/MandaraGrid';
import { GanttChart } from '../../../../components/features/gantt/GanttChart';
import { PivotView } from '../../../../components/features/pivot/PivotView';
import { AppShell } from '../../../../components/layout/AppShell';
import type { Section, Task } from '@mda/shared';
import { Button } from '@/components/ui/button';
import { tasksCol, projectsCol, sectionDoc } from '../../../../lib/firestore/collections';
import { taskConverter } from '../../../../lib/firestore/converters';
import { addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../../../lib/firebase';

const C = {
  ivory:   '#FDFBF7',
  cream:   '#F6F1E7',
  beige:   '#E9DFC9',
  ink900:  '#2D2A26',
  ink700:  '#4A453E',
  ink500:  '#7C756B',
  ink300:  '#ADA598',
  mustard: '#D4A547',
  red:     '#EB8B7C',
};

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
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
      <ProjectDetail projectId={projectId} teamId={teamId} userId={user.uid} />
    </AppShell>
  );
}

function ProjectDetail({
  projectId,
  teamId,
  userId,
}: {
  projectId: string;
  teamId: string;
  userId: string;
}) {
  const router = useRouter();
  const { projects } = useProjects(teamId);
  const { sections, createSection, updateSection, deleteSection } = useSections(teamId, projectId);
  const project = projects.find((p) => p.id === projectId);

  const [viewTab, setViewTab] = useState<'mandarart' | 'gantt' | 'pivot'>('mandarart');
  const [projectTasks, setProjectTasks] = useState<Task[]>([]);
  const [editingPosition, setEditingPosition] = useState<number | null>(null);
  const [editingSection, setEditingSection] = useState<Section | null>(null);

  // 간트용: 해당 프로젝트의 모든 태스크 로드
  useEffect(() => {
    const q = query(
      tasksCol(teamId, projectId).withConverter(taskConverter),
      where('deleted_at', '==', null),
    );
    return onSnapshot(q, (snap) => {
      const tasks = snap.docs.map((d) => d.data());
      tasks.sort((a, b) => {
        const aT = (a.created_at as unknown as { toDate?: () => Date })?.toDate?.()?.getTime() ?? 0;
        const bT = (b.created_at as unknown as { toDate?: () => Date })?.toDate?.()?.getTime() ?? 0;
        return aT - bT;
      });
      setProjectTasks(tasks);
    }, () => {});
  }, [teamId, projectId]);
  const [sectionTitle, setSectionTitle] = useState('');
  const [sectionEmoji, setSectionEmoji] = useState('');
  const [saving, setSaving] = useState(false);
  const [longPressSection, setLongPressSection] = useState<Section | null>(null);

  async function handleCellClick(section: Section | null, position: number) {
    if (section) {
      // 서브 프로젝트가 연결된 경우 드릴다운 (F-071)
      if (section.sub_project_id) {
        router.push(`/projects/${section.sub_project_id}`);
        return;
      }
      router.push(`/projects/${projectId}/sections/${section.id}`);
    } else {
      setEditingPosition(position);
      setEditingSection(null);
      setSectionTitle('');
      setSectionEmoji('');
    }
  }

  function handleSectionLongPress(section: Section) {
    setEditingSection(section);
    setSectionTitle(section.title);
    setSectionEmoji(section.emoji ?? '');
    setEditingPosition(null);
    setLongPressSection(section);
  }

  async function handleSaveSection() {
    if (!sectionTitle.trim()) return;
    setSaving(true);
    try {
      if (editingSection) {
        await updateSection(editingSection.id, { title: sectionTitle.trim(), emoji: sectionEmoji || null });
        setEditingSection(null);
        setLongPressSection(null);
      } else if (editingPosition !== null) {
        await createSection(
          { title: sectionTitle.trim(), emoji: sectionEmoji || null, position: editingPosition },
          userId,
        );
        setEditingPosition(null);
      }
      setSectionTitle('');
      setSectionEmoji('');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSection() {
    if (!editingSection) return;
    if (!confirm('이 섹션을 삭제할까요? 섹션 내 태스크도 함께 삭제됩니다.')) return;
    await deleteSection(editingSection.id);
    setEditingSection(null);
    setLongPressSection(null);
  }

  // F-071: 섹션 → 서브 프로젝트 생성 및 연결
  async function handleCreateSubProject(section: Section) {
    if (!confirm(`"${section.title}" 섹션을 서브 프로젝트로 만들까요?`)) return;
    setSaving(true);
    try {
      const now = serverTimestamp();
      const newProjectRef = await addDoc(projectsCol(teamId), {
        id: uuidv4(),
        team_id: teamId,
        title: section.title,
        description: section.description ?? '',
        emoji: section.emoji ?? null,
        color: null,
        parent_task_id: section.id,
        status: 'active',
        start_date: null, target_date: null, completed_at: null,
        progress_percent: 0,
        sections_total: 0, sections_completed: 0,
        tasks_total: 0, tasks_completed: 0,
        members: [userId], owner_id: userId,
        theme: null, ai_generated: false, ai_context: null,
        default_view_mode: 'mandarart', default_pivot_axis: 'section',
        created_at: now, updated_at: now,
        created_by: userId, deleted_at: null, metadata: {},
      });

      await updateDoc(sectionDoc(teamId, projectId, section.id), {
        sub_project_id: newProjectRef.id,
        updated_at: now,
      });

      setEditingSection(null);
      setLongPressSection(null);
      router.push(`/projects/${newProjectRef.id}`);
    } finally {
      setSaving(false);
    }
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center py-20">
        <p style={{ color: C.ink500 }}>프로젝트를 찾을 수 없습니다</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* 브레드크럼 */}
      <div className="flex items-center gap-2 mb-6 text-sm" style={{ color: C.ink500 }}>
        <button onClick={() => router.push('/projects')} className="hover:underline">
          프로젝트
        </button>
        <span>/</span>
        <span style={{ color: C.ink900 }}>{project.emoji} {project.title}</span>
      </div>

      {/* 뷰 탭 */}
      <div className="flex rounded-xl overflow-x-auto mb-6 max-w-full" style={{ border: `1px solid ${C.beige}`, width: 'fit-content' }}>
        {([['mandarart', '🔷 만다라트'], ['gantt', '📊 간트'], ['pivot', '🔀 피벗']] as const).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setViewTab(tab)}
            className="px-4 py-2 text-sm font-medium"
            style={{
              background: viewTab === tab ? C.mustard : C.cream,
              color: viewTab === tab ? '#fff' : C.ink500,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {viewTab === 'gantt' ? (
        <GanttChart tasks={projectTasks} title={`${project.emoji ?? ''} ${project.title} 타임라인`.trim()} />
      ) : viewTab === 'pivot' ? (
        <PivotView tasks={projectTasks} sections={sections} />
      ) : (
      /* 만다라트 그리드 */
      <div className="flex flex-col items-center gap-6">
        <MandaraGrid
          project={project}
          sections={sections}
          onCellClick={handleCellClick}
        />

        {/* 섹션 추가/편집 입력 */}
        {(editingPosition !== null || editingSection !== null) && (
          <div
            className="rounded-2xl p-5 w-full max-w-sm flex flex-col gap-3"
            style={{ background: C.cream, border: `1px solid ${C.beige}` }}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium" style={{ color: C.ink900 }}>
                {editingSection ? '섹션 편집' : `섹션 ${(editingPosition ?? 0) + 1} 추가`}
              </p>
              {editingSection && (
                <button onClick={handleDeleteSection} className="text-xs" style={{ color: C.red }}>
                  삭제
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={sectionEmoji}
                onChange={(e) => setSectionEmoji(e.target.value)}
                placeholder="🎯"
                className="w-10 text-center text-xl outline-none rounded-lg bg-transparent"
                style={{ border: `1px solid ${C.beige}` }}
                maxLength={2}
              />
              <input
                type="text"
                value={sectionTitle}
                onChange={(e) => setSectionTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveSection()}
                placeholder="섹션 이름"
                className="flex-1 outline-none bg-transparent text-sm"
                style={{ color: C.ink900 }}
                autoFocus
              />
            </div>
            <div className="flex gap-2 justify-end flex-wrap">
              <Button variant="ghost" size="sm"
                onClick={() => { setEditingPosition(null); setEditingSection(null); setLongPressSection(null); }}
                style={{ color: C.ink500 }}>취소</Button>
              {editingSection && !editingSection.sub_project_id && (
                <Button size="sm" onClick={() => handleCreateSubProject(editingSection)}
                  disabled={saving}
                  style={{ background: '#8FBFA9', color: '#fff', border: 'none', fontSize: '0.7rem' }}>
                  🔗 서브 프로젝트
                </Button>
              )}
              {editingSection?.sub_project_id && (
                <Button size="sm" onClick={() => router.push(`/projects/${editingSection.sub_project_id}`)}
                  style={{ background: '#8FBFA9', color: '#fff', border: 'none', fontSize: '0.7rem' }}>
                  🔗 서브 프로젝트 보기
                </Button>
              )}
              <Button size="sm" onClick={handleSaveSection}
                disabled={!sectionTitle.trim() || saving}
                style={{ background: C.mustard, color: '#fff', border: 'none' }}>
                {saving ? '저장 중...' : editingSection ? '수정' : '저장'}
              </Button>
            </div>
          </div>
        )}

        {/* 섹션 목록 (편집 버튼) */}
        {sections.length > 0 && (
          <div className="w-full max-w-sm">
            <p className="text-xs mb-2" style={{ color: C.ink300 }}>섹션을 길게 클릭하면 편집합니다</p>
            <div className="flex flex-wrap gap-2">
              {sections.map((s) => (
                <button
                  key={s.id}
                  onContextMenu={(e) => { e.preventDefault(); handleSectionLongPress(s); }}
                  onClick={() => router.push(`/projects/${projectId}/sections/${s.id}`)}
                  className="text-xs px-3 py-1.5 rounded-xl flex items-center gap-1"
                  style={{ background: C.cream, border: `1px solid ${C.beige}`, color: C.ink500 }}
                >
                  {s.emoji} {s.title}
                  <span style={{ color: C.ink300, marginLeft: 2 }}>✏️</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs" style={{ color: C.ink300 }}>
          빈 셀 클릭 → 섹션 추가 · 우클릭 → 섹션 편집
        </p>
      </div>
      )}
    </div>
  );
}
