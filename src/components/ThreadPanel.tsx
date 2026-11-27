'use client';

import { X } from 'lucide-react';
import { useBootstrap, useThread } from './api';
import Composer from './Composer';
import MessageList from './MessageList';
import { useRealtime } from './Realtime';

export default function ThreadPanel({
  channelId,
  parentId,
  onClose,
}: {
  channelId: string;
  parentId: string;
  onClose: () => void;
}) {
  const { data: boot } = useBootstrap();
  const { connected } = useRealtime();
  const { data } = useThread(parentId, boot && boot.realtime && connected);

  return (
    <aside className="flex w-full min-w-0 flex-col border-l border-neutral-80 lg:w-[400px] lg:shrink-0">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-neutral-80 px-4">
        <h2 className="text-xsmall16 font-bold text-neutral-0">스레드</h2>
        <button onClick={onClose} className="flex size-9 items-center justify-center rounded-xs text-neutral-40 hover:bg-neutral-95 hover:text-neutral-0" aria-label="닫기">
          <X className="size-5" />
        </button>
      </header>
      {data ? (
        <MessageList
          messages={data.replies}
          header={
            <div className="border-b border-neutral-80 pb-3">
              <MessageList messages={[data.parent]} />
              {data.replies.length > 0 && (
                <p className="px-5 pt-2 text-xxsmall12 font-semibold text-neutral-40">답글 {data.replies.length}개</p>
              )}
            </div>
          }
        />
      ) : (
        <div className="flex-1" />
      )}
      <Composer channelId={channelId} parentId={parentId} placeholder="답글 달기…" />
    </aside>
  );
}
