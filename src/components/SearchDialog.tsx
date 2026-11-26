'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { api, type SearchResult } from './api';
import { formatDay, formatTime } from './format';
import { useUi } from './Workspace';

const SEARCH_DEBOUNCE_MS = 300;

export default function SearchDialog({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const router = useRouter();
  const { openThread, setSidebarOpen } = useUi();

  useEffect(() => {
    const id = setTimeout(() => setDebounced(q.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [q]);

  const { data, isFetching } = useQuery({
    queryKey: ['search', debounced],
    queryFn: () => api<SearchResult[]>(`/api/search?q=${encodeURIComponent(debounced)}`),
    enabled: debounced.length >= 2,
  });

  const open = (r: SearchResult) => {
    onClose();
    setSidebarOpen(false);
    router.push(`/c/${r.channel_id}`);
    // 채널 전환 후 스레드 열기
    setTimeout(() => openThread(r.parent_id ?? r.id), 0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-20" onClick={onClose}>
      <div className="w-full max-w-xl overflow-hidden rounded-lg bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && onClose()}
          placeholder="메시지 검색 (2글자 이상)"
          className="w-full border-b px-4 py-3 outline-none"
        />
        <ul className="max-h-[60vh] overflow-y-auto">
          {isFetching && <li className="px-4 py-3 text-sm text-neutral-500">검색 중…</li>}
          {data?.length === 0 && <li className="px-4 py-3 text-sm text-neutral-500">결과가 없어요.</li>}
          {data?.map((r) => (
            <li key={r.id}>
              <button onClick={() => open(r)} className="block w-full border-b px-4 py-2.5 text-left hover:bg-neutral-50">
                <div className="flex gap-2 text-xs text-neutral-500">
                  <span className="font-semibold">{r.channel_type === 'dm' ? 'DM' : `#${r.channel_name}`}</span>
                  <span>{r.display_name}</span>
                  <span>
                    {formatDay(r.created_at)} {formatTime(r.created_at)}
                  </span>
                </div>
                <p className="line-clamp-2 text-sm">{r.body}</p>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
