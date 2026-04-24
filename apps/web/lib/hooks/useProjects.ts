'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
  doc,
  collection,
  getDocs,
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import type { Project, Section } from '@mda/shared';
import { db } from '../firebase';
import { projectsCol, projectDoc, sectionsCol } from '../firestore/collections';
import { projectConverter, sectionConverter } from '../firestore/converters';

// ─── Projects ───────────────────────────────────────────────

interface CreateProjectInput {
  title: string;
  emoji?: string | null;
  color?: string | null;
  description?: string;
  ai_generated?: boolean;
}

export function useProjects(teamId: string) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      projectsCol(teamId).withConverter(projectConverter),
      where('deleted_at', '==', null),
    );
    const unsub = onSnapshot(q, (snap) => {
      const projects = snap.docs.map((d) => d.data());
      projects.sort((a, b) => {
        const aT = (a.created_at as unknown as { toDate?: () => Date })?.toDate?.()?.getTime() ?? 0;
        const bT = (b.created_at as unknown as { toDate?: () => Date })?.toDate?.()?.getTime() ?? 0;
        return bT - aT;
      });
      setProjects(projects);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [teamId]);

  const createProject = useCallback(
    async (input: CreateProjectInput, userId: string): Promise<string> => {
      const id = uuidv4();
      const now = serverTimestamp();
      const ref = await addDoc(projectsCol(teamId), {
        id,
        team_id: teamId,
        title: input.title.trim(),
        description: input.description ?? '',
        emoji: input.emoji ?? null,
        color: input.color ?? null,
        parent_task_id: null,
        status: 'active',
        start_date: null,
        target_date: null,
        completed_at: null,
        progress_percent: 0,
        sections_total: 0,
        sections_completed: 0,
        tasks_total: 0,
        tasks_completed: 0,
        members: [userId],
        owner_id: userId,
        theme: null,
        ai_generated: false,
        ai_context: null,
        default_view_mode: 'mandarart',
        default_pivot_axis: 'section',
        created_at: now,
        updated_at: now,
        created_by: userId,
        deleted_at: null,
        metadata: {},
      });
      return ref.id;
    },
    [teamId],
  );

  const deleteProject = useCallback(
    async (projectId: string) => {
      await updateDoc(projectDoc(teamId, projectId), {
        deleted_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
    },
    [teamId],
  );

  return { projects, loading, createProject, deleteProject };
}

// ─── Sections ───────────────────────────────────────────────

interface CreateSectionInput {
  title: string;
  emoji?: string | null;
  color?: string | null;
  position: number;
}

export function useSections(teamId: string, projectId: string) {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    const q = query(
      sectionsCol(teamId, projectId).withConverter(sectionConverter),
      where('deleted_at', '==', null),
    );
    const unsub = onSnapshot(q, (snap) => {
      const secs = snap.docs.map((d) => d.data());
      secs.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      setSections(secs);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [teamId, projectId]);

  const createSection = useCallback(
    async (input: CreateSectionInput, userId: string): Promise<string> => {
      const id = uuidv4();
      const now = serverTimestamp();
      const ref = await addDoc(sectionsCol(teamId, projectId), {
        id,
        team_id: teamId,
        project_id: projectId,
        title: input.title.trim(),
        description: '',
        emoji: input.emoji ?? null,
        color: input.color ?? null,
        position: input.position,
        progress_percent: 0,
        tasks_total: 0,
        tasks_completed: 0,
        status: 'pending',
        created_at: now,
        updated_at: now,
        created_by: userId,
        deleted_at: null,
        metadata: {},
      });
      return ref.id;
    },
    [teamId, projectId],
  );

  const updateSection = useCallback(
    async (sectionId: string, data: Partial<Pick<Section, 'title' | 'emoji' | 'color' | 'status'>>) => {
      const ref = doc(sectionsCol(teamId, projectId), sectionId);
      await updateDoc(ref, { ...data, updated_at: serverTimestamp() });
    },
    [teamId, projectId],
  );

  const deleteSection = useCallback(
    async (sectionId: string) => {
      const ref = doc(sectionsCol(teamId, projectId), sectionId);
      await updateDoc(ref, { deleted_at: serverTimestamp(), updated_at: serverTimestamp() });
    },
    [teamId, projectId],
  );

  return { sections, loading, createSection, updateSection, deleteSection };
}
