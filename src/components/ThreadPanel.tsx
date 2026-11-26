'use client';

import { useBootstrap, useThread } from './api';
import Composer from './Composer';
import MessageList from './MessageList';

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
  const { data } = useThread(parentId, boot?.realtime);

  return (
    <aside className="flex w-full min-w-0 flex-col border-l lg:w-[400px] lg:shrink-0">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="font-bold">스레드</h2>
        <button onClick={onClose} className="rounded px-2 text-xl hover:bg-neutral-100" aria-label="닫기">
          ×
        </button>
      </header>
      {data ? (
        <MessageList
          messages={data.replies}
          header={
            <div className="border-b pb-2">
              <MessageList messages={[data.parent]} />
              {data.replies.length > 0 && (
                <p className="px-5 pt-1 text-xs text-neutral-500">답글 {data.replies.length}개</p>
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
