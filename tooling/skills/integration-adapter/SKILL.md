---
name: integration-adapter
description: 외부 서비스 연동 공통 패턴. OAuth, 토큰 갱신, Webhook, 에러 처리. Google Calendar·Notion·Gmail 등 연동 작업 시 로드한다.
---

# Integration Adapter

## OAuth 플로우

```
설정 > 연동 > [서비스] 연결
  ↓
OAuth Authorization URL로 리다이렉트
  ↓
사용자 권한 부여
  ↓
Redirect with code → Cloud Function 수신
  ↓
code → access_token + refresh_token 교환
  ↓
KMS 암호화 후 teams/{teamId}/integrations/{provider} 저장
  ↓
Integration entity 생성
  ↓
첫 동기화 시작
```

## 공통 Adapter 인터페이스

```typescript
interface IntegrationAdapter {
  provider: 'google_calendar' | 'notion' | 'gmail' | 'github' | 'slack';
  connect(userId: string): Promise<{ authUrl: string }>;
  handleCallback(code: string, state: string): Promise<Integration>;
  sync(integration: Integration): Promise<SyncResult>;
  disconnect(integration: Integration): Promise<void>;
}
```

## 토큰 관리

```typescript
// integrations/{provider} 컬렉션은 클라이언트 직접 접근 불가 (Rules에서 차단)
// Cloud Function (Admin SDK)만 읽기/쓰기

interface IntegrationToken {
  access_token: string;    // KMS 암호화
  refresh_token: string;  // KMS 암호화
  expires_at: Timestamp;
  scopes: string[];
}

// 토큰 갱신 (만료 5분 전 자동)
async function refreshTokenIfNeeded(provider: string, teamId: string): Promise<string> {
  const doc = await adminDb.doc(`teams/${teamId}/integrations/${provider}`).get();
  const token = doc.data() as IntegrationToken;
  if (token.expires_at.toMillis() < Date.now() + 5 * 60 * 1000) {
    return await refreshOAuthToken(provider, token.refresh_token);
  }
  return token.access_token;
}
```

## 동기화 방향 원칙

| 연동 | 방향 | 주의 |
|------|------|------|
| Google Calendar | IN만 (기본) / 양방향 (선택) | 양방향 시 충돌 처리 필요 |
| Notion | 임포트/익스포트 일회성만 | **양방향 동기화 금지** |
| Gmail | 읽기 전용 (메타만) | 본문은 태스크 생성 시만 |
| Apple Health | 읽기 전용 | 민감 정보, UserPrivate에만 |

## Rate Limit 대응

```typescript
async function withRateLimit<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (isRateLimitError(e)) {
      // exponential backoff: 1s, 2s, 4s, 8s...
      await delay(calculateBackoff(attempt));
      return withRateLimit(fn);
    }
    throw e;
  }
}
```

## Webhook vs Polling

| 서비스 | 방식 |
|--------|------|
| Google Calendar | Webhook (Push notifications) |
| Notion | Polling (Webhook 제한적) |
| Gmail | Polling (15분 주기) |
| GitHub | Webhook |
| Slack | Webhook |

Webhook 실패 시 Polling으로 Fallback.

## 오류 처리

- **토큰 만료**: 자동 갱신 → 실패 시 사용자 재인증 안내
- **Rate Limit**: exponential backoff, 24h 내 재시도 실패 시 사용자 알림
- **권한 취소**: 사용자에게 재연결 안내, 관련 기능 graceful degradation

## 보안 원칙

- 토큰은 클라이언트에 절대 노출 금지
- 최소 권한 스코프 요청 (readonly 우선)
- 사용자가 언제든 연결 해제 가능
- 연결 해제 시 관련 토큰 즉시 삭제

## 자주 하는 실수

- ❌ 토큰 클라이언트 코드에 저장 (localStorage, state)
- ❌ 불필요한 스코프 요청 (write when read suffices)
- ❌ Rate limit 무시 (429 에러 반복)
- ❌ Notion 양방향 동기화 시도 (충돌 해결 불가)
- ❌ 사용자 비동의 데이터 수집

## 관련 문서

- `spec/11_EXTERNAL_INTEGRATIONS.md` — 연동 전체 스펙
- `apps/web/app/api/integrations/` — 연동 API Routes
