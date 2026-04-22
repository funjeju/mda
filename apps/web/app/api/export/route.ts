import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyUser } from '@/lib/auth/verifyUser';

function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]!);
  const escape = (v: unknown) => {
    const s = String(v ?? '').replace(/"/g, '""');
    return s.includes(',') || s.includes('\n') || s.includes('"') ? `"${s}"` : s;
  };
  return [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(',')),
  ].join('\n');
}

export async function GET(req: NextRequest) {
  const userId = await verifyUser(req);
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get('teamId');
  const format = searchParams.get('format') ?? 'json'; // 'json' | 'csv'
  const type   = searchParams.get('type')   ?? 'all';  // 'all' | 'tasks' | 'journal' | 'projects'

  if (!teamId) return NextResponse.json({ error: 'teamId required' }, { status: 400 });

  // Verify the user is a member of the team
  const memberDoc = await adminDb.collection('teams').doc(teamId)
    .collection('members').doc(userId).get();
  if (!memberDoc.exists) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const result: Record<string, unknown[]> = {};

  if (type === 'all' || type === 'tasks') {
    const snap = await adminDb.collection('teams').doc(teamId)
      .collection('tasks_independent')
      .where('deleted_at', '==', null)
      .orderBy('created_at', 'desc')
      .limit(1000)
      .get();
    result.tasks = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        title: data['title'],
        status: data['status'],
        priority: data['priority'],
        due_date: data['due_date']?.toDate?.()?.toISOString() ?? null,
        assignee_id: data['assignee_id'],
        created_at: data['created_at']?.toDate?.()?.toISOString() ?? null,
        completed_at: data['completed_at']?.toDate?.()?.toISOString() ?? null,
        description: data['description'],
        emoji: data['emoji'],
      };
    });
  }

  if (type === 'all' || type === 'journal') {
    const snap = await adminDb.collection('teams').doc(teamId)
      .collection('journal_entries')
      .where('created_by', '==', userId)
      .where('deleted_at', '==', null)
      .orderBy('created_at', 'desc')
      .limit(500)
      .get();
    result.journal = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        content: data['content'],
        emotion: data['emotion'],
        is_private: data['is_private'],
        created_at: data['created_at']?.toDate?.()?.toISOString() ?? null,
      };
    });
  }

  if (type === 'all' || type === 'projects') {
    const snap = await adminDb.collection('teams').doc(teamId)
      .collection('projects')
      .where('deleted_at', '==', null)
      .orderBy('created_at', 'desc')
      .limit(200)
      .get();
    result.projects = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        title: data['title'],
        status: data['status'],
        emoji: data['emoji'],
        created_at: data['created_at']?.toDate?.()?.toISOString() ?? null,
      };
    });
  }

  if (format === 'csv') {
    // CSV는 단일 컬렉션만 지원
    const key = type === 'all' ? 'tasks' : type;
    const rows = (result[key] ?? []) as Record<string, unknown>[];
    const csv = toCSV(rows);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="mda-${key}-export.csv"`,
      },
    });
  }

  return new NextResponse(JSON.stringify(result, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="mda-export.json"',
    },
  });
}
