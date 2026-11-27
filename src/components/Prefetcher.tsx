'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { messagesQuery, type SidebarChannel } from './api';

/** 미리 받아둔 목록은 실시간 이벤트로 계속 갱신되므로 넉넉히 신선하다고 본다 */
const PREFETCH_STALE_MS = 5 * 60 * 1000;
/** 첫 화면 로딩을 방해하지 않도록 조금 늦게 시작 */
const PREFETCH_DELAY_MS = 300;

/** 참여 중인 채널과 DM의 메시지를 미리 받아서 채널 이동을 즉시 보이게 한다 */
export default function Prefetcher({ channels }: { channels: SidebarChannel[] }) {
  const qc = useQueryClient();
  const ids = channels
    .filter((c) => c.type === 'dm' || c.joined)
    .map((c) => c.id)
    .join(',');

  useEffect(() => {
    const timer = setTimeout(() => {
      for (const id of ids.split(',').filter(Boolean)) {
        qc.prefetchQuery({ ...messagesQuery(id), staleTime: PREFETCH_STALE_MS });
      }
    }, PREFETCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [ids, qc]);

  return null;
}

export function usePrefetchChannel() {
  const qc = useQueryClient();
  return (id: string) => qc.prefetchQuery({ ...messagesQuery(id), staleTime: PREFETCH_STALE_MS });
}
