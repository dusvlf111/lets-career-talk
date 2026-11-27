'use client';

import { ChevronLeft, X } from 'lucide-react';
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
      <header className="box-content flex h-14 shrink-0 items-center justify-between gap-1 border-b border-neutral-80 px-3 pt-[env(safe-area-inset-top)] md:h-16 md:px-4">
        <button
          onClick={onClose}
          aria-label="뒤로"
          className="-ml-2 flex size-10 items-center justify-center rounded-xs text-neutral-20 hover:bg-neutral-95 md:hidden"
        >
          <ChevronLeft className="size-6" />
        </button>
        <h2 className="flex-1 text-xsmall16 font-bold text-neutral-0">스레드</h2>
        <button onClick={onClose} className="hidden size-9 items-center justify-center rounded-xs text-neutral-40 hover:bg-neutral-95 hover:text-neutral-0 md:flex" aria-label="닫기">
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
