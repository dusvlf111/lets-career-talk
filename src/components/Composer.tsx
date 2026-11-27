'use client';

import { FileText, Paperclip, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import { api, keys, useBootstrap, type Message } from './api';
import { useRealtime } from './Realtime';
import { formatBytes, useUploads } from './useUploads';

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
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const files = useUploads();
  const canSend = (text.trim().length > 0 || files.attachments.length > 0) && !files.busy && !sending;

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
    if (!canSend) return;
    setSending(true);
    try {
      const created = await api<Message>(`/api/channels/${channelId}/messages`, {
        method: 'POST',
        body: { body, parentId, attachments: files.attachments },
      });
      setText('');
      files.clear();
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
    <div
      className="relative px-5 pb-4"
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        if (e.dataTransfer.files.length === 0) return;
        e.preventDefault();
        setDragging(false);
        files.add([...e.dataTransfer.files]);
      }}
    >
      <input
        ref={fileInput}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          files.add([...(e.target.files ?? [])]);
          e.target.value = '';
        }}
      />
      {suggestions.length > 0 && (
        <ul className="absolute bottom-full left-5 mb-1 w-64 overflow-hidden rounded-md border bg-white shadow-lg">
          {suggestions.map((u) => (
            <li key={u.id}>
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertMention(u.username);
                }}
                className="flex w-full gap-2 px-3 py-1.5 text-left text-sm hover:bg-primary hover:text-white"
              >
                <span className="font-semibold">{u.display_name}</span>
                <span className="opacity-60">@{u.username}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div
        className={`rounded-md border bg-white focus-within:border-neutral-40 focus-within:shadow-03 ${
          dragging ? 'border-primary bg-primary-5' : 'border-neutral-70'
        }`}
      >
        {files.uploads.length > 0 && (
          <div className="flex flex-wrap gap-2 px-3 pt-3">
            {files.uploads.map((u) => (
              <div key={u.key} className="relative flex w-48 items-center gap-2 overflow-hidden rounded-sm border bg-neutral-95 p-1.5">
                {u.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={u.previewUrl} alt="" className="size-9 shrink-0 rounded-xxs object-cover" />
                ) : (
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xxs bg-primary-10 text-primary"><FileText className="size-5" /></span>
                )}
                <span className="min-w-0 flex-1 text-xs">
                  <span className="block truncate font-semibold">{u.name}</span>
                  <span className={u.error ? 'text-system-error' : 'text-neutral-40'}>
                    {u.error ?? (u.url ? formatBytes(u.size) : `업로드 중 ${Math.round(u.progress)}%`)}
                  </span>
                </span>
                <button
                  onClick={() => files.remove(u.key)}
                  aria-label="첨부 취소"
                  className="flex size-5 shrink-0 items-center justify-center rounded-full bg-neutral-0/70 text-xs text-white"
                >
                  <X className="size-3" />
                </button>
                {!u.url && !u.error && (
                  <span className="absolute bottom-0 left-0 h-0.5 bg-primary" style={{ width: `${u.progress}%` }} />
                )}
              </div>
            ))}
          </div>
        )}
        <textarea
          ref={ref}
          value={text}
          rows={Math.min(8, Math.max(1, text.split('\n').length))}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value, e.target.selectionStart)}
          onSelect={(e) => setCursor(e.currentTarget.selectionStart)}
          onPaste={(e) => {
            const pasted = [...e.clipboardData.files];
            if (pasted.length === 0) return;
            e.preventDefault();
            files.add(pasted);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              if (suggestions.length > 0) insertMention(suggestions[0].username);
              else send();
            }
          }}
          className="block w-full resize-none rounded-t-md bg-transparent px-3 pt-2.5 text-[15px] outline-none"
        />
        <div className="flex items-center justify-between gap-2 px-2 pb-1.5 text-xs text-neutral-50">
          <button
            onClick={() => fileInput.current?.click()}
            title="파일 첨부"
            aria-label="파일 첨부"
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-neutral-90 text-base text-neutral-30 hover:bg-primary-10 hover:text-primary"
          >
            <Paperclip className="size-4" />
          </button>
          <span className="flex-1 truncate">Enter 전송 · Shift+Enter 줄바꿈 · @멘션 · 파일은 끌어다 놓거나 붙여넣기</span>
          <button
            onClick={send}
            disabled={!canSend}
            className="rounded-xs bg-primary px-3 py-1 text-sm font-semibold text-white hover:bg-primary-hover disabled:bg-neutral-80 disabled:text-neutral-50"
          >
            전송
          </button>
        </div>
      </div>
    </div>
  );
}
