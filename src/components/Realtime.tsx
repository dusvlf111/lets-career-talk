'use client';

import { useQueryClient } from '@tanstack/react-query';
import type { Message as AblyMessage, PubSubClient } from '@ably/pubsub-device';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { keys, type Bootstrap } from './api';

type RealtimeEvent =
  | { type: 'message'; channelId: string; messageId: string; parentId: string | null }
  | { type: 'channels' };

type TypingListener = (userId: string, name: string) => void;

type RealtimeCtx = {
  online: Set<string>;
  connected: boolean;
  sendTyping: (channelId: string, name: string) => void;
  onTyping: (channelId: string, listener: TypingListener) => () => void;
};

const Ctx = createContext<RealtimeCtx>({
  online: new Set(),
  connected: false,
  sendTyping: () => {},
  onTyping: () => () => {},
});

export const useRealtime = () => useContext(Ctx);

const BOOTSTRAP_DEBOUNCE_MS = 400;

export default function RealtimeProvider({
  bootstrap,
  children,
}: {
  bootstrap: Bootstrap | undefined;
  children: React.ReactNode;
}) {
  const qc = useQueryClient();
  const [client, setClient] = useState<PubSubClient | null>(null);
  const [online, setOnline] = useState<Set<string>>(new Set());
  const [connected, setConnected] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const enabled = bootstrap?.realtime === true;
  const meId = bootstrap?.me.id;

  // 연결 (Ably SDK는 필요할 때만 동적 로드)
  useEffect(() => {
    if (!enabled || !meId) return;
    let closed = false;
    let rt: PubSubClient | null = null;
    import('@ably/pubsub-device').then(({ createClient }) => {
      if (closed) return;
      rt = createClient({ authUrl: '/api/ably/token', clientId: meId });
      rt.connection.on((s) => setConnected(s.current === 'connected'));
      setClient(rt);
    });
    return () => {
      closed = true;
      rt?.close();
      setClient(null);
    };
  }, [enabled, meId]);

  // 이벤트 처리: 해당 쿼리만 다시 불러온다
  const handler = useRef<(msg: AblyMessage) => void>(() => {});
  handler.current = (msg) => {
    const event = msg.data as RealtimeEvent;
    if (event.type === 'message') {
      qc.invalidateQueries({ queryKey: keys.messages(event.channelId) });
      qc.invalidateQueries({ queryKey: keys.thread(event.parentId ?? event.messageId) });
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(
      () => qc.invalidateQueries({ queryKey: keys.bootstrap }),
      BOOTSTRAP_DEBOUNCE_MS,
    );
  };

  // 구독 대상: 참여한 공개 채널 + 내 개인 채널(DM) + global
  const joinedIds = (bootstrap?.channels ?? [])
    .filter((c) => c.type === 'public' && c.joined)
    .map((c) => c.id)
    .sort()
    .join(',');

  useEffect(() => {
    if (!client || !meId) return;
    const names = [
      'global',
      `user:${meId}`,
      ...joinedIds.split(',').filter(Boolean).map((id) => `pub:${id}`),
    ];
    const listener = (m: AblyMessage) => handler.current(m);
    const channels = names.map((n) => client.channels.get(n));
    channels.forEach((ch) => ch.subscribe('event', listener));
    return () => channels.forEach((ch) => ch.unsubscribe('event', listener));
  }, [client, meId, joinedIds]);

  // 접속 상태 (presence)
  useEffect(() => {
    if (!client) return;
    const global = client.channels.get('global');
    const sync = async () => {
      const members = await global.presence.get();
      setOnline(new Set(members.map((m) => m.clientId)));
    };
    global.presence.subscribe(sync);
    global.presence.enter().then(sync).catch(() => {});
    return () => {
      global.presence.unsubscribe(sync);
      global.presence.leave().catch(() => {});
    };
  }, [client]);

  const sendTyping = useCallback(
    (channelId: string, name: string) => {
      client?.channels.get(`typing:${channelId}`).publish('typing', { name }).catch(() => {});
    },
    [client],
  );

  const onTyping = useCallback(
    (channelId: string, listener: TypingListener) => {
      if (!client) return () => {};
      const ch = client.channels.get(`typing:${channelId}`);
      const l = (m: AblyMessage) => {
        if (m.clientId && m.clientId !== meId) listener(m.clientId, (m.data as { name: string }).name);
      };
      ch.subscribe('typing', l);
      return () => {
        ch.unsubscribe('typing', l);
      };
    },
    [client, meId],
  );

  const value = useMemo(
    () => ({ online, connected, sendTyping, onTyping }),
    [online, connected, sendTyping, onTyping],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
