'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  onSnapshot, addDoc, updateDoc, doc,
  serverTimestamp, query, where,
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import type { Task } from '@mda/shared';
import { tasksCol } from '../firestore/collections';
import { taskConverter } from '../firestore/converters';

export function useSectionTasks(teamId: string, projectId: string, sectionId: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId || !sectionId) return;
    const q = query(
      tasksCol(teamId, projectId).withConverter(taskConverter),
      where('deleted_at', '==', null),
      where('section_id', '==', sectionId),
    );
    return onSnapshot(q, (snap) => {
      const tasks = snap.docs.map((d) => d.data());
      tasks.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      setTasks(tasks);
      setLoading(false);
    }, () => setLoading(false));
  }, [teamId, projectId, sectionId]);

  const createTask = useCallback(
    async (title: string, userId: string) => {
      const now = serverTimestamp();
      await addDoc(tasksCol(teamId, projectId), {
        id: uuidv4(),
        team_id: teamId,
        project_id: projectId,
        section_id: sectionId,
        title: title.trim(),
        description: '',
        emoji: null,
        position: tasks.length,
        assignee_id: userId,
        assignee_name: null,
        due_date: null,
        due_time: null,
        start_date: null,
        duration_minutes: null,
        time_block: null,
        status: 'todo',
        completed_at: null,
        priority: 'normal',
        deliverables: [],
        checklist: [],
        attachments: [],
        depends_on: [],
        blocks: [],
        has_sub_project: false,
        sub_project_id: null,
        ai_generated: false,
        ai_confidence: null,
        ai_source_entry_id: null,
        decoration: null,
        reminders: [],
        recurrence: null,
        external_id: null,
        external_source: null,
        created_at: now,
        updated_at: now,
        created_by: userId,
        deleted_at: null,
        metadata: {},
      });
    },
    [teamId, projectId, sectionId, tasks.length],
  );

  const toggleTask = useCallback(
    async (taskId: string, currentStatus: Task['status']) => {
      const ref = doc(tasksCol(teamId, projectId), taskId);
      const isDone = currentStatus === 'done';
      await updateDoc(ref, {
        status: isDone ? 'todo' : 'done',
        completed_at: isDone ? null : serverTimestamp(),
        updated_at: serverTimestamp(),
      });
    },
    [teamId, projectId],
  );

  const updateTask = useCallback(
    async (taskId: string, data: Partial<Task>) => {
      const ref = doc(tasksCol(teamId, projectId), taskId);
      await updateDoc(ref, { ...data, updated_at: serverTimestamp() });
    },
    [teamId, projectId],
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      const ref = doc(tasksCol(teamId, projectId), taskId);
      await updateDoc(ref, { deleted_at: serverTimestamp(), updated_at: serverTimestamp() });
    },
    [teamId, projectId],
  );

  return { tasks, loading, createTask, toggleTask, updateTask, deleteTask };
}
