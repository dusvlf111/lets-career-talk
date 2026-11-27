'use client';

import { FileText, Paperclip, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useLayoutEffect, useRef, useState } from 'react';

import { api, keys, useBootstrap, type Member, type Message } from './api';
import { removeMessage, upsertMessage } from './cache';
import { Avatar } from './format';
import { matchesName, toDisplayText, toStoredText } from './mentions';
import { useRealtime } from './Realtime';
import { toast } from './ui/toast';
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
  const [cursor, setCursor] = useState(0);
  const lastTyping = useRef(0);
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const files = useUploads();
  const canSend = (text.trim().length > 0 || files.attachments.length > 0) && !files.busy;

  const mentionQuery = /(?:^|\s)@([^\s@]*)$/.exec(text.slice(0, cursor))?.[1];
  const [dismissedQuery, setDismissedQuery] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const suggestions =
    mentionQuery === undefined || mentionQuery === dismissedQuery
      ? []
      : (data?.users ?? [])
          .filter((u) => u.id !== data?.me.id && matchesName(u.display_name, mentionQuery))
          .slice(0, MENTION_SUGGEST_LIMIT);
  const activeIndex = Math.min(active, Math.max(0, suggestions.length - 1));
  // 한글 조합 중 Enter/Tab을 누르면 조합이 끝난 뒤에 고른다
  const pendingPick = useRef(false);
  const latest = useRef({ suggestions, activeIndex });
  latest.current = { suggestions, activeIndex };

  // 자동완성으로 고른 이름 → 사용자 id (동명이인 구분용)
  const picked = useRef(new Map<string, string>());

  const insertMention = (user: Member) => {
    picked.current.set(user.display_name, user.id);
    // state 대신 실제 입력창 값을 읽는다 (한글 조합 직후에도 최신 값)
    const el = ref.current;
    const value = el?.value ?? text;
    const pos = el?.selectionStart ?? cursor;
    const before = value.slice(0, pos).replace(/@([^\s@]*)$/, `@${user.display_name} `);
    const next = before + value.slice(pos);
    setText(next);
    setCursor(before.length);
    setActive(0);
    pendingCaret.current = before.length;
  };

  // 값이 화면에 반영된 직후(그리기 전)에 커서를 옮긴다. 한 프레임 늦게 옮기면 그사이 입력한 글자 앞으로 커서가 튄다
  const pendingCaret = useRef<number | null>(null);
  useLayoutEffect(() => {
    const pos = pendingCaret.current;
    if (pos === null || !ref.current) return;
    pendingCaret.current = null;
    ref.current.focus();
    ref.current.setSelectionRange(pos, pos);
  });

  const send = async () => {
    if (!canSend || !data) return;
    const body = toStoredText(text.trim(), data.users, picked.current);
    picked.current = new Map();
    const attachments = files.attachments;
    // 보내는 즉시 화면에 표시하고 (전송 중 표시), 서버 응답이 오면 진짜 메시지로 교체
    const temp: Message = {
      id: `temp-${crypto.randomUUID()}`,
      channel_id: channelId,
      user_id: data.me.id,
      parent_id: parentId,
      body,
      created_at: Date.now(),
      edited_at: null,
      deleted_at: null,
      display_name: data.me.display_name,
      reply_count: 0,
      last_reply_at: null,
      reactions: [],
      attachments: attachments.map((a, i) => ({ ...a, id: `temp-${i}` })),
    };
    if (parentId) {
      qc.setQueryData<{ parent: Message; replies: Message[] }>(keys.thread(parentId), (old) =>
        old ? { ...old, replies: [...old.replies, temp] } : old,
      );
    } else {
      qc.setQueryData<Message[]>(keys.messages(channelId), (old) => (old ? [...old, temp] : old));
    }
    setText('');
    files.clear();
    ref.current?.focus();

    try {
      const created = await api<Message>(`/api/channels/${channelId}/messages`, {
        method: 'POST',
        body: { body, parentId, attachments },
      });
      upsertMessage(qc, created, temp.id);
    } catch (e) {
      removeMessage(qc, temp);
      setText((current) => current || toDisplayText(body, data.users));
      toast.error((e as Error).message);
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
        <ul
          role="listbox"
          className="absolute bottom-full left-5 mb-1 w-64 overflow-hidden rounded-sm border border-neutral-80 bg-white py-1 shadow-04"
        >
          {suggestions.map((u, i) => (
            <li key={u.id} role="option" aria-selected={i === activeIndex}>
              <button
                type="button"
                // 입력창 포커스를 잃지 않게 막고, 클릭/탭은 onClick에서 처리
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insertMention(u)}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xsmall14 ${
                  i === activeIndex ? 'bg-primary-10 text-primary' : 'text-neutral-10'
                }`}
              >
                <Avatar name={u.display_name} id={u.id} size={20} />
                <span className="flex-1 truncate font-semibold">{u.display_name}</span>
                {i === activeIndex && <span className="text-xxsmall12 text-neutral-45">Tab</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div
        className={`rounded-md border bg-white transition-shadow focus-within:border-neutral-60 focus-within:shadow-02 ${
          dragging ? 'border-primary bg-primary-5' : 'border-neutral-75'
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
          onCompositionEnd={() => {
            if (!pendingPick.current) return;
            pendingPick.current = false;
            // 조합 완료 값이 반영된 다음 프레임에 고른다
            requestAnimationFrame(() => {
              const { suggestions: list, activeIndex: idx } = latest.current;
              if (list[idx]) insertMention(list[idx]);
            });
          }}
          onKeyDown={(e) => {
            const composing = e.nativeEvent.isComposing || e.keyCode === 229;
            if (suggestions.length > 0) {
              if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                const step = e.key === 'ArrowDown' ? 1 : -1;
                setActive((activeIndex + step + suggestions.length) % suggestions.length);
                return;
              }
              if (e.key === 'Escape') {
                e.preventDefault();
                setDismissedQuery(mentionQuery ?? null);
                return;
              }
              if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
                e.preventDefault();
                if (composing) pendingPick.current = true;
                else insertMention(suggestions[activeIndex]);
                return;
              }
            }
            if (e.key === 'Enter' && !e.shiftKey && !composing) {
              e.preventDefault();
              send();
            }
          }}
          className="block w-full resize-none rounded-t-md bg-transparent px-3.5 pt-3 text-[15px] outline-none placeholder:text-neutral-50"
        />
        <div className="flex items-center justify-between gap-2 px-2 pb-2 text-xxsmall12 text-neutral-50">
          <button
            onClick={() => fileInput.current?.click()}
            title="파일 첨부"
            aria-label="파일 첨부"
            className="flex size-8 shrink-0 items-center justify-center rounded-xs text-neutral-40 hover:bg-neutral-95 hover:text-primary"
          >
            <Paperclip className="size-4" />
          </button>
          <span className="hidden flex-1 truncate sm:block">Enter 전송 · Shift+Enter 줄바꿈 · @멘션 · 파일 끌어다 놓기</span>
          <span className="flex-1 sm:hidden" />
          <button
            onClick={send}
            disabled={!canSend}
            className="flex h-8 items-center gap-1 rounded-xs bg-primary px-3 text-xsmall14 font-medium text-white hover:bg-primary-hover disabled:bg-neutral-80 disabled:text-neutral-50"
          >
            전송
          </button>
        </div>
      </div>
    </div>
  );
}
