import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyUser } from '@/lib/auth/verifyUser';
import { rateLimit } from '@/lib/auth/rateLimit';

export async function POST(req: NextRequest) {
  try {
    const uid = await verifyUser(req);
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!rateLimit(`${uid}:invite-create`, 10, 60_000)) {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
    }

    const { teamId, role = 'member' } = await req.json() as {
      teamId: string; role?: 'admin' | 'member';
    };
    const userId = uid;

    if (!teamId) {
      return NextResponse.json({ error: 'teamId 필수' }, { status: 400 });
    }

    // 팀 오너/어드민만 초대 코드 생성 가능
    const callerMember = await adminDb.collection('teams').doc(teamId)
      .collection('members').doc(userId).get();
    const callerRole = callerMember.data()?.['role'] as string | undefined;
    if (!callerMember.exists || !['owner', 'admin'].includes(callerRole ?? '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const code = uuidv4().replace(/-/g, '').slice(0, 12);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    const now = FieldValue.serverTimestamp();

    const invitePayload = {
      code,
      team_id: teamId,
      created_by: userId,
      expires_at: expiresAt,
      max_uses: 10,
      used_count: 0,
      role,
      active: true,
      created_at: now,
    };

    // 팀 내부 invite 저장
    await adminDb.collection('teams').doc(teamId).collection('invites').add(invitePayload);

    // 전역 invite_codes 컬렉션에도 저장 (수락 시 조회용)
    await adminDb.collection('invite_codes').doc(code).set(invitePayload);

    return NextResponse.json({ code });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
