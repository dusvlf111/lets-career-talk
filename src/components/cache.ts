'use client';

import type { QueryClient } from '@tanstack/react-query';

import { keys, type Message } from './api';

type Thread = { parent: Message; replies: Message[] };

const byTime = (a: Message, b: Message) => a.created_at - b.created_at;
const countedReplies = new Set<string>();

/** 메시지를 목록(또는 스레드)에 넣는다. 같은 id가 있으면 교체, tempId가 있으면 그 자리를 대체 */
export function upsertMessage(qc: QueryClient, message: Message, tempId?: string) {
  const replace = (list: Message[]) => {
    const rest = list.filter((m) => m.id !== message.id && m.id !== tempId);
    return [...rest, message].sort(byTime);
  };

  if (!message.parent_id) {
    qc.setQueryData<Message[]>(keys.messages(message.channel_id), (old) => (old ? replace(old) : old));
    return;
  }

  const parentId = message.parent_id;
  qc.setQueryData<Thread>(keys.thread(parentId), (old) =>
    old ? { ...old, replies: replace(old.replies) } : old,
  );
  // 같은 답글이 응답과 실시간 이벤트로 두 번 와도 답글 수는 한 번만 올린다
  if (countedReplies.has(message.id)) return;
  countedReplies.add(message.id);
  qc.setQueryData<Message[]>(keys.messages(message.channel_id), (old) =>
    old?.map((m) =>
      m.id === parentId
        ? { ...m, reply_count: m.reply_count + 1, last_reply_at: message.created_at }
        : m,
    ),
  );
}

export function removeMessage(qc: QueryClient, message: Pick<Message, 'id' | 'channel_id' | 'parent_id'>) {
  if (!message.parent_id) {
    qc.setQueryData<Message[]>(keys.messages(message.channel_id), (old) => old?.filter((m) => m.id !== message.id));
    return;
  }
  qc.setQueryData<Thread>(keys.thread(message.parent_id), (old) =>
    old ? { ...old, replies: old.replies.filter((m) => m.id !== message.id) } : old,
  );
  qc.setQueryData<Message[]>(keys.messages(message.channel_id), (old) =>
    old?.map((m) => (m.id === message.parent_id ? { ...m, reply_count: Math.max(0, m.reply_count - 1) } : m)),
  );
}

/** 리액션 한 건을 반영. mine은 내가 누른 경우에만 바뀐다 */
export function applyReaction(msg: Message, emoji: string, added: boolean, isMe: boolean): Message {
  const existing = msg.reactions.find((r) => r.emoji === emoji);
  if (!existing) {
    if (!added) return msg;
    return { ...msg, reactions: [...msg.reactions, { emoji, count: 1, mine: isMe }] };
  }
  if (isMe && existing.mine === added) return msg; // 이미 반영됨 (낙관적 업데이트)
  const count = existing.count + (added ? 1 : -1);
  return {
    ...msg,
    reactions: msg.reactions
      .map((r) => (r.emoji === emoji ? { ...r, count, mine: isMe ? added : r.mine } : r))
      .filter((r) => r.count > 0),
  };
}

export function updateMessageEverywhere(
  qc: QueryClient,
  target: { channelId: string; messageId: string; parentId: string | null },
  fn: (m: Message) => Message,
) {
  const apply = (m: Message) => (m.id === target.messageId ? fn(m) : m);
  qc.setQueryData<Message[]>(keys.messages(target.channelId), (old) => old?.map(apply));
  qc.setQueryData<Thread>(keys.thread(target.parentId ?? target.messageId), (old) =>
    old ? { parent: apply(old.parent), replies: old.replies.map(apply) } : old,
  );
}
