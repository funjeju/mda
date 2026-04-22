import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyUser } from '@/lib/auth/verifyUser';
import { rateLimit } from '@/lib/auth/rateLimit';

// F-115: Slack 봇
// POST /api/integrations/slack          — Slack Slash Command 수신 (태스크 생성)
// POST /api/integrations/slack/send     — MDA → Slack 메시지 발송 (서버 내부 호출)

export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') ?? '';

  // Slack Slash Command: application/x-www-form-urlencoded
  if (contentType.includes('application/x-www-form-urlencoded')) {
    return handleSlashCommand(req);
  }

  // MDA 내부 호출: JSON
  return handleSendNotification(req);
}

// Slack → MDA: /mda [할 일 내용]
async function handleSlashCommand(req: NextRequest) {
  const text = await req.text();
  const params = new URLSearchParams(text);

  const command   = params.get('command') ?? '';
  const taskText  = params.get('text') ?? '';
  const userId    = params.get('user_id') ?? '';
  const userName  = params.get('user_name') ?? '';
  const teamDomain = params.get('team_domain') ?? '';

  // Slack Verification Token 체크
  const verifyToken = process.env.SLACK_VERIFICATION_TOKEN;
  if (verifyToken && params.get('token') !== verifyToken) {
    return NextResponse.json({ text: '인증에 실패했습니다.' }, { status: 401 });
  }

  if (!taskText.trim()) {
    return NextResponse.json({
      response_type: 'ephemeral',
      text: '사용법: `/mda 오늘 오후 3시 팀 미팅 준비`',
    });
  }

  // Slack 유저 → MDA 유저 매핑 조회
  const mappingSnap = await adminDb
    .collection('slack_user_mappings')
    .where('slack_user_id', '==', userId)
    .where('slack_team_domain', '==', teamDomain)
    .limit(1)
    .get();

  if (mappingSnap.empty) {
    return NextResponse.json({
      response_type: 'ephemeral',
      text: `MDA 계정이 연결되지 않았습니다. 앱 설정 > 외부 연동에서 Slack을 연결해 주세요.`,
    });
  }

  const mapping = mappingSnap.docs[0]!.data();
  const mdaUserId = mapping['mda_user_id'] as string;
  const mdaTeamId = mapping['mda_team_id'] as string;

  // AI 분류 호출
  let title = taskText.trim();
  try {
    const classifyRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/classify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: taskText, activeProjectNames: [] }),
    });
    if (classifyRes.ok) {
      const classified = await classifyRes.json() as { title?: string };
      if (classified.title) title = classified.title;
    }
  } catch { /* AI 분류 실패해도 원문 사용 */ }

  // 태스크 생성
  const { v4: uuidv4 } = await import('uuid');
  const taskId = uuidv4();
  await adminDb.collection('teams').doc(mdaTeamId)
    .collection('tasks_independent').doc(taskId).set({
      id: taskId,
      team_id: mdaTeamId,
      title,
      description: `Slack @${userName}이 생성: ${taskText}`,
      status: 'todo',
      priority: 'normal',
      due_date: null,
      due_time: null,
      start_date: null,
      duration_minutes: null,
      time_block: 'unscheduled',
      position: null,
      checklist: [], attachments: [], deliverables: [],
      depends_on: [], blocks: [],
      recurrence: null,
      reminders: [],
      assignee_id: mdaUserId,
      assignee_name: null,
      project_id: null, section_id: null,
      emoji: '💬',
      decoration: null,
      has_sub_project: false, sub_project_id: null,
      ai_generated: true, ai_confidence: null, ai_source_entry_id: null,
      external_id: null, external_source: null,
      created_by: mdaUserId,
      deleted_at: null, completed_at: null,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
      metadata: { slack_user_id: userId, slack_command: command },
    });

  return NextResponse.json({
    response_type: 'ephemeral',
    text: `✅ 태스크가 추가됐습니다: *${title}*`,
  });
}

// MDA → Slack: 알림 발송
async function handleSendNotification(req: NextRequest) {
  const uid = await verifyUser(req);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!rateLimit(`${uid}:slack-send`, 30, 60_000)) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
  }

  const { webhookUrl, text, blocks } = await req.json() as {
    webhookUrl: string;
    text: string;
    blocks?: object[];
  };

  if (!webhookUrl || !text) {
    return NextResponse.json({ error: 'webhookUrl, text 필수' }, { status: 400 });
  }

  // SSRF 방지: Slack Incoming Webhook URL만 허용
  if (!webhookUrl.startsWith('https://hooks.slack.com/')) {
    return NextResponse.json({ error: 'Invalid webhook URL' }, { status: 400 });
  }

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, blocks }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: 'Slack 발송 실패' }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}
