'use client';

import { Fragment, useEffect, useRef } from 'react';

import { useBootstrap, type Message } from './api';
import { formatDay, isSameDay } from './format';
import MessageItem from './MessageItem';

const GROUP_WINDOW_MS = 5 * 60 * 1000;
const STICK_TO_BOTTOM_PX = 120;

export default function MessageList({
  messages,
  onOpenThread,
  header,
}: {
  messages: Message[];
  onOpenThread?: (id: string) => void;
  header?: React.ReactNode;
}) {
  const { data } = useBootstrap();
  const scroller = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const lastId = messages.at(-1)?.id;

  // 새 메시지가 오면, 사용자가 맨 아래에 있을 때만 따라 내려간다
  useEffect(() => {
    const el = scroller.current;
    if (el && atBottom.current) el.scrollTop = el.scrollHeight;
  }, [lastId, messages.length]);

  if (!data) return null;

  return (
    <div
      ref={scroller}
      onScroll={(e) => {
        const el = e.currentTarget;
        atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_TO_BOTTOM_PX;
      }}
      className="flex-1 overflow-y-auto pb-2"
    >
      {header}
      {messages.map((m, i) => {
        const prev = messages[i - 1];
        const newDay = !prev || !isSameDay(prev.created_at, m.created_at);
        const compact =
          !newDay &&
          prev.user_id === m.user_id &&
          !prev.deleted_at &&
          m.created_at - prev.created_at < GROUP_WINDOW_MS;
        return (
          <Fragment key={m.id}>
            {newDay && (
              <div className="relative my-3 flex justify-center">
                <div className="absolute inset-x-0 top-1/2 border-t border-neutral-80" />
                <span className="relative rounded-full border bg-white px-3 py-0.5 text-xs font-semibold">
                  {formatDay(m.created_at)}
                </span>
              </div>
            )}
            <MessageItem
              message={m}
              compact={compact}
              meId={data.me.id}
              myUsername={data.me.username}
              isAdmin={data.me.is_admin}
              onOpenThread={onOpenThread ? () => onOpenThread(m.id) : undefined}
            />
          </Fragment>
        );
      })}
    </div>
  );
}
