'use client';

import { useEffect, useState } from 'react';

import { useRealtime } from './Realtime';

const TYPING_EXPIRE_MS = 4_000;

export default function TypingIndicator({ channelId }: { channelId: string }) {
  const { onTyping } = useRealtime();
  const [typers, setTypers] = useState<Record<string, { name: string; at: number }>>({});

  useEffect(() => {
    setTypers({});
    return onTyping(channelId, (uid, name) =>
      setTypers((t) => ({ ...t, [uid]: { name, at: Date.now() } })),
    );
  }, [channelId, onTyping]);

  useEffect(() => {
    if (Object.keys(typers).length === 0) return;
    const id = setInterval(() => {
      const now = Date.now();
      setTypers((t) => Object.fromEntries(Object.entries(t).filter(([, v]) => now - v.at < TYPING_EXPIRE_MS)));
    }, 1_000);
    return () => clearInterval(id);
  }, [typers]);

  const names = Object.values(typers).map((t) => t.name);
  return (
    <div className="h-5 px-5 text-xs text-neutral-500">
      {names.length > 0 && `${names.slice(0, 3).join(', ')}님이 입력 중…`}
    </div>
  );
}
