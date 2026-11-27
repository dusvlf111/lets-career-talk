import 'server-only';

/**
 * 인스턴스 메모리 캐시 (TTL). Vercel 함수 인스턴스는 재사용되므로
 * 자주 바뀌지 않는 조회(사용자, 채널, DM 멤버)의 DB 왕복을 줄인다.
 */
export function memo<T>(ttlMs: number) {
  const store = new Map<string, { value: T; expires: number }>();
  return {
    async get(key: string, load: () => Promise<T>) {
      const hit = store.get(key);
      if (hit && hit.expires > Date.now()) return hit.value;
      const value = await load();
      if (value !== null && value !== undefined) store.set(key, { value, expires: Date.now() + ttlMs });
      return value;
    },
    delete(key: string) {
      store.delete(key);
    },
  };
}
