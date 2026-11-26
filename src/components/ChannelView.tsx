'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { api, channelLabel, keys, useBootstrap, useMessages } from './api';
import Composer from './Composer';
import MessageList from './MessageList';
import ThreadPanel from './ThreadPanel';
import TypingIndicator from './TypingIndicator';
import { useUi } from './Workspace';

const ANNOUNCEMENT_CHANNEL_ID = 'general';

export default function ChannelView({ channelId }: { channelId: string }) {
  const { data: boot } = useBootstrap();
  const { data: messages, error } = useMessages(channelId, boot?.realtime);
  const { threadId, openThread, setSidebarOpen } = useUi();
  const qc = useQueryClient();
  const router = useRouter();
  const channel = boot?.channels.find((c) => c.id === channelId);

  // 채널을 열면 스레드는 닫는다
  useEffect(() => openThread(null), [channelId, openThread]);

  // 보고 있는 채널은 읽음 처리
  const lastId = messages?.at(-1)?.id;
  const isMember = channel?.joined;
  useEffect(() => {
    if (!isMember) return;
    api(`/api/channels/${channelId}/read`, { method: 'POST' })
      .then(() => qc.invalidateQueries({ queryKey: keys.bootstrap }))
      .catch(() => {});
  }, [channelId, lastId, isMember, qc]);

  if (error) {
    return <div className="flex flex-1 items-center justify-center text-sm text-neutral-500">{error.message}</div>;
  }

  const title = channel ? channelLabel(channel) : '';
  const isPublic = channel?.type === 'public';

  const editTopic = async () => {
    const topic = window.prompt('채널 설명', channel?.topic ?? '');
    if (topic === null) return;
    await api(`/api/channels/${channelId}`, { method: 'PATCH', body: { topic } }).catch((e) => alert(e.message));
    qc.invalidateQueries({ queryKey: keys.bootstrap });
  };

  const leave = async () => {
    if (!confirm(`#${title} 채널에서 나갈까요?`)) return;
    await api(`/api/channels/${channelId}/leave`, { method: 'POST' }).catch((e) => alert(e.message));
    await qc.invalidateQueries({ queryKey: keys.bootstrap });
    router.push('/c/general');
  };

  const remove = async () => {
    if (!confirm(`#${title} 채널과 모든 메시지를 삭제할까요?`)) return;
    await api(`/api/channels/${channelId}`, { method: 'DELETE' }).catch((e) => alert(e.message));
    await qc.invalidateQueries({ queryKey: keys.bootstrap });
    router.push('/c/general');
  };

  return (
    <>
      <section className={`min-w-0 flex-1 flex-col ${threadId ? 'hidden lg:flex' : 'flex'}`}>
        <header className="flex items-center gap-2 border-b px-4 py-2.5">
          <button onClick={() => setSidebarOpen(true)} className="rounded p-1 text-xl md:hidden" aria-label="메뉴">
            ☰
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-bold">{isPublic ? `# ${title}` : title}</h2>
            {isPublic && (
              <button onClick={editTopic} className="block max-w-full truncate text-left text-xs text-neutral-500 hover:underline">
                {channel?.topic || '채널 설명 추가'}
              </button>
            )}
          </div>
          {isPublic && channelId !== 'general' && (
            <div className="flex gap-1 text-xs">
              <button onClick={leave} className="rounded border px-2 py-1 hover:bg-neutral-50">나가기</button>
              {boot?.me.is_admin && (
                <button onClick={remove} className="rounded border border-red-200 px-2 py-1 text-red-600 hover:bg-red-50">
                  삭제
                </button>
              )}
            </div>
          )}
        </header>

        {messages ? (
          <MessageList
            messages={messages}
            onOpenThread={openThread}
            header={
              <div className="px-5 pt-8 pb-4">
                <h3 className="text-2xl font-bold">{isPublic ? `# ${title}` : `${title}님과의 대화`}</h3>
                <p className="text-sm text-neutral-500">
                  {isPublic ? channel?.topic || '대화를 시작해보세요.' : '두 사람만 볼 수 있는 대화예요.'}
                </p>
              </div>
            }
          />
        ) : (
          <div className="flex-1" />
        )}
        <TypingIndicator channelId={channelId} />
        {channelId === ANNOUNCEMENT_CHANNEL_ID && !boot?.me.is_admin ? (
          <p className="mx-5 mb-4 rounded-lg bg-neutral-100 px-4 py-3 text-sm text-neutral-500">
            공지 채널에는 운영진만 글을 쓸 수 있어요. 공지에 💬 스레드로 답글을 남길 수 있어요.
          </p>
        ) : (
          <Composer channelId={channelId} placeholder={isPublic ? `#${title}에 메시지 보내기` : `${title}님에게 메시지 보내기`} />
        )}
      </section>
      {threadId && <ThreadPanel channelId={channelId} parentId={threadId} onClose={() => openThread(null)} />}
    </>
  );
}
