'use client';

import { useQuery } from '@tanstack/react-query';

export type Me = { id: string; username: string; display_name: string; is_admin: boolean };
export type SidebarChannel = {
  id: string;
  name: string | null;
  type: 'public' | 'dm';
  topic: string;
  joined: boolean;
  unread: number;
  mention: number;
  dm_user_id: string | null;
  dm_name: string | null;
};
export type Member = { id: string; username: string; display_name: string };
export type Bootstrap = {
  me: Me;
  channels: SidebarChannel[];
  users: Member[];
  realtime: boolean;
};
export type Reaction = { emoji: string; count: number; mine: boolean };
export type Attachment = {
  id: string;
  url: string;
  name: string;
  content_type: string;
  size: number;
};
export type Message = {
  id: string;
  channel_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  created_at: number;
  edited_at: number | null;
  deleted_at: number | null;
  username: string;
  display_name: string;
  reply_count: number;
  last_reply_at: number | null;
  reactions: Reaction[];
  attachments: Attachment[];
};
export type SearchResult = {
  id: string;
  channel_id: string;
  parent_id: string | null;
  body: string;
  created_at: number;
  display_name: string;
  channel_name: string | null;
  channel_type: 'public' | 'dm';
};

/** 실시간이 꺼져 있을 때의 폴링 간격 */
export const POLL_INTERVAL_MS = 3_000;

export async function api<T = unknown>(path: string, init?: { method?: string; body?: unknown }) {
  const res = await fetch(path, {
    method: init?.method ?? 'GET',
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  if (res.status === 401) {
    window.location.href = '/login';
    throw new Error('로그인이 필요합니다.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? '요청에 실패했어요.');
  return data as T;
}

export const keys = {
  bootstrap: ['bootstrap'] as const,
  messages: (channelId: string) => ['messages', channelId] as const,
  thread: (parentId: string) => ['thread', parentId] as const,
};

export function useBootstrap() {
  return useQuery({
    queryKey: keys.bootstrap,
    queryFn: () => api<Bootstrap>('/api/bootstrap'),
    refetchInterval: (q) => (q.state.data?.realtime === false ? POLL_INTERVAL_MS * 2 : false),
  });
}

export function useMessages(channelId: string, realtime: boolean | undefined) {
  return useQuery({
    queryKey: keys.messages(channelId),
    queryFn: () => api<Message[]>(`/api/channels/${channelId}/messages`),
    refetchInterval: realtime === false ? POLL_INTERVAL_MS : false,
  });
}

export function useThread(parentId: string | null, realtime: boolean | undefined) {
  return useQuery({
    queryKey: keys.thread(parentId ?? ''),
    queryFn: () => api<{ parent: Message; replies: Message[] }>(`/api/messages/${parentId}/thread`),
    enabled: Boolean(parentId),
    refetchInterval: realtime === false ? POLL_INTERVAL_MS : false,
  });
}

export function channelLabel(c: Pick<SidebarChannel, 'type' | 'name' | 'dm_name'>) {
  if (c.type === 'dm') return c.dm_name ?? '나';
  return c.name ?? '';
}
