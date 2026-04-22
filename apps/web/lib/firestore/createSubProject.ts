import { addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { projectsCol, tasksCol, independentTaskDoc } from './collections';
import { db } from '../firebase';
import type { Task } from '@mda/shared';

export interface SubProjectOptions {
  taskId: string;
  taskTitle: string;
  taskEmoji?: string | null;
  teamId: string;
  userId: string;
  /** 프로젝트 내 태스크인 경우 */
  projectId?: string;
}

export async function createSubProject({
  taskId,
  taskTitle,
  taskEmoji,
  teamId,
  userId,
  projectId,
}: SubProjectOptions): Promise<string> {
  const newProjectId = uuidv4();
  const now = serverTimestamp();

  await addDoc(projectsCol(teamId), {
    id: newProjectId,
    team_id: teamId,
    title: taskTitle,
    description: '',
    emoji: taskEmoji ?? null,
    color: null,
    parent_task_id: taskId,
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

  // 해당 태스크 업데이트
  const taskRef = projectId
    ? doc(tasksCol(teamId, projectId), taskId)
    : independentTaskDoc(teamId, taskId);

  await updateDoc(taskRef, {
    has_sub_project: true,
    sub_project_id: newProjectId,
    updated_at: serverTimestamp(),
  });

  return newProjectId;
}
