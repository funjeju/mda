import { NextRequest } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';

/**
 * Authorization: Bearer <Firebase ID Token> 헤더를 검증하고 uid를 반환.
 * 토큰이 없거나 유효하지 않으면 null 반환.
 */
export async function verifyUser(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(auth.slice(7));
    return decoded.uid;
  } catch {
    return null;
  }
}
