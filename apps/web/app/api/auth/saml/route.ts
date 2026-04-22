import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { verifyUser } from '@/lib/auth/verifyUser';
import { rateLimit } from '@/lib/auth/rateLimit';

// F-107: SAML SSO / 외부 Guest
// Firebase Auth SAML Provider를 통한 Enterprise SSO 지원
// 설정: Firebase Console > Authentication > Sign-in method > SAML

export async function POST(req: NextRequest) {
  const uid = await verifyUser(req);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!rateLimit(`${uid}:auth-saml`, 10, 60_000)) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
  }

  const { action, teamId, email, role = 'viewer' } = await req.json() as {
    action: 'invite_guest' | 'list_saml_providers';
    teamId?: string;
    email?: string;
    role?: string;
  };

  if (action === 'invite_guest') {
    if (!teamId || !email) {
      return NextResponse.json({ error: 'teamId, email 필수' }, { status: 400 });
    }

    // 팀 오너/어드민만 게스트 초대 가능
    const callerMember = await adminDb
      .collection('teams').doc(teamId)
      .collection('members').doc(uid).get();
    const callerRole = callerMember.data()?.['role'] as string | undefined;
    if (!callerMember.exists || !['owner', 'admin'].includes(callerRole ?? '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
      // 이메일로 기존 사용자 조회 or 생성
      let user;
      try {
        user = await adminAuth.getUserByEmail(email);
      } catch {
        // 없으면 임시 사용자 생성 (게스트)
        user = await adminAuth.createUser({
          email,
          displayName: email.split('@')[0],
          emailVerified: false,
        });
        // 게스트 커스텀 클레임
        await adminAuth.setCustomUserClaims(user.uid, { role: 'guest', teamId });
      }

      // Custom token 생성 (초대 링크용)
      const customToken = await adminAuth.createCustomToken(user.uid, {
        teamId,
        guestRole: role,
      });

      return NextResponse.json({
        success: true,
        uid: user.uid,
        customToken,
        email: user.email,
      });
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
  }

  if (action === 'list_saml_providers') {
    // Firebase에 설정된 SAML providers 목록 (환경변수로 관리)
    const providers = (process.env.SAML_PROVIDER_IDS ?? '')
      .split(',')
      .filter(Boolean)
      .map((id) => ({ id: id.trim(), name: id.trim().replace('saml.', '') }));

    return NextResponse.json({ providers });
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 });
}
