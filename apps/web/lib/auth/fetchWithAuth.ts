'use client';

import { auth } from '../firebase';

/**
 * Firebase ID 토큰을 Authorization 헤더에 자동으로 포함하는 fetch 래퍼.
 * 서버 API 라우트 호출 시 사용한다.
 */
export async function fetchWithAuth(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const token = await auth.currentUser?.getIdToken();
  const headers = new Headers(init?.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}
