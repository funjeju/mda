'use client';

import { useEffect, useState } from 'react';
import { onSnapshot, query, where } from 'firebase/firestore';
import type { Task } from '@mda/shared';
import { independentTasksCol } from '../firestore/collections';
import { taskConverter } from '../firestore/converters';

export function useMonthTasks(teamId: string, userId: string, year: number, month: number) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamId || !userId) return;
    // 해당 월의 시작~끝 범위
    const start = new Date(year, month, 1);
    const end   = new Date(year, month + 1, 1);

    const q = query(
      independentTasksCol(teamId).withConverter(taskConverter),
      where('deleted_at', '==', null),
      where('created_by', '==', userId),
    );

    return onSnapshot(q, (snap) => {
      setTasks(snap.docs.map((d) => d.data()));
      setLoading(false);
    }, () => setLoading(false));
  }, [teamId, userId, year, month]);

  function getTasksForDate(date: Date): Task[] {
    const d0 = new Date(date); d0.setHours(0, 0, 0, 0);
    const d1 = new Date(d0); d1.setDate(d0.getDate() + 1);
    return tasks.filter((t) => {
      if (!t.due_date) return false;
      const td = t.due_date as unknown as { toDate?: () => Date };
      const due = td?.toDate?.() ?? new Date(t.due_date as unknown as string);
      return due >= d0 && due < d1;
    });
  }

  return { tasks, loading, getTasksForDate };
}
