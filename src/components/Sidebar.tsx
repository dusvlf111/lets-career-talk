'use client';

import { ChevronDown, ChevronRight, Plus, Search } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

import { logout } from '@/app/(auth)/actions';

import { api, channelLabel, keys, useBootstrap, type SidebarChannel } from './api';
import { useRealtime } from './Realtime';
import SearchDialog from './SearchDialog';
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
  if (!data) return null;

  const joined = data.channels.filter((c) => c.type === 'public' && c.joined);
  const notJoined = data.channels.filter((c) => c.type === 'public' && !c.joined);
  const dms = data.channels.filter((c) => c.type === 'dm');
  const dmUserIds = new Set(dms.map((d) => d.dm_user_id));
  const others = data.users.filter((u) => u.id !== data.me.id && !dmUserIds.has(u.id));

  const go = (id: string) => {
    setSidebarOpen(false);
    router.push(`/c/${id}`);
  };

  const createChannel = async () => {
    const name = window.prompt('새 채널 이름');
    if (!name) return;
    const topic = window.prompt('채널 설명 (선택)') ?? '';
    try {
      const { id } = await api<{ id: string }>('/api/channels', { method: 'POST', body: { name, topic } });
      await qc.invalidateQueries({ queryKey: keys.bootstrap });
      go(id);
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const openDm = async (userId: string) => {
    const { id } = await api<{ id: string }>('/api/dms', { method: 'POST', body: { userId } });
    await qc.invalidateQueries({ queryKey: keys.bootstrap });
    go(id);
  };

  const joinChannel = async (id: string) => {
    await api(`/api/channels/${id}/join`, { method: 'POST' });
    await qc.invalidateQueries({ queryKey: keys.bootstrap });
    setBrowseOpen(false);
    go(id);
  };

  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col bg-primary-dark text-white/80 transition-transform md:static md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-xs bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-simple.svg" alt="" className="size-5" />
            </span>
            <span className="truncate font-bold text-white">{COHORT}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className={`size-2 rounded-full ${connected ? 'bg-secondary' : 'bg-point'}`} />
            {data.me.display_name}
            {(!data.realtime || !connected) && <span className="opacity-60">(폴링 모드)</span>}
          </div>
        </div>

        <button
          onClick={() => setSearchOpen(true)}
          className="mx-3 mt-3 flex items-center gap-2 rounded-sm bg-white/10 px-3 py-1.5 text-left text-sm hover:bg-white/20"
        >
          <Search className="size-4" /> 메시지 검색
        </button>

        <nav className="flex-1 space-y-4 overflow-y-auto py-3 text-[15px]">
          <Section title="채널" action={{ onClick: createChannel, title: '채널 만들기' }}>
            {joined.map((c) => (
              <ChannelLink key={c.id} c={c} active={params.id === c.id} onClick={() => setSidebarOpen(false)} prefix="#" />
            ))}
            {notJoined.length > 0 && (
              <button onClick={() => setBrowseOpen((v) => !v)} className="flex w-full items-center gap-1 px-4 py-1 text-left text-sm opacity-70 hover:opacity-100">
                {browseOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />} 다른 채널 둘러보기 ({notJoined.length})
              </button>
            )}
            {browseOpen &&
              notJoined.map((c) => (
                <button
                  key={c.id}
                  onClick={() => joinChannel(c.id)}
                  className="flex w-full items-center justify-between px-6 py-1 text-left text-sm hover:bg-white/10"
                >
                  <span className="truncate"># {c.name}</span>
                  <span className="text-xs text-white/60">참여</span>
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
                prefix={<Dot on={!c.dm_user_id || online.has(c.dm_user_id)} />}
              />
            ))}
            {others.map((u) => (
              <button
                key={u.id}
                onClick={() => openDm(u.id)}
                className="mx-2 flex w-[calc(100%-1rem)] items-center gap-2 rounded-xs px-2 py-1 text-left opacity-70 hover:bg-white/10 hover:opacity-100"
              >
                <Dot on={online.has(u.id)} />
                <span className="truncate">{u.display_name}</span>
              </button>
            ))}
          </Section>
        </nav>

        <form action={logout} className="border-t border-white/10 p-3">
          <button className="w-full rounded-md px-3 py-1.5 text-left text-sm hover:bg-white/10">로그아웃</button>
        </form>
      </aside>
      {searchOpen && <SearchDialog onClose={() => setSearchOpen(false)} />}
    </>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: { onClick: () => void; title: string };
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between px-4 pb-1 text-sm font-semibold text-white/70">
        {title}
        {action && (
          <button onClick={action.onClick} title={action.title} className="rounded-xxs p-1 hover:bg-white/10">
            <Plus className="size-4" />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function Dot({ on }: { on: boolean }) {
  return <span className={`inline-block size-2 shrink-0 rounded-full ${on ? 'bg-secondary' : 'border border-white/50'}`} />;
}

function ChannelLink({
  c,
  active,
  prefix,
  onClick,
}: {
  c: SidebarChannel;
  active: boolean;
  prefix: React.ReactNode;
  onClick: () => void;
}) {
  const bold = c.unread > 0 && !active;
  return (
    <Link
      href={`/c/${c.id}`}
      onClick={onClick}
      className={`mx-2 flex items-center gap-2 rounded-xs px-2 py-1 ${
        active ? 'bg-white font-semibold text-primary-dark' : 'hover:bg-white/10'
      } ${bold ? 'font-bold text-white' : ''}`}
    >
      <span className="w-3 shrink-0 text-center opacity-70">{prefix}</span>
      <span className="flex-1 truncate">{channelLabel(c)}</span>
      {!active && (c.mention > 0 || (c.type === 'dm' && c.unread > 0)) && (
        <span className="rounded-full bg-requirement px-1.5 text-xs font-bold text-white">
          {c.type === 'dm' ? c.unread : c.mention}
        </span>
      )}
    </Link>
  );
}
