'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { api, keys, type Message } from './api';
import { Avatar, formatTime, MessageBody } from './format';

export const QUICK_EMOJIS = ['👍', '❤️', '😂', '🎉', '🙏', '👀', '✅', '🔥'];

export default function MessageItem({
  message: m,
  compact,
  meId,
  myUsername,
  isAdmin,
  onOpenThread,
}: {
  message: Message;
  compact: boolean;
  meId: string;
  myUsername: string;
  isAdmin: boolean;
  onOpenThread?: () => void;
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(m.body);
  const [picker, setPicker] = useState(false);
  const isMine = m.user_id === meId;
  const deleted = Boolean(m.deleted_at);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: keys.messages(m.channel_id) });
    qc.invalidateQueries({ queryKey: keys.thread(m.parent_id ?? m.id) });
  };

  const react = async (emoji: string) => {
    setPicker(false);
    await api(`/api/messages/${m.id}/reactions`, { method: 'POST', body: { emoji } }).catch((e) => alert(e.message));
    refresh();
  };

  const save = async () => {
    if (!draft.trim() || draft === m.body) return setEditing(false);
    await api(`/api/messages/${m.id}`, { method: 'PATCH', body: { body: draft } }).catch((e) => alert(e.message));
    setEditing(false);
    refresh();
  };

  const remove = async () => {
    if (!confirm('메시지를 삭제할까요?')) return;
    await api(`/api/messages/${m.id}`, { method: 'DELETE' }).catch((e) => alert(e.message));
    refresh();
  };

  return (
    <div className={`group relative flex gap-2 px-5 hover:bg-neutral-50 ${compact ? 'py-0.5' : 'pt-2 pb-0.5'}`}>
      <div className="w-9 shrink-0">
        {compact ? (
          <span className="invisible block pt-1 text-right text-[11px] text-neutral-400 group-hover:visible">
            {formatTime(m.created_at)}
          </span>
        ) : (
          <Avatar name={m.display_name} id={m.user_id} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        {!compact && (
          <div className="flex items-baseline gap-2">
            <span className="font-bold">{m.display_name}</span>
            <span className="text-xs text-neutral-500">{formatTime(m.created_at)}</span>
          </div>
        )}

        {deleted ? (
          <p className="text-sm italic text-neutral-400">삭제된 메시지입니다.</p>
        ) : editing ? (
          <div className="space-y-1 py-1">
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  save();
                }
                if (e.key === 'Escape') setEditing(false);
              }}
              className="w-full rounded-md border border-neutral-300 p-2 text-[15px] outline-none focus:border-[#1264a3]"
              rows={2}
            />
            <div className="flex gap-2 text-sm">
              <button onClick={() => setEditing(false)} className="rounded border px-3 py-1">취소</button>
              <button onClick={save} className="rounded bg-[#007a5a] px-3 py-1 text-white">저장</button>
            </div>
          </div>
        ) : (
          <div className="break-words text-[15px] leading-relaxed whitespace-pre-wrap">
            <MessageBody text={m.body} myUsername={myUsername} />
            {m.edited_at && <span className="ml-1 text-xs text-neutral-400">(편집됨)</span>}
          </div>
        )}

        {m.reactions.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {m.reactions.map((r) => (
              <button
                key={r.emoji}
                onClick={() => react(r.emoji)}
                className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${
                  r.mine ? 'border-[#1264a3] bg-[#e8f5fa] text-[#1264a3]' : 'border-neutral-200 bg-neutral-50'
                }`}
              >
                <span className="text-sm">{r.emoji}</span>
                {r.count}
              </button>
            ))}
          </div>
        )}

        {onOpenThread && m.reply_count > 0 && (
          <button onClick={onOpenThread} className="mt-1 text-sm font-semibold text-[#1264a3] hover:underline">
            답글 {m.reply_count}개
            {m.last_reply_at && (
              <span className="ml-2 font-normal text-neutral-500">마지막 답글 {formatTime(m.last_reply_at)}</span>
            )}
          </button>
        )}
      </div>

      {!deleted && !editing && (
        <div className="absolute -top-3 right-4 hidden items-center rounded-md border bg-white shadow-sm group-hover:flex">
          <ToolButton label="리액션" onClick={() => setPicker((v) => !v)}>😀</ToolButton>
          {onOpenThread && <ToolButton label="스레드에 답글" onClick={onOpenThread}>💬</ToolButton>}
          {isMine && <ToolButton label="수정" onClick={() => { setDraft(m.body); setEditing(true); }}>✏️</ToolButton>}
          {(isMine || isAdmin) && <ToolButton label="삭제" onClick={remove}>🗑️</ToolButton>}
        </div>
      )}
      {picker && (
        <div className="absolute top-6 right-4 z-10 flex gap-1 rounded-md border bg-white p-1 shadow-lg">
          {QUICK_EMOJIS.map((e) => (
            <button key={e} onClick={() => react(e)} className="rounded p-1 text-lg hover:bg-neutral-100">
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ToolButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button title={label} aria-label={label} onClick={onClick} className="px-2 py-1 text-sm hover:bg-neutral-100">
      {children}
    </button>
  );
}
