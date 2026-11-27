'use client';

import { MessageSquareText, Pencil, SmilePlus, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { api, keys, type Message } from './api';
import Attachments from './Attachments';
import { applyReaction, updateMessageEverywhere } from './cache';
import { Avatar, formatTime, MessageBody } from './format';
import Button from './ui/Button';
import { confirm } from './ui/confirm';
import { toast } from './ui/toast';

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
  const pending = m.id.startsWith('temp-');

  const refresh = () => {
    qc.invalidateQueries({ queryKey: keys.messages(m.channel_id) });
    qc.invalidateQueries({ queryKey: keys.thread(m.parent_id ?? m.id) });
  };

  const react = async (emoji: string) => {
    setPicker(false);
    // 화면에는 바로 반영하고, 서버 요청은 뒤에서 처리 (실패하면 서버 값으로 되돌림)
    const added = !m.reactions.some((r) => r.emoji === emoji && r.mine);
    updateMessageEverywhere(qc, { channelId: m.channel_id, messageId: m.id, parentId: m.parent_id }, (msg) =>
      applyReaction(msg, emoji, added, true),
    );
    try {
      await api(`/api/messages/${m.id}/reactions`, { method: 'POST', body: { emoji } });
    } catch (e) {
      toast.error((e as Error).message);
      refresh();
    }
  };

  const save = async () => {
    if (!draft.trim() || draft === m.body) return setEditing(false);
    await api(`/api/messages/${m.id}`, { method: 'PATCH', body: { body: draft } }).catch((e) => toast.error(e.message));
    setEditing(false);
    refresh();
  };

  const remove = async () => {
    const ok = await confirm({ title: '메시지를 삭제할까요?', description: '삭제한 메시지는 되돌릴 수 없어요.', confirmLabel: '삭제', variant: 'destructive' });
    if (!ok) return;
    await api(`/api/messages/${m.id}`, { method: 'DELETE' }).catch((e) => toast.error(e.message));
    refresh();
  };

  return (
    <div className={`group relative flex gap-3 px-5 hover:bg-neutral-100 ${compact ? 'py-0.5' : 'pt-3 pb-1'} ${
        pending ? 'opacity-50' : ''
      }`}>
      <div className="w-9 shrink-0">
        {compact ? (
          <span className="invisible block pt-0.5 text-right text-xxsmall12 text-neutral-50 group-hover:visible">
            {formatTime(m.created_at)}
          </span>
        ) : (
          <Avatar name={m.display_name} id={m.user_id} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        {!compact && (
          <div className="flex items-baseline gap-2">
            <span className="text-xsmall14 font-semibold text-neutral-0">{m.display_name}</span>
            <span className="text-xxsmall12 text-neutral-45">{formatTime(m.created_at)}</span>
          </div>
        )}

        {deleted ? (
          <p className="text-xsmall14 text-neutral-50">삭제된 메시지입니다.</p>
        ) : editing ? (
          <div className="space-y-2 py-1">
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
              className="w-full resize-none rounded-md bg-neutral-95 p-3 text-xsmall14 outline-none ring-primary focus:ring-1"
              rows={2}
            />
            <div className="flex gap-2">
              <Button size="xs" variant="outlined" onClick={() => setEditing(false)}>취소</Button>
              <Button size="xs" onClick={save}>저장</Button>
            </div>
          </div>
        ) : (
          <div className="text-[15px] leading-relaxed break-words whitespace-pre-wrap text-neutral-10">
            <MessageBody text={m.body} myUsername={myUsername} />
            {m.edited_at && <span className="ml-1 text-xs text-neutral-50">(편집됨)</span>}
          </div>
        )}
        {!deleted && <Attachments files={m.attachments} />}

        {m.reactions.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {m.reactions.map((r) => (
              <button
                key={r.emoji}
                onClick={() => react(r.emoji)}
                className={`flex h-7 items-center gap-1 rounded-full border px-2 text-xxsmall12 font-semibold ${
                  r.mine
                    ? 'border-primary-40 bg-primary-10 text-primary'
                    : 'border-transparent bg-neutral-90 text-neutral-30 hover:border-neutral-70'
                }`}
              >
                <span className="text-sm">{r.emoji}</span>
                {r.count}
              </button>
            ))}
          </div>
        )}

        {onOpenThread && m.reply_count > 0 && (
          <button onClick={onOpenThread} className="mt-1.5 flex items-center rounded-xs px-1 -mx-1 text-xsmall14 font-semibold text-primary hover:bg-primary-5">
            답글 {m.reply_count}개
            {m.last_reply_at && (
              <span className="ml-2 text-xxsmall12 font-normal text-neutral-45">마지막 답글 {formatTime(m.last_reply_at)}</span>
            )}
          </button>
        )}
      </div>

      {!deleted && !editing && !pending && (
        <div className="absolute -top-4 right-5 hidden items-center rounded-sm border border-neutral-80 bg-white p-0.5 shadow-03 group-hover:flex">
          <ToolButton label="리액션" onClick={() => setPicker((v) => !v)}><SmilePlus className="size-4" /></ToolButton>
          {onOpenThread && <ToolButton label="스레드에 답글" onClick={onOpenThread}><MessageSquareText className="size-4" /></ToolButton>}
          {isMine && <ToolButton label="수정" onClick={() => { setDraft(m.body); setEditing(true); }}><Pencil className="size-4" /></ToolButton>}
          {(isMine || isAdmin) && <ToolButton label="삭제" onClick={remove}><Trash2 className="size-4" /></ToolButton>}
        </div>
      )}
      {picker && (
        <div className="absolute top-6 right-5 z-10 flex gap-0.5 rounded-sm border border-neutral-80 bg-white p-1 shadow-04">
          {QUICK_EMOJIS.map((e) => (
            <button key={e} onClick={() => react(e)} className="flex size-9 items-center justify-center rounded-xs text-xl hover:bg-neutral-95">
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
    <button title={label} aria-label={label} onClick={onClick} className="flex size-8 items-center justify-center rounded-xs text-neutral-40 hover:bg-neutral-95 hover:text-primary">
      {children}
    </button>
  );
}
