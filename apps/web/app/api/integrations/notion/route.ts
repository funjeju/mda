import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyUser } from '@/lib/auth/verifyUser';
import { rateLimit } from '@/lib/auth/rateLimit';

// F-111: Notion 임포트 (일회성)
// Notion Integration Token 필요: https://www.notion.so/my-integrations

interface NotionPage {
  id: string;
  object: string;
  properties: Record<string, NotionProperty>;
  url: string;
  created_time: string;
  last_edited_time: string;
}

interface NotionProperty {
  type: string;
  title?: { plain_text: string }[];
  rich_text?: { plain_text: string }[];
  checkbox?: boolean;
  date?: { start: string | null };
  select?: { name: string } | null;
  status?: { name: string } | null;
}

function extractTitle(page: NotionPage): string {
  for (const prop of Object.values(page.properties)) {
    if (prop.type === 'title' && prop.title?.[0]) {
      return prop.title[0].plain_text;
    }
  }
  return '(제목 없음)';
}

function extractDate(page: NotionPage): Date | null {
  for (const prop of Object.values(page.properties)) {
    if (prop.type === 'date' && prop.date?.start) {
      return new Date(prop.date.start);
    }
  }
  return null;
}

function extractStatus(page: NotionPage): string {
  for (const prop of Object.values(page.properties)) {
    if (prop.type === 'checkbox') {
      return prop.checkbox ? 'done' : 'todo';
    }
    if (prop.type === 'status' && prop.status) {
      const name = prop.status.name.toLowerCase();
      if (name.includes('done') || name.includes('완료')) return 'done';
      if (name.includes('progress') || name.includes('진행')) return 'in_progress';
    }
  }
  return 'todo';
}

export async function POST(req: NextRequest) {
  const uid = await verifyUser(req);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!rateLimit(`${uid}:notion-import`, 10, 60_000)) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
  }

  const { teamId, notionToken, databaseId } = await req.json() as {
    teamId: string;
    notionToken: string;
    databaseId?: string;
  };
  const userId = uid;

  if (!teamId || !notionToken) {
    return NextResponse.json({ error: 'teamId, notionToken 필수' }, { status: 400 });
  }

  const headers = {
    Authorization: `Bearer ${notionToken}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  };

  // 1. 데이터베이스 목록 조회 (databaseId 미지정 시)
  let pages: NotionPage[] = [];

  if (databaseId) {
    // 특정 DB에서 페이지 조회
    const dbRes = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ page_size: 100 }),
    });
    if (!dbRes.ok) {
      return NextResponse.json({ error: 'Notion DB 조회 실패' }, { status: 502 });
    }
    const dbData = await dbRes.json() as { results: NotionPage[] };
    pages = dbData.results;
  } else {
    // Search API로 최근 수정된 페이지/DB 조회
    const searchRes = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        filter: { value: 'page', property: 'object' },
        sort: { direction: 'descending', timestamp: 'last_edited_time' },
        page_size: 50,
      }),
    });
    if (!searchRes.ok) {
      const err = await searchRes.text();
      return NextResponse.json({ error: 'Notion API 호출 실패', detail: err }, { status: 502 });
    }
    const searchData = await searchRes.json() as { results: NotionPage[] };
    pages = searchData.results;
  }

  // 2. 페이지 → 태스크 변환
  const { v4: uuidv4 } = await import('uuid');
  const batch = adminDb.batch();
  let imported = 0;

  for (const page of pages) {
    const title = extractTitle(page);
    if (!title || title === '(제목 없음)') continue;

    // 중복 방지
    const existing = await adminDb
      .collection('teams').doc(teamId)
      .collection('tasks_independent')
      .where('external_id', '==', `notion:${page.id}`)
      .where('deleted_at', '==', null)
      .limit(1)
      .get();
    if (!existing.empty) continue;

    const taskId = uuidv4();
    const ref = adminDb.collection('teams').doc(teamId)
      .collection('tasks_independent').doc(taskId);
    const dueDate = extractDate(page);
    const status = extractStatus(page);

    batch.set(ref, {
      id: taskId,
      team_id: teamId,
      title,
      description: `Notion에서 임포트됨: ${page.url}`,
      status,
      priority: 'normal',
      due_date: dueDate,
      due_time: null,
      start_date: null,
      duration_minutes: null,
      time_block: 'unscheduled',
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
      emoji: '📝',
      has_sub_project: false,
      sub_project_id: null,
      ai_generated: false,
      ai_confidence: null,
      ai_source_entry_id: null,
      external_id: `notion:${page.id}`,
      external_source: 'notion',
      created_by: userId,
      deleted_at: null,
      completed_at: status === 'done' ? FieldValue.serverTimestamp() : null,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
      metadata: { notion_url: page.url },
    });
    imported++;
  }

  await batch.commit();

  await adminDb.collection('users').doc(userId)
    .collection('settings').doc('integrations').set({
      notion: {
        last_synced: FieldValue.serverTimestamp(),
        imported_count: imported,
      },
    }, { merge: true });

  return NextResponse.json({ success: true, imported, total: pages.length });
}
