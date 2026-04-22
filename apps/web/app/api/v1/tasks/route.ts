import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { rateLimit } from '@/lib/auth/rateLimit';

// F-117: Public API v1 — 태스크 조회/생성
// Authorization: Bearer {API_KEY}

async function authenticate(req: NextRequest): Promise<{ userId: string; teamId: string } | null> {
  const auth = req.headers.get('authorization') ?? '';
  const apiKey = auth.replace('Bearer ', '').trim();
  if (!apiKey) return null;

  const keySnap = await adminDb.collection('api_keys')
    .where('key', '==', apiKey)
    .where('active', '==', true)
    .limit(1)
    .get();

  if (keySnap.empty) return null;
  const data = keySnap.docs[0]!.data();

  // 마지막 사용 시각 갱신
  await keySnap.docs[0]!.ref.update({ last_used_at: FieldValue.serverTimestamp() });

  return { userId: data['user_id'] as string, teamId: data['team_id'] as string };
}

// GET /api/v1/tasks — 태스크 목록 조회
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const apiKey = (req.headers.get('authorization') ?? '').replace('Bearer ', '').trim();
  if (!rateLimit(`apikey:${apiKey}:get`, 60, 60_000)) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
  }

  const { teamId } = auth;
  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const limit  = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 100);

  let q = adminDb.collection('teams').doc(teamId)
    .collection('tasks_independent')
    .where('deleted_at', '==', null)
    .orderBy('created_at', 'desc')
    .limit(limit);

  if (status) {
    q = adminDb.collection('teams').doc(teamId)
      .collection('tasks_independent')
      .where('deleted_at', '==', null)
      .where('status', '==', status)
      .orderBy('created_at', 'desc')
      .limit(limit);
  }

  const snap = await q.get();
  const tasks = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: data['id'],
      title: data['title'],
      status: data['status'],
      priority: data['priority'],
      due_date: data['due_date']?.toDate?.()?.toISOString() ?? null,
      created_at: data['created_at']?.toDate?.()?.toISOString() ?? null,
    };
  });

  return NextResponse.json({ tasks, count: tasks.length });
}

// POST /api/v1/tasks — 태스크 생성
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const apiKey = (req.headers.get('authorization') ?? '').replace('Bearer ', '').trim();
  if (!rateLimit(`apikey:${apiKey}:post`, 30, 60_000)) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
  }

  const { userId, teamId } = auth;
  const body = await req.json() as {
    title: string;
    description?: string;
    priority?: string;
    due_date?: string;
  };

  if (!body.title?.trim()) {
    return NextResponse.json({ error: 'title 필수' }, { status: 400 });
  }

  const { v4: uuidv4 } = await import('uuid');
  const taskId = uuidv4();
  const ref = adminDb.collection('teams').doc(teamId)
    .collection('tasks_independent').doc(taskId);

  await ref.set({
    id: taskId,
    team_id: teamId,
    title: body.title.trim(),
    description: body.description ?? '',
    status: 'todo',
    priority: body.priority ?? 'normal',
    due_date: body.due_date ? new Date(body.due_date) : null,
    due_time: null,
    start_date: null,
    duration_minutes: null,
    time_block: 'unscheduled',
    position: null,
    checklist: [], attachments: [], deliverables: [],
    depends_on: [], blocks: [],
    recurrence: null,
    reminders: [],
    assignee_id: null,
    assignee_name: null,
    project_id: null, section_id: null,
    emoji: null,
    decoration: null,
    has_sub_project: false, sub_project_id: null,
    ai_generated: false, ai_confidence: null, ai_source_entry_id: null,
    external_id: null, external_source: null,
    created_by: userId,
    deleted_at: null, completed_at: null,
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp(),
    metadata: { source: 'api_v1' },
  });

  return NextResponse.json({ id: taskId, title: body.title.trim() }, { status: 201 });
}
