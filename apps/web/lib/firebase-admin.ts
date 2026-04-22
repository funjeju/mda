import * as admin from 'firebase-admin';

// 싱글턴 — Next.js hot reload 시 중복 초기화 방지
if (!admin.apps.length) {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const projectId    = process.env.FIREBASE_PROJECT_ID;
  const clientEmail  = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey   = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (serviceAccountJson) {
    // JSON 통합 키 방식 (권장: 하나의 환경변수에 JSON 전체)
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(serviceAccountJson)),
    });
  } else if (projectId && clientEmail && privateKey) {
    // 개별 필드 방식 (Vercel 등 UI에서 키 입력 시 편리)
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
  } else {
    // 로컬 개발: Application Default Credentials (gcloud auth application-default login)
    admin.initializeApp();
  }
}

export const adminDb: ReturnType<typeof admin.firestore> = admin.firestore();
export const adminAuth: ReturnType<typeof admin.auth> = admin.auth();
export const adminMessaging: ReturnType<typeof admin.messaging> = admin.messaging();
export default admin;
