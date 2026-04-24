'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  onSnapshot,
  addDoc,
  updateDoc,
  serverTimestamp,
  query,
  where,
  doc,
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import type { Task } from '@mda/shared';
import { db } from '../firebase';
import { independentTasksCol, independentTaskDoc } from '../firestore/collections';
import { taskConverter } from '../firestore/converters';
import { nextDueDate, isRecurrenceExpired } from '../utils/recurrence';

interface CreateTaskInput {
  title: string;
  due_date?: Date | null;
  priority?: Task['priority'];
}

export function useTodayTasks(teamId: string, userId: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const q = query(
      independentTasksCol(teamId).withConverter(taskConverter),
      where('deleted_at', '==', null),
      where('created_by', '==', userId),
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const tasks = snap.docs.map((d) => d.data());
      tasks.sort((a, b) => {
        const aT = (a.created_at as unknown as { toDate?: () => Date })?.toDate?.()?.getTime() ?? 0;
        const bT = (b.created_at as unknown as { toDate?: () => Date })?.toDate?.()?.getTime() ?? 0;
        return bT - aT;
      });
      setTasks(tasks);
      setLoading(false);
    }, () => setLoading(false));

    return unsubscribe;
  }, [teamId, userId]);

  const createTask = useCallback(
    async (input: CreateTaskInput) => {
      const now = serverTimestamp();
      await addDoc(independentTasksCol(teamId), {
        id: uuidv4(),
        team_id: teamId,
        project_id: null,
        section_id: null,
        title: input.title.trim(),
        description: '',
        emoji: null,
        position: null,
        assignee_id: userId,
        assignee_name: null,
        due_date: input.due_date ?? null,
        due_time: null,
        start_date: null,
        duration_minutes: null,
        time_block: null,
        status: 'todo',
        completed_at: null,
        priority: input.priority ?? 'normal',
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
    [teamId, userId],
  );

  const toggleTask = useCallback(
    async (taskId: string, currentStatus: Task['status']) => {
      const ref = doc(independentTasksCol(teamId), taskId);
      const isDone = currentStatus === 'done';
      await updateDoc(ref, {
        status: isDone ? 'todo' : 'done',
        completed_at: isDone ? null : serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      // 반복 태스크: 완료로 전환 시 다음 항목 자동 생성
      if (!isDone) {
        const task = tasks.find((t) => t.id === taskId);
        if (task?.recurrence && task.recurrence.frequency !== 'none') {
          const currentDue = task.due_date
            ? (() => {
                const d = task.due_date as unknown as { toDate?: () => Date };
                return d?.toDate?.() ?? new Date(task.due_date as unknown as string);
              })()
            : new Date();
          const nextDate = nextDueDate(currentDue, task.recurrence);
          if (!isRecurrenceExpired(nextDate, task.recurrence)) {
            const now = serverTimestamp();
            await addDoc(independentTasksCol(teamId), {
              id: uuidv4(),
              team_id: teamId,
              project_id: null,
              section_id: null,
              title: task.title,
              description: task.description ?? '',
              emoji: task.emoji ?? null,
              position: null,
              assignee_id: task.assignee_id,
              assignee_name: null,
              due_date: nextDate,
              due_time: task.due_time ?? null,
              start_date: null,
              duration_minutes: null,
              time_block: null,
              status: 'todo',
              completed_at: null,
              priority: task.priority,
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
              recurrence: task.recurrence,
              external_id: null,
              external_source: null,
              created_at: now,
              updated_at: now,
              created_by: userId,
              deleted_at: null,
              metadata: {},
            });
          }
        }
      }
    },
    [teamId, userId, tasks],
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      const ref = independentTaskDoc(teamId, taskId);
      await updateDoc(ref, {
        deleted_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
    },
    [teamId],
  );

  const updateTask = useCallback(
    async (taskId: string, data: Partial<Task>) => {
      const ref = doc(independentTasksCol(teamId), taskId);
      await updateDoc(ref, { ...data, updated_at: serverTimestamp() });
    },
    [teamId],
  );

  const bulkComplete = useCallback(
    async (taskIds: string[]) => {
      await Promise.all(
        taskIds.map((id) => {
          const ref = doc(independentTasksCol(teamId), id);
          return updateDoc(ref, { status: 'done', completed_at: serverTimestamp(), updated_at: serverTimestamp() });
        }),
      );
    },
    [teamId],
  );

  const bulkDelete = useCallback(
    async (taskIds: string[]) => {
      await Promise.all(
        taskIds.map((id) => {
          const ref = independentTaskDoc(teamId, id);
          return updateDoc(ref, { deleted_at: serverTimestamp(), updated_at: serverTimestamp() });
        }),
      );
    },
    [teamId],
  );

  return { tasks, loading, createTask, toggleTask, updateTask, deleteTask, bulkComplete, bulkDelete };
}
