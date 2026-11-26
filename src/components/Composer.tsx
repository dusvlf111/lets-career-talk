'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import { api, keys, useBootstrap, type Message } from './api';
import { useRealtime } from './Realtime';

const TYPING_THROTTLE_MS = 2_000;
const MENTION_SUGGEST_LIMIT = 6;

export default function Composer({
  channelId,
  parentId = null,
  placeholder,
}: {
  channelId: string;
  parentId?: string | null;
  placeholder: string;
}) {
  const qc = useQueryClient();
  const { data } = useBootstrap();
  const { sendTyping } = useRealtime();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [cursor, setCursor] = useState(0);
  const lastTyping = useRef(0);
  const ref = useRef<HTMLTextAreaElement>(null);

  const mentionQuery = /@([a-zA-Z0-9_]*)$/.exec(text.slice(0, cursor))?.[1];
  const suggestions =
    mentionQuery === undefined
      ? []
      : (data?.users ?? [])
          .filter(
            (u) =>
              u.username.toLowerCase().startsWith(mentionQuery.toLowerCase()) ||
              u.display_name.includes(mentionQuery),
          )
          .slice(0, MENTION_SUGGEST_LIMIT);

  const insertMention = (username: string) => {
    const before = text.slice(0, cursor).replace(/@([a-zA-Z0-9_]*)$/, `@${username} `);
    const next = before + text.slice(cursor);
    setText(next);
    setCursor(before.length);
    requestAnimationFrame(() => {
      ref.current?.focus();
      ref.current?.setSelectionRange(before.length, before.length);
    });
  };

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const created = await api<Message>(`/api/channels/${channelId}/messages`, {
        method: 'POST',
        body: { body, parentId },
      });
      setText('');
      // 내 메시지는 즉시 캐시에 반영 (실시간 이벤트를 기다리지 않음)
      if (parentId) {
        qc.invalidateQueries({ queryKey: keys.thread(parentId) });
        qc.invalidateQueries({ queryKey: keys.messages(channelId) });
      } else {
        qc.setQueryData<Message[]>(keys.messages(channelId), (old) =>
          old && !old.some((m) => m.id === created.id) ? [...old, created] : old,
        );
      }
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSending(false);
      ref.current?.focus();
    }
  };

  const onChange = (value: string, pos: number) => {
    setText(value);
    setCursor(pos);
    const now = Date.now();
    if (data && value && now - lastTyping.current > TYPING_THROTTLE_MS) {
      lastTyping.current = now;
      sendTyping(channelId, data.me.display_name);
    }
  };

  return (
    <div className="relative px-5 pb-4">
      {suggestions.length > 0 && (
        <ul className="absolute bottom-full left-5 mb-1 w-64 overflow-hidden rounded-md border bg-white shadow-lg">
          {suggestions.map((u) => (
            <li key={u.id}>
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertMention(u.username);
                }}
                className="flex w-full gap-2 px-3 py-1.5 text-left text-sm hover:bg-[#1264a3] hover:text-white"
              >
                <span className="font-semibold">{u.display_name}</span>
                <span className="opacity-60">@{u.username}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="rounded-lg border border-neutral-300 focus-within:border-neutral-500 focus-within:shadow">
        <textarea
          ref={ref}
          value={text}
          rows={Math.min(8, Math.max(1, text.split('\n').length))}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value, e.target.selectionStart)}
          onSelect={(e) => setCursor(e.currentTarget.selectionStart)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              if (suggestions.length > 0) insertMention(suggestions[0].username);
              else send();
            }
          }}
          className="block w-full resize-none rounded-t-lg px-3 pt-2.5 text-[15px] outline-none"
        />
        <div className="flex items-center justify-between px-2 pb-1.5 text-xs text-neutral-400">
          <span>Enter 전송 · Shift+Enter 줄바꿈 · @로 멘션</span>
          <button
            onClick={send}
            disabled={!text.trim() || sending}
            className="rounded bg-[#007a5a] px-3 py-1 text-sm font-semibold text-white disabled:bg-neutral-200 disabled:text-neutral-400"
          >
            전송
          </button>
        </div>
      </div>
    </div>
  );
}
