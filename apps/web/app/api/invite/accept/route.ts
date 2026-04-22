import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyUser } from '@/lib/auth/verifyUser';
import { rateLimit } from '@/lib/auth/rateLimit';

// F-133: 플랜별 팀 멤버 제한
const TEAM_MEMBER_LIMITS: Record<string, number> = {
  free: 1, plus: 1, team: 15, business: -1,
};

export async function POST(req: NextRequest) {
  try {
    const uid = await verifyUser(req);
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!rateLimit(`${uid}:invite-accept`, 10, 60_000)) {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
    }

    const { code, displayName, email } = await req.json() as {
      code: string; displayName: string; email: string;
    };
    const userId = uid;

    if (!code) {
      return NextResponse.json({ error: 'code 필수' }, { status: 400 });
    }

    const inviteRef = adminDb.collection('invite_codes').doc(code);
    const inviteSnap = await inviteRef.get();

    if (!inviteSnap.exists) {
      return NextResponse.json({ error: '유효하지 않은 초대 코드입니다' }, { status: 404 });
    }

    const invite = inviteSnap.data()!;
    const expiresAt = invite['expires_at']?.toDate?.() as Date | undefined;
    if (expiresAt && expiresAt < new Date()) {
      return NextResponse.json({ error: '초대 링크가 만료되었습니다' }, { status: 410 });
    }
    if (!invite['active']) {
      return NextResponse.json({ error: '비활성화된 초대 링크입니다' }, { status: 410 });
    }

    const teamId = invite['team_id'] as string;
    const role = (invite['role'] as string) ?? 'member';

    // F-133: 팀 멤버 제한 체크
    const [memberSnap, teamSnap] = await Promise.all([
      adminDb.collection('teams').doc(teamId).collection('members').get(),
      adminDb.collection('teams').doc(teamId).get(),
    ]);
    const currentCount = memberSnap.size;
    const ownerId = teamSnap.data()?.['owner_id'] as string | undefined;

    if (ownerId) {
      const subSnap = await adminDb.collection('users').doc(ownerId)
        .collection('settings').doc('subscription').get();
      const tier = (subSnap.data()?.['tier'] as string) ?? 'free';
      const limit = TEAM_MEMBER_LIMITS[tier] ?? 1;
      if (limit !== -1 && currentCount >= limit) {
        return NextResponse.json({
          error: `팀 플랜 멤버 제한(${limit}명)에 도달했습니다. 팀 오너에게 플랜 업그레이드를 요청하세요.`,
          code: 'MEMBER_LIMIT_REACHED',
        }, { status: 403 });
      }
    }

    const now = FieldValue.serverTimestamp();
    const batch = adminDb.batch();

    // 팀 멤버 추가
    const memberRef = adminDb.collection('teams').doc(teamId).collection('members').doc(userId);
    batch.set(memberRef, {
      id: userId,
      team_id: teamId,
      user_id: userId,
      display_name: displayName,
      email,
      role,
      joined_at: now,
      last_active_at: now,
      is_assignable: true,
      created_at: now,
      updated_at: now,
      created_by: userId,
      deleted_at: null,
      metadata: {},
    }, { merge: true });

    // 유저 current_team_id 업데이트
    batch.update(adminDb.collection('users').doc(userId), {
      current_team_id: teamId,
      updated_at: now,
    });

    // 사용 횟수 증가
    batch.update(inviteRef, {
      used_count: FieldValue.increment(1),
    });

    await batch.commit();

    return NextResponse.json({ success: true, teamId, role });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
