'use client';

import { useEffect } from 'react';
import {
  onSnapshot, query, where, updateDoc, doc, getDocs,
} from 'firebase/firestore';
import { tasksCol, sectionsCol, projectDoc } from '../firestore/collections';
import type { Section } from '@mda/shared';

export function useProjectProgress(teamId: string, projectId: string, sections: Section[]) {
  useEffect(() => {
    if (!projectId || sections.length === 0) return;

    // 각 섹션의 태스크 완료율을 감시하고 섹션/프로젝트 progress 갱신
    const unsubscribers: (() => void)[] = [];

    for (const section of sections) {
      const q = query(
        tasksCol(teamId, projectId),
        where('deleted_at', '==', null),
        where('section_id', '==', section.id),
      );
      const unsub = onSnapshot(q, async (snap) => {
        const total = snap.size;
        const completed = snap.docs.filter((d) => d.data().status === 'done').length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        const status = total > 0 && completed === total ? 'completed'
          : completed > 0 ? 'active' : 'pending';

        // 섹션 업데이트
        const sRef = doc(sectionsCol(teamId, projectId), section.id);
        await updateDoc(sRef, {
          tasks_total: total,
          tasks_completed: completed,
          progress_percent: progress,
          status,
        }).catch(() => {});

        // 프로젝트 전체 진척도 재계산
        const allSectionsSnap = await getDocs(
          query(sectionsCol(teamId, projectId), where('deleted_at', '==', null)),
        );
        const allSections = allSectionsSnap.docs.map((d) => d.data());
        const sectionsTotal = allSections.length;
        const sectionsCompleted = allSections.filter((s) => s.status === 'completed').length;
        const totalTasks = allSections.reduce((sum, s) => sum + (s.tasks_total ?? 0), 0);
        const completedTasks = allSections.reduce((sum, s) => sum + (s.tasks_completed ?? 0), 0);
        const projectProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        const pRef = projectDoc(teamId, projectId);
        await updateDoc(pRef, {
          sections_total: sectionsTotal,
          sections_completed: sectionsCompleted,
          tasks_total: totalTasks,
          tasks_completed: completedTasks,
          progress_percent: projectProgress,
          status: sectionsTotal > 0 && sectionsCompleted === sectionsTotal ? 'completed' : 'active',
        }).catch(() => {});
      });
      unsubscribers.push(unsub);
    }

    return () => unsubscribers.forEach((u) => u());
  }, [teamId, projectId, sections]);
}
