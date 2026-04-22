import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyUser } from '@/lib/auth/verifyUser';
import { rateLimit } from '@/lib/auth/rateLimit';

// F-116: GitHub 연동 — Issues/PRs → 태스크
// GitHub Personal Access Token (ghp_...) 또는 OAuth App Token

interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  html_url: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  labels: { name: string; color: string }[];
  assignee: { login: string } | null;
  pull_request?: object;
  milestone: { due_on: string | null } | null;
}

function priorityFromLabels(labels: { name: string }[]): string {
  const names = labels.map((l) => l.name.toLowerCase());
  if (names.some((n) => n.includes('urgent') || n.includes('critical') || n.includes('p0'))) return 'urgent';
  if (names.some((n) => n.includes('high') || n.includes('p1'))) return 'high';
  if (names.some((n) => n.includes('low') || n.includes('p3'))) return 'low';
  return 'normal';
}

export async function POST(req: NextRequest) {
  const uid = await verifyUser(req);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!rateLimit(`${uid}:github-import`, 10, 60_000)) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
  }

  const { teamId, githubToken, repo, importPRs = false } = await req.json() as {
    teamId: string;
    githubToken: string;
    repo: string;
    importPRs?: boolean;
  };
  const userId = uid;

  if (!teamId || !githubToken || !repo) {
    return NextResponse.json({ error: 'teamId, githubToken, repo 필수' }, { status: 400 });
  }

  const headers = {
    Authorization: `Bearer ${githubToken}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  // Issues 조회 (PR 제외 또는 포함)
  const state = 'open';
  const url = `https://api.github.com/repos/${repo}/issues?state=${state}&per_page=50&sort=updated`;
  const ghRes = await fetch(url, { headers });

  if (!ghRes.ok) {
    const err = await ghRes.text();
    return NextResponse.json({ error: 'GitHub API 호출 실패', detail: err }, { status: 502 });
  }

  const issues = (await ghRes.json()) as GitHubIssue[];
  const { v4: uuidv4 } = await import('uuid');
  const batch = adminDb.batch();
  let imported = 0;

  for (const issue of issues) {
    // PR 제외
    if (!importPRs && issue.pull_request) continue;

    const extId = `github:${repo}#${issue.number}`;

    // 중복 방지
    const existing = await adminDb
      .collection('teams').doc(teamId)
      .collection('tasks_independent')
      .where('external_id', '==', extId)
      .where('deleted_at', '==', null)
      .limit(1)
      .get();
    if (!existing.empty) continue;

    const taskId = uuidv4();
    const ref = adminDb.collection('teams').doc(teamId)
      .collection('tasks_independent').doc(taskId);

    const dueDate = issue.milestone?.due_on ? new Date(issue.milestone.due_on) : null;
    const status = issue.state === 'closed' ? 'done' : 'todo';

    batch.set(ref, {
      id: taskId,
      team_id: teamId,
      title: `[#${issue.number}] ${issue.title}`,
      description: issue.body
        ? `${issue.body.slice(0, 500)}\n\n🔗 ${issue.html_url}`
        : `🔗 ${issue.html_url}`,
      status,
      priority: priorityFromLabels(issue.labels),
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
      emoji: issue.pull_request ? '🔀' : '🐛',
      has_sub_project: false,
      sub_project_id: null,
      ai_generated: false,
      ai_confidence: null,
      ai_source_entry_id: null,
      external_id: extId,
      external_source: 'github',
      created_by: userId,
      deleted_at: null,
      completed_at: issue.closed_at ? new Date(issue.closed_at) : null,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
      metadata: {
        github_repo: repo,
        github_number: issue.number,
        github_url: issue.html_url,
        labels: issue.labels.map((l) => l.name),
      },
    });
    imported++;
  }

  await batch.commit();

  await adminDb.collection('users').doc(userId)
    .collection('settings').doc('integrations').set({
      github: {
        last_synced: FieldValue.serverTimestamp(),
        repo,
        imported_count: imported,
      },
    }, { merge: true });

  return NextResponse.json({ success: true, imported, total: issues.length });
}
