import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyUser } from '@/lib/auth/verifyUser';
import { rateLimit } from '@/lib/auth/rateLimit';

// GET — 내 API 키 목록
export async function GET(req: NextRequest) {
  const uid = await verifyUser(req);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const snap = await adminDb.collection('api_keys')
    .where('user_id', '==', uid)
    .where('active', '==', true)
    .get();

  const keys = snap.docs.map((d) => ({
    id: d.id,
    name: d.data()['name'],
    key_preview: `mda_...${(d.data()['key'] as string).slice(-6)}`,
    created_at: d.data()['created_at']?.toDate?.()?.toISOString(),
    last_used_at: d.data()['last_used_at']?.toDate?.()?.toISOString() ?? null,
  }));

  return NextResponse.json({ keys });
}

// POST — API 키 발급
export async function POST(req: NextRequest) {
  const uid = await verifyUser(req);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!rateLimit(`${uid}:api-keys`, 5, 60_000)) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
  }

  const { name } = await req.json() as { name?: string };

  // 유저의 teamId 조회
  const userDoc = await adminDb.collection('users').doc(uid).get();
  const teamId = userDoc.data()?.['current_team_id'] as string | undefined;
  if (!teamId) return NextResponse.json({ error: '팀을 찾을 수 없습니다' }, { status: 404 });

  // 키 생성 (mda_ 접두어 + 32자 랜덤)
  const { randomBytes } = await import('crypto');
  const key = `mda_${randomBytes(24).toString('hex')}`;

  const ref = adminDb.collection('api_keys').doc();
  await ref.set({
    user_id: uid,
    team_id: teamId,
    key,
    name: name ?? `API Key ${new Date().toLocaleDateString('ko-KR')}`,
    active: true,
    last_used_at: null,
    created_at: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ id: ref.id, key, message: '이 키는 지금만 표시됩니다. 안전하게 보관하세요.' }, { status: 201 });
}

// DELETE — API 키 비활성화
export async function DELETE(req: NextRequest) {
  const uid = await verifyUser(req);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { keyId } = await req.json() as { keyId: string };
  if (!keyId) return NextResponse.json({ error: 'keyId 필수' }, { status: 400 });

  const ref = adminDb.collection('api_keys').doc(keyId);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.['user_id'] !== uid) {
    return NextResponse.json({ error: '키를 찾을 수 없습니다' }, { status: 404 });
  }

  await ref.update({ active: false });
  return NextResponse.json({ success: true });
}
