'use client';

import { Copy, MessageSquareText, Pencil, SmilePlus, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import { api, keys, type Member, type Message } from './api';
import Attachments from './Attachments';
import { applyReaction, updateMessageEverywhere } from './cache';
import { Avatar, formatTime, MessageBody } from './format';
import { toDisplayText, toStoredText } from './mentions';
import BottomSheet, { SheetAction } from './ui/BottomSheet';
import Button from './ui/Button';
import { confirm } from './ui/confirm';
import { toast } from './ui/toast';

const LONG_PRESS_MS = 450;
const LONG_PRESS_MOVE_TOLERANCE_PX = 10;

export const QUICK_EMOJIS = ['👍', '❤️', '😂', '🎉', '🙏', '👀', '✅', '🔥'];

export default function MessageItem({
  message: m,
  compact,
  meId,
  users,
  isAdmin,
  onOpenThread,
}: {
  message: Message;
  compact: boolean;
  meId: string;
  users: Member[];
  isAdmin: boolean;
  onOpenThread?: () => void;
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [picker, setPicker] = useState(false);
  const [sheet, setSheet] = useState(false);
  // 모바일: 메시지를 길게 누르면 하단 시트 (터치 기기에는 hover 툴바가 없으므로)
  const press = useRef<{ timer: ReturnType<typeof setTimeout>; x: number; y: number } | null>(null);
  const cancelPress = () => {
    if (press.current) clearTimeout(press.current.timer);
    press.current = null;
  };
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
    const next = toStoredText(draft, users);
    if (!draft.trim() || next === m.body) return setEditing(false);
    await api(`/api/messages/${m.id}`, { method: 'PATCH', body: { body: next } }).catch((e) => toast.error(e.message));
    setEditing(false);
    refresh();
  };

  const remove = async () => {
    const ok = await confirm({ title: '메시지를 삭제할까요?', description: '삭제한 메시지는 되돌릴 수 없어요.', confirmLabel: '삭제', variant: 'destructive' });
    if (!ok) return;
    await api(`/api/messages/${m.id}`, { method: 'DELETE' }).catch((e) => toast.error(e.message));
    refresh();
  };

  const canAct = !deleted && !editing && !pending;
  const startEdit = () => {
    setDraft(toDisplayText(m.body, users));
    setEditing(true);
  };
  const sheetDo = (fn: () => void) => () => {
    setSheet(false);
    fn();
  };

  return (
    <div
      onPointerDown={(e) => {
        if (e.pointerType !== 'touch' || !canAct) return;
        const { clientX: x, clientY: y } = e;
        press.current = {
          x,
          y,
          timer: setTimeout(() => {
            press.current = null;
            navigator.vibrate?.(10);
            setSheet(true);
          }, LONG_PRESS_MS),
        };
      }}
      onPointerMove={(e) => {
        const p = press.current;
        if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > LONG_PRESS_MOVE_TOLERANCE_PX) cancelPress();
      }}
      onPointerUp={cancelPress}
      onPointerCancel={cancelPress}
      onContextMenu={(e) => {
        if (canAct && window.matchMedia('(pointer: coarse)').matches) e.preventDefault();
      }}
      className={`group relative flex gap-3 px-4 select-none [-webkit-touch-callout:none] hover:bg-neutral-100 md:px-5 md:select-text ${
        compact ? 'py-0.5' : 'pt-3 pb-1'
      } ${pending ? 'opacity-50' : ''} ${sheet ? 'bg-neutral-95' : ''}`}
    >
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
            <MessageBody text={m.body} meId={meId} users={users} />
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
          {isMine && <ToolButton label="수정" onClick={startEdit}><Pencil className="size-4" /></ToolButton>}
          {(isMine || isAdmin) && <ToolButton label="삭제" onClick={remove}><Trash2 className="size-4" /></ToolButton>}
        </div>
      )}
      <BottomSheet open={sheet} onOpenChange={setSheet} title="메시지 메뉴">
        <div className="flex justify-between px-4 pt-2 pb-3">
          {QUICK_EMOJIS.slice(0, 6).map((e) => (
            <button
              key={e}
              onClick={sheetDo(() => react(e))}
              className="flex size-12 items-center justify-center rounded-full bg-neutral-95 text-2xl active:bg-neutral-85"
            >
              {e}
            </button>
          ))}
        </div>
        <div className="border-t border-neutral-85 pt-1">
          {onOpenThread && (
            <SheetAction icon={<MessageSquareText className="size-5" />} label="스레드에 답글" onClick={sheetDo(onOpenThread)} />
          )}
          <SheetAction
            icon={<Copy className="size-5" />}
            label="텍스트 복사"
            onClick={sheetDo(() => {
              navigator.clipboard
                ?.writeText(toDisplayText(m.body, users))
                .then(() => toast.success('복사했어요'))
                .catch(() => toast.error('복사하지 못했어요'));
            })}
          />
          {isMine && <SheetAction icon={<Pencil className="size-5" />} label="메시지 수정" onClick={sheetDo(startEdit)} />}
          {(isMine || isAdmin) && (
            <SheetAction icon={<Trash2 className="size-5" />} label="메시지 삭제" onClick={sheetDo(remove)} danger />
          )}
        </div>
      </BottomSheet>
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
