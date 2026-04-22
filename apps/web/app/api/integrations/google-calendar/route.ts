import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyUser } from '@/lib/auth/verifyUser';
import { rateLimit } from '@/lib/auth/rateLimit';

// F-110: Google Calendar 일방향 IN
// Google OAuth 2.0 Access Token을 클라이언트에서 받아 처리
// 또는 서비스 계정 방식 (GOOGLE_SERVICE_ACCOUNT_KEY 환경변수)

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end:   { dateTime?: string; date?: string };
  status: string;
}

export async function POST(req: NextRequest) {
  const uid = await verifyUser(req);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!rateLimit(`${uid}:gcal-import`, 10, 60_000)) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
  }

  const { teamId, accessToken, calendarId = 'primary' } = await req.json() as {
    teamId: string;
    accessToken: string;
    calendarId?: string;
  };
  const userId = uid;

  if (!teamId || !accessToken) {
    return NextResponse.json({ error: 'teamId, accessToken 필수' }, { status: 400 });
  }

  // Google Calendar API 호출 — 오늘부터 30일
  const timeMin = new Date().toISOString();
  const timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const gcalRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events` +
    `?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}` +
    `&singleEvents=true&orderBy=startTime&maxResults=50`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!gcalRes.ok) {
    const err = await gcalRes.text();
    console.error('[gcal] Google API error:', err);
    return NextResponse.json({ error: 'Google Calendar API 호출 실패', detail: err }, { status: 502 });
  }

  const gcalData = await gcalRes.json() as { items: CalendarEvent[] };
  const events = gcalData.items ?? [];

  // Firestore에 태스크로 변환·저장
  const { v4: uuidv4 } = await import('uuid');
  const batch = adminDb.batch();
  let imported = 0;

  for (const ev of events) {
    if (ev.status === 'cancelled') continue;

    const startStr = ev.start.dateTime ?? ev.start.date;
    if (!startStr) continue;
    const dueDate = new Date(startStr);

    // 중복 방지: external_id로 이미 있는지 확인
    const existing = await adminDb
      .collection('teams').doc(teamId)
      .collection('tasks_independent')
      .where('external_id', '==', `gcal:${ev.id}`)
      .where('deleted_at', '==', null)
      .limit(1)
      .get();
    if (!existing.empty) continue;

    const taskId = uuidv4();
    const ref = adminDb.collection('teams').doc(teamId)
      .collection('tasks_independent').doc(taskId);

    batch.set(ref, {
      id: taskId,
      team_id: teamId,
      title: ev.summary ?? '(제목 없음)',
      description: ev.description ?? '',
      status: 'todo',
      priority: 'normal',
      due_date: dueDate,
      due_time: ev.start.dateTime ? ev.start.dateTime.slice(11, 16) : null,
      start_date: null,
      duration_minutes: null,
      time_block: resolveTimeBlock(dueDate),
      position: null,
      checklist: [],
      attachments: [],
      deliverables: [],
      depends_on: [],
      blocks: [],
      recurrence: null,
      reminders: [],
      decoration: null,
      assignee_id: null,
      assignee_name: null,
      project_id: null,
      section_id: null,
      emoji: '📅',
      has_sub_project: false,
      sub_project_id: null,
      ai_generated: false,
      ai_confidence: null,
      ai_source_entry_id: null,
      external_id: `gcal:${ev.id}`,
      external_source: 'google_calendar',
      created_by: userId,
      deleted_at: null,
      completed_at: null,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
      metadata: {},
    });
    imported++;
  }

  await batch.commit();

  // 마지막 동기화 시각 + accessToken 저장 (Cron 기반 알림에서 재사용)
  // accessToken은 1시간 유효 — 보안: Admin SDK 전용 컬렉션에만 저장
  await adminDb.collection('users').doc(userId)
    .collection('settings').doc('integrations').set({
      google_calendar: {
        last_synced: FieldValue.serverTimestamp(),
        calendar_id: calendarId,
        imported_count: imported,
        access_token: accessToken,
        token_expires_at: new Date(Date.now() + 55 * 60 * 1000), // 55분 후 만료 처리
      },
    }, { merge: true });

  return NextResponse.json({ success: true, imported, total: events.length });
}

function resolveTimeBlock(date: Date): string {
  const h = date.getHours();
  if (h >= 5  && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}

// F-113: Google Calendar 양방향 — MDA 태스크 → Google Calendar 이벤트 생성/수정
export async function PUT(req: NextRequest) {
  const uid = await verifyUser(req);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!rateLimit(`${uid}:gcal-export`, 20, 60_000)) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
  }

  const { accessToken, calendarId = 'primary', task } = await req.json() as {
    accessToken: string;
    calendarId?: string;
    task: {
      id: string;
      title: string;
      description?: string;
      due_date?: string | null;
      due_time?: string | null;
      duration_minutes?: number | null;
      gcal_event_id?: string | null;
    };
  };

  if (!accessToken || !task) {
    return NextResponse.json({ error: 'missing params' }, { status: 400 });
  }

  const startDate = task.due_date ? new Date(task.due_date) : new Date();
  if (task.due_time) {
    const [h, m] = task.due_time.split(':').map(Number);
    startDate.setHours(h ?? 0, m ?? 0, 0, 0);
  }

  const endDate = new Date(startDate.getTime() + (task.duration_minutes ?? 60) * 60 * 1000);

  const eventBody = {
    summary: task.title,
    description: task.description ?? '',
    start: { dateTime: startDate.toISOString(), timeZone: 'Asia/Seoul' },
    end:   { dateTime: endDate.toISOString(),   timeZone: 'Asia/Seoul' },
    extendedProperties: { private: { mda_task_id: task.id } },
  };

  const isUpdate = Boolean(task.gcal_event_id);
  const url = isUpdate
    ? `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${task.gcal_event_id}`
    : `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;

  const gcalRes = await fetch(url, {
    method: isUpdate ? 'PUT' : 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventBody),
  });

  if (!gcalRes.ok) {
    const err = await gcalRes.text();
    return NextResponse.json({ error: 'gcal_write_failed', detail: err }, { status: 502 });
  }

  const created = await gcalRes.json() as { id: string; htmlLink: string };
  return NextResponse.json({ success: true, gcal_event_id: created.id, link: created.htmlLink });
}
