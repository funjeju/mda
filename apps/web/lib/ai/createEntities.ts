import {
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import {
  independentTasksCol,
  journalEntriesCol,
  dailyEntriesCol,
  personContactsCol,
  projectsCol,
} from '../firestore/collections';
import type { Segment } from './schemas';

export interface CreateEntityResult {
  type: 'task' | 'journal' | 'entry';
  id: string;
  title: string;
}

export async function createEntityFromSegment(
  segment: Segment,
  teamId: string,
  userId: string,
): Promise<CreateEntityResult | null> {
  const now = serverTimestamp();
  const d = segment.proposed_data;

  switch (segment.intent) {
    case 'task_creation':
    case 'schedule': {
      const id = uuidv4();
      const dueDate = d.date ? new Date(d.date) : null;
      await addDoc(independentTasksCol(teamId), {
        id,
        team_id: teamId,
        project_id: null,
        section_id: null,
        title: d.title ?? segment.segment,
        description: '',
        emoji: null,
        position: null,
        assignee_id: userId,
        assignee_name: null,
        due_date: dueDate,
        due_time: d.time ?? null,
        start_date: null,
        duration_minutes: null,
        time_block: null,
        status: 'todo',
        completed_at: null,
        priority: d.priority ?? 'normal',
        deliverables: [],
        checklist: [],
        attachments: [],
        depends_on: [],
        blocks: [],
        has_sub_project: false,
        sub_project_id: null,
        ai_generated: true,
        ai_confidence: segment.confidence,
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
      return { type: 'task', id, title: d.title ?? segment.segment };
    }

    case 'journal_emotion':
    case 'journal_event': {
      const id = uuidv4();
      await addDoc(journalEntriesCol(teamId), {
        id,
        team_id: teamId,
        content: segment.segment,
        emotion: d.emotion ?? null,
        mood: segment.intent === 'journal_emotion' ? 'emotional' : 'event',
        is_private: true,
        tags: [],
        linked_task_ids: [],
        linked_project_ids: [],
        ai_generated: true,
        ai_confidence: segment.confidence,
        created_at: now,
        updated_at: now,
        created_by: userId,
        deleted_at: null,
        metadata: {},
      });
      return { type: 'journal', id, title: segment.segment.slice(0, 30) };
    }

    case 'project_creation': {
      const id = uuidv4();
      const now2 = serverTimestamp();
      await addDoc(projectsCol(teamId), {
        id,
        team_id: teamId,
        title: d.title ?? segment.segment,
        description: '',
        emoji: null,
        color: null,
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
        ai_generated: true,
        ai_context: segment.segment,
        default_view_mode: 'mandarart',
        default_pivot_axis: 'section',
        created_at: now2,
        updated_at: now2,
        created_by: userId,
        deleted_at: null,
        metadata: {},
      });
      return { type: 'task', id, title: d.title ?? segment.segment };
    }

    case 'reminder_set': {
      // reminder는 독립 태스크로 생성 + due_date 설정
      const id = uuidv4();
      const dueDate = d.date ? new Date(d.date) : null;
      const now3 = serverTimestamp();
      await addDoc(independentTasksCol(teamId), {
        id,
        team_id: teamId,
        project_id: null,
        section_id: null,
        title: `🔔 ${d.title ?? segment.segment}`,
        description: '',
        emoji: '🔔',
        position: null,
        assignee_id: userId,
        assignee_name: null,
        due_date: dueDate,
        due_time: d.time ?? null,
        start_date: null,
        duration_minutes: null,
        time_block: null,
        status: 'todo',
        completed_at: null,
        priority: 'high',
        deliverables: [],
        checklist: [],
        attachments: [],
        depends_on: [],
        blocks: [],
        has_sub_project: false,
        sub_project_id: null,
        ai_generated: true,
        ai_confidence: segment.confidence,
        ai_source_entry_id: null,
        decoration: null,
        reminders: [],
        recurrence: null,
        external_id: null,
        external_source: null,
        created_at: now3,
        updated_at: now3,
        created_by: userId,
        deleted_at: null,
        metadata: {},
      });
      return { type: 'task', id, title: d.title ?? segment.segment };
    }

    case 'contact_mention': {
      if (!d.people || d.people.length === 0) return null;
      const now = serverTimestamp();
      const results: CreateEntityResult[] = [];
      for (const name of d.people) {
        // 이미 존재하는 연락처면 mention_count만 증가
        const existingSnap = await getDocs(
          query(personContactsCol(teamId), where('name', '==', name), where('deleted_at', '==', null)),
        );
        if (!existingSnap.empty) {
          const existing = existingSnap.docs[0]!;
          await updateDoc(doc(personContactsCol(teamId), existing.id), {
            mention_count: (existing.data().mention_count ?? 0) + 1,
            last_mentioned_at: now,
            updated_at: now,
          });
          results.push({ type: 'journal', id: existing.id, title: name });
        } else {
          const id = uuidv4();
          await addDoc(personContactsCol(teamId), {
            id,
            team_id: teamId,
            name,
            alternate_names: [],
            relationship: '',
            tags: [],
            email: null,
            phone: null,
            linked_user_id: null,
            first_mentioned_at: now,
            last_mentioned_at: now,
            mention_count: 1,
            recent_contexts: [],
            reminders: [],
            ai_summary: null,
            avatar_url: null,
            emoji: null,
            color: null,
            created_at: now,
            updated_at: now,
            created_by: userId,
            deleted_at: null,
            metadata: {},
          });
          results.push({ type: 'journal', id, title: name });
        }
      }
      return results[0] ?? null;
    }

    default:
      return null;
  }
}

export async function saveDailyEntry(
  text: string,
  teamId: string,
  userId: string,
  createdIds: { taskIds: string[]; journalIds: string[] },
): Promise<void> {
  await addDoc(dailyEntriesCol(teamId), {
    id: uuidv4(),
    team_id: teamId,
    input_type: 'text',
    raw_text: text,
    recording_id: null,
    attachment_ids: [],
    source: 'web',
    entered_at: serverTimestamp(),
    processing_status: 'processed',
    processed_at: serverTimestamp(),
    classifications: [],
    user_confirmed: true,
    user_modifications: null,
    created_task_ids: createdIds.taskIds,
    created_journal_ids: createdIds.journalIds,
    updated_contact_ids: [],
    location: null,
    device: 'web',
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
    created_by: userId,
    deleted_at: null,
    metadata: {},
  });
}
