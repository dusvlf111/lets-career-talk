import { HttpError, requireUser, route } from '@/lib/auth';
import { ablyRest } from '@/lib/realtime';

const TOKEN_TTL_MS = 60 * 60 * 1000;

/**
 * 클라이언트용 Ably 토큰. 클라이언트는 구독/접속상태/타이핑만 가능하고
 * 메시지 발행은 서버(DB 저장 후)만 한다.
 */
export const GET = route(async () => {
  const user = await requireUser();
  const client = ablyRest();
  if (!client) throw new HttpError(503, '실시간 기능이 꺼져 있어요.');
  return client.auth.createTokenRequest({
    clientId: user.id,
    ttl: TOKEN_TTL_MS,
    capability: {
      'pub:*': ['subscribe'],
      [`user:${user.id}`]: ['subscribe'],
      global: ['subscribe', 'presence'],
      'typing:*': ['publish', 'subscribe'],
    },
  });
});
