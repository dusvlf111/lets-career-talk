'use client';

import { useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Hash, LogOut, Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

import { logout } from '@/app/(auth)/actions';

import { api, channelLabel, keys, useBootstrap, type SidebarChannel } from './api';
import { Avatar } from './format';
import CreateChannelModal from './modal/CreateChannelModal';
import { useRealtime } from './Realtime';
import SearchDialog from './SearchDialog';
import { toast } from './ui/toast';
import { useUi } from './Workspace';

const COHORT = process.env.NEXT_PUBLIC_COHORT_NAME ?? '렛츠커리어';

export default function Sidebar() {
  const { data } = useBootstrap();
  const { online, connected } = useRealtime();
  const { sidebarOpen, setSidebarOpen } = useUi();
  const params = useParams<{ id?: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [searchOpen, setSearchOpen] = useState(false);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  if (!data) return null;

  const joined = data.channels.filter((c) => c.type === 'public' && c.joined);
  const notJoined = data.channels.filter((c) => c.type === 'public' && !c.joined);
  const dms = data.channels.filter((c) => c.type === 'dm');
  const dmUserIds = new Set(dms.map((d) => d.dm_user_id));
  const others = data.users.filter((u) => u.id !== data.me.id && !dmUserIds.has(u.id));
  const live = data.realtime && connected;

  const go = (id: string) => {
    setSidebarOpen(false);
    router.push(`/c/${id}`);
  };

  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const openDm = (userId: string) =>
    run(async () => {
      const { id } = await api<{ id: string }>('/api/dms', { method: 'POST', body: { userId } });
      await qc.invalidateQueries({ queryKey: keys.bootstrap });
      go(id);
    });

  const joinChannel = (id: string) =>
    run(async () => {
      await api(`/api/channels/${id}/join`, { method: 'POST' });
      await qc.invalidateQueries({ queryKey: keys.bootstrap });
      setBrowseOpen(false);
      go(id);
    });

  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col border-r border-neutral-80 bg-neutral-100 transition-transform md:static md:w-64 md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-2.5 px-4 pt-5 pb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-simple.svg" alt="" className="size-7" />
          <div className="min-w-0">
            <div className="truncate text-xsmall16 font-bold text-neutral-0">{COHORT}</div>
            <div className="text-xxsmall12 text-neutral-40">참여자 전용 톡방</div>
          </div>
        </div>

        <button
          onClick={() => setSearchOpen(true)}
          className="mx-3 flex items-center gap-2 rounded-md bg-white px-3 py-2 text-xsmall14 text-neutral-45 ring-1 ring-neutral-80 hover:ring-neutral-70"
        >
          <Search className="size-4" />
          메시지 검색
        </button>

        <nav className="mt-4 flex-1 space-y-5 overflow-y-auto pb-4">
          <Section title="채널" onAdd={() => setCreateOpen(true)} addLabel="채널 만들기">
            {joined.map((c) => (
              <ChannelLink
                key={c.id}
                c={c}
                active={params.id === c.id}
                onClick={() => setSidebarOpen(false)}
                icon={<Hash className="size-4" />}
              />
            ))}
            {notJoined.length > 0 && (
              <button
                onClick={() => setBrowseOpen((v) => !v)}
                className="mx-2 flex w-[calc(100%-1rem)] items-center gap-1.5 rounded-xs px-2 py-1.5 text-xsmall14 text-neutral-40 hover:bg-neutral-90"
              >
                {browseOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                다른 채널 둘러보기 ({notJoined.length})
              </button>
            )}
            {browseOpen &&
              notJoined.map((c) => (
                <button
                  key={c.id}
                  onClick={() => joinChannel(c.id)}
                  className="mx-2 flex w-[calc(100%-1rem)] items-center gap-2 rounded-xs py-1.5 pr-2 pl-7 text-left text-xsmall14 text-neutral-30 hover:bg-neutral-90"
                >
                  <span className="flex-1 truncate"># {c.name}</span>
                  <span className="rounded-xxs bg-primary-10 px-1.5 py-0.5 text-xxsmall12 font-semibold text-primary">
                    참여
                  </span>
                </button>
              ))}
          </Section>

          <Section title="다이렉트 메시지">
            {dms.map((c) => (
              <ChannelLink
                key={c.id}
                c={c}
                active={params.id === c.id}
                onClick={() => setSidebarOpen(false)}
                icon={
                  <PresenceAvatar
                    name={channelLabel(c)}
                    id={c.dm_user_id ?? data.me.id}
                    on={!c.dm_user_id || online.has(c.dm_user_id)}
                  />
                }
              />
            ))}
            {others.map((u) => (
              <button
                key={u.id}
                onClick={() => openDm(u.id)}
                className="mx-2 flex w-[calc(100%-1rem)] items-center gap-2 rounded-xs px-2 py-1.5 text-left text-xsmall14 text-neutral-40 hover:bg-neutral-90 hover:text-neutral-10"
              >
                <PresenceAvatar name={u.display_name} id={u.id} on={online.has(u.id)} />
                <span className="truncate">{u.display_name}</span>
              </button>
            ))}
          </Section>
        </nav>

        <div className="flex items-center gap-2 border-t border-neutral-80 px-4 py-3">
          <PresenceAvatar name={data.me.display_name} id={data.me.id} on={live} size={28} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-xsmall14 font-semibold text-neutral-0">{data.me.display_name}</div>
            <div className="text-xxsmall12 text-neutral-45">{live ? '실시간 연결됨' : '자동 새로고침 중'}</div>
          </div>
          <form action={logout}>
            <button
              title="로그아웃"
              aria-label="로그아웃"
              className="flex size-8 items-center justify-center rounded-xs text-neutral-40 hover:bg-neutral-90 hover:text-neutral-0"
            >
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </aside>
      {searchOpen && <SearchDialog onClose={() => setSearchOpen(false)} />}
      <CreateChannelModal open={createOpen} onOpenChange={setCreateOpen} onCreated={go} />
    </>
  );
}

function Section({
  title,
  onAdd,
  addLabel,
  children,
}: {
  title: string;
  onAdd?: () => void;
  addLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between px-4 pb-1">
        <span className="text-xxsmall12 font-semibold text-neutral-40">{title}</span>
        {onAdd && (
          <button
            onClick={onAdd}
            title={addLabel}
            aria-label={addLabel}
            className="flex size-6 items-center justify-center rounded-xxs text-neutral-40 hover:bg-neutral-90 hover:text-primary"
          >
            <Plus className="size-4" />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function PresenceAvatar({ name, id, on, size = 20 }: { name: string; id: string; on: boolean; size?: number }) {
  return (
    <span className="relative block shrink-0">
      <Avatar name={name} id={id} size={size} />
      <span
        className={`absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-neutral-100 ${
          on ? 'bg-secondary' : 'bg-neutral-60'
        }`}
      />
    </span>
  );
}

function ChannelLink({
  c,
  active,
  icon,
  onClick,
}: {
  c: SidebarChannel;
  active: boolean;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  const unread = c.unread > 0 && !active;
  const badge = c.type === 'dm' ? c.unread : c.mention;
  return (
    <Link
      href={`/c/${c.id}`}
      onClick={onClick}
      className={`mx-2 flex items-center gap-2 rounded-xs px-2 py-1.5 text-xsmall14 ${
        active
          ? 'bg-primary-10 font-semibold text-primary'
          : unread
            ? 'font-bold text-neutral-0 hover:bg-neutral-90'
            : 'text-neutral-30 hover:bg-neutral-90'
      }`}
    >
      <span className={`shrink-0 ${active ? 'text-primary' : 'text-neutral-45'}`}>{icon}</span>
      <span className="flex-1 truncate">{channelLabel(c)}</span>
      {!active && badge > 0 && (
        <span className="min-w-5 rounded-full bg-requirement px-1.5 text-center text-xxsmall12 font-bold text-white">
          {badge}
        </span>
      )}
    </Link>
  );
}
