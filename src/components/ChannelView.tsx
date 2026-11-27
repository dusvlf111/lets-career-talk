'use client';

import { ChevronLeft, Hash, LogOut, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { api, channelLabel, keys, useBootstrap, useMessages } from './api';
import Composer from './Composer';
import MessageList from './MessageList';
import ThreadPanel from './ThreadPanel';
import TypingIndicator from './TypingIndicator';
import { Avatar } from './format';
import EditTopicModal from './modal/EditTopicModal';
import { useRealtime } from './Realtime';
import { confirm } from './ui/confirm';
import { toast } from './ui/toast';
import { useUi } from './Workspace';

const ANNOUNCEMENT_CHANNEL_ID = 'general';

export default function ChannelView({ channelId }: { channelId: string }) {
  const { data: boot } = useBootstrap();
  const { connected } = useRealtime();
  // 실시간 연결이 끊겨 있으면 폴링으로 대체
  const { data: messages, error } = useMessages(channelId, boot && boot.realtime && connected);
  const { threadId, openThread } = useUi();
  const qc = useQueryClient();
  const router = useRouter();
  const channel = boot?.channels.find((c) => c.id === channelId);
  const [topicOpen, setTopicOpen] = useState(false);

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
    return <div className="flex flex-1 items-center justify-center text-xsmall14 text-neutral-40">{error.message}</div>;
  }

  const title = channel ? channelLabel(channel) : '';
  const isPublic = channel?.type === 'public';

  const leave = async () => {
    const ok = await confirm({ title: `#${title} 채널에서 나갈까요?`, description: '언제든 다시 참여할 수 있어요.', confirmLabel: '나가기' });
    if (!ok) return;
    try {
      await api(`/api/channels/${channelId}/leave`, { method: 'POST' });
      await qc.invalidateQueries({ queryKey: keys.bootstrap });
      router.push('/c');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const remove = async () => {
    const ok = await confirm({
      title: `#${title} 채널을 삭제할까요?`,
      description: '채널의 모든 메시지와 파일이 삭제되고 되돌릴 수 없어요.',
      confirmLabel: '삭제',
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      await api(`/api/channels/${channelId}`, { method: 'DELETE' });
      await qc.invalidateQueries({ queryKey: keys.bootstrap });
      router.push('/c');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <>
      <section className={`min-w-0 flex-1 flex-col ${threadId ? 'hidden lg:flex' : 'flex'}`}>
        <header className="flex h-14 shrink-0 items-center gap-1 border-b border-neutral-80 px-3 pt-[env(safe-area-inset-top)] box-content md:h-16 md:gap-2 md:px-5">
          <Link
            href="/c"
            className="-ml-2 flex size-10 items-center justify-center rounded-xs text-neutral-20 hover:bg-neutral-95 md:hidden"
            aria-label="뒤로"
          >
            <ChevronLeft className="size-6" />
          </Link>
          <div className="min-w-0 flex-1">
            <h2 className="flex items-center gap-1 truncate text-xsmall16 font-bold text-neutral-0">
              {isPublic && <Hash className="size-4 shrink-0 text-neutral-40" />}
              {title}
            </h2>
            {isPublic && (
              <button
                onClick={() => setTopicOpen(true)}
                className="group flex max-w-full items-center gap-1 truncate text-left text-xxsmall12 text-neutral-40 hover:text-primary"
              >
                <span className="truncate">{channel?.topic || '채널 설명 추가'}</span>
                <Pencil className="size-3 shrink-0 opacity-0 group-hover:opacity-100" />
              </button>
            )}
          </div>
          {isPublic && channelId !== ANNOUNCEMENT_CHANNEL_ID && (
            <div className="flex items-center gap-1">
              <IconButton label="채널 나가기" onClick={leave}>
                <LogOut className="size-4" />
              </IconButton>
              {boot?.me.is_admin && (
                <IconButton label="채널 삭제" onClick={remove} danger>
                  <Trash2 className="size-4" />
                </IconButton>
              )}
            </div>
          )}
        </header>
        {isPublic && channel && (
          <EditTopicModal
            key={String(topicOpen)}
            channelId={channelId}
            channelName={title}
            initialTopic={channel.topic}
            open={topicOpen}
            onOpenChange={setTopicOpen}
          />
        )}

        {messages ? (
          <MessageList
            messages={messages}
            onOpenThread={openThread}
            header={
              <div className="px-5 pt-10 pb-4">
                {isPublic ? (
                  <div className="mb-3 flex size-12 items-center justify-center rounded-md bg-primary-10 text-primary">
                    <Hash className="size-6" />
                  </div>
                ) : (
                  <div className="mb-3">
                    <Avatar name={title} id={channel?.dm_user_id ?? channelId} size={56} />
                  </div>
                )}
                <h3 className="text-medium22 font-bold text-neutral-0">{isPublic ? `#${title}` : `${title}님과의 대화`}</h3>
                <p className="mt-1 text-xsmall14 text-neutral-40">
                  {isPublic ? channel?.topic || '대화를 시작해보세요.' : '두 사람만 볼 수 있는 대화예요.'}
                </p>
              </div>
            }
          />
        ) : (
          <div className="flex-1" />
        )}
        <TypingIndicator channelId={channelId} />
        {channelId === ANNOUNCEMENT_CHANNEL_ID && !boot?.me.is_admin && boot?.settings.announcement_admin_only ? (
          <p className="mx-5 mb-4 rounded-md bg-neutral-95 px-4 py-3 text-xsmall14 text-neutral-40">
            공지 채널에는 운영진만 글을 쓸 수 있어요. 공지 메시지의 스레드에서 답글을 남길 수 있어요.
          </p>
        ) : (
          <Composer channelId={channelId} placeholder={isPublic ? `#${title}에 메시지 보내기` : `${title}님에게 메시지 보내기`} />
        )}
      </section>
      {threadId && <ThreadPanel channelId={channelId} parentId={threadId} onClose={() => openThread(null)} />}
    </>
  );
}

function IconButton({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`flex size-9 items-center justify-center rounded-xs text-neutral-40 hover:bg-neutral-95 ${
        danger ? 'hover:text-system-error' : 'hover:text-neutral-0'
      }`}
    >
      {children}
    </button>
  );
}
