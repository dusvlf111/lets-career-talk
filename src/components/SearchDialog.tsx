'use client';

import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex animate-fade-in items-start justify-center bg-black/50 p-4 pt-[12vh]" onClick={onClose}>
      <div className="w-full max-w-xl overflow-hidden rounded-lg bg-white shadow-04" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-neutral-80 px-4">
          <Search className="size-5 text-neutral-45" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && onClose()}
            placeholder="메시지 검색 (2글자 이상)"
            className="h-14 flex-1 text-xsmall16 outline-none placeholder:text-neutral-50"
          />
          <kbd className="rounded-xxs border border-neutral-80 px-1.5 text-xxsmall12 text-neutral-45">ESC</kbd>
        </div>
        <ul className="max-h-[60vh] overflow-y-auto py-1">
          {isFetching && <li className="px-4 py-3 text-xsmall14 text-neutral-40">검색 중…</li>}
          {data?.length === 0 && <li className="px-4 py-6 text-center text-xsmall14 text-neutral-40">결과가 없어요.</li>}
          {data?.map((r) => (
            <li key={r.id}>
              <button onClick={() => open(r)} className="block w-full px-4 py-3 text-left hover:bg-neutral-95">
                <div className="flex items-center gap-2 text-xxsmall12 text-neutral-45">
                  <span className="rounded-xxs bg-primary-10 px-1.5 py-0.5 font-semibold text-primary">
                    {r.channel_type === 'dm' ? 'DM' : `#${r.channel_name}`}
                  </span>
                  <span className="font-semibold text-neutral-30">{r.display_name}</span>
                  <span>
                    {formatDay(r.created_at)} {formatTime(r.created_at)}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-xsmall14 text-neutral-10">{r.body}</p>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
