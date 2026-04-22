import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyUser } from '@/lib/auth/verifyUser';
import { rateLimit } from '@/lib/auth/rateLimit';

// F-112: Gmail 메타데이터 통합
// gmail.readonly scope로 받은 accessToken → 최근 이메일 제목/발신자 → 태스크 생성
// 수신 이메일에서 "할 일"을 추출해 tasks_independent에 저장

interface GmailMessage {
  id: string;
  threadId: string;
  payload: {
    headers: { name: string; value: string }[];
  };
  snippet: string;
  internalDate: string;
}

function extractHeader(headers: { name: string; value: string }[], name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? '';
}

function isActionable(subject: string, snippet: string): boolean {
  const keywords = ['요청', '부탁', '처리', '확인', '회신', '검토', '승인', '제출', '전달', 'todo', 'action', 'urgent', 'review', 'please', 'request'];
  const text = (subject + ' ' + snippet).toLowerCase();
  return keywords.some((k) => text.includes(k));
}

export async function POST(req: NextRequest) {
  const uid = await verifyUser(req);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!rateLimit(`${uid}:gmail-import`, 10, 60_000)) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
  }

  const { accessToken, teamId } = await req.json() as {
    accessToken: string;
    teamId: string;
  };
  const userId = uid;

  if (!accessToken || !teamId) {
    return NextResponse.json({ error: 'accessToken, teamId 필수' }, { status: 400 });
  }

  // 최근 20개 이메일 목록 조회
  const listRes = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20&q=is:unread',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!listRes.ok) {
    return NextResponse.json({ error: 'gmail_fetch_failed' }, { status: 502 });
  }

  const listData = await listRes.json() as { messages?: { id: string }[] };
  const messageIds = listData.messages ?? [];

  if (messageIds.length === 0) {
    return NextResponse.json({ imported: 0 });
  }

  // 메시지 상세 병렬 조회 (최대 10개)
  const details = await Promise.all(
    messageIds.slice(0, 10).map(async ({ id }) => {
      const r = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!r.ok) return null;
      return r.json() as Promise<GmailMessage>;
    })
  );

  const col = adminDb.collection('teams').doc(teamId).collection('tasks_independent');
  let imported = 0;

  for (const msg of details) {
    if (!msg) continue;
    const subject = extractHeader(msg.payload.headers, 'subject') || '(제목 없음)';
    const from    = extractHeader(msg.payload.headers, 'from');
    const snippet = msg.snippet ?? '';

    if (!isActionable(subject, snippet)) continue;

    // 중복 체크
    const existing = await col.where('external_id', '==', `gmail:${msg.id}`).limit(1).get();
    if (!existing.empty) continue;

    await col.add({
      id: msg.id,
      team_id: teamId,
      project_id: null, section_id: null,
      title: subject,
      description: `From: ${from}\n\n${snippet}`,
      emoji: '📧',
      position: null,
      assignee_id: userId, assignee_name: null,
      due_date: null, due_time: null,
      start_date: null, duration_minutes: null, time_block: null,
      status: 'todo', completed_at: null, priority: 'normal',
      deliverables: [], checklist: [], attachments: [], depends_on: [], blocks: [],
      recurrence: null,
      has_sub_project: false, sub_project_id: null,
      ai_generated: true, ai_confidence: null, ai_source_entry_id: null,
      decoration: null, reminders: [],
      external_id: `gmail:${msg.id}`,
      external_source: 'gmail',
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
      created_by: userId, deleted_at: null, metadata: { gmail_thread_id: msg.threadId },
    });
    imported++;
  }

  return NextResponse.json({ imported });
}
