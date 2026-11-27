'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AtSign,
  ChevronDown,
  ChevronRight,
  Hash,
  House,
  LogOut,
  MessagesSquare,
  Plus,
  Search,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

import { logout } from '@/app/(auth)/actions';

import { api, channelLabel, keys, useBootstrap, type SearchResult, type SidebarChannel } from './api';
import { Avatar, formatDay, formatTime } from './format';
import { toDisplayText } from './mentions';
import CreateChannelModal from './modal/CreateChannelModal';
import { usePrefetchChannel } from './Prefetcher';
import { useRealtime } from './Realtime';
import SearchDialog from './SearchDialog';
import { toast } from './ui/toast';
import { useUi } from './Workspace';

const COHORT = process.env.NEXT_PUBLIC_COHORT_NAME ?? '렛츠커리어';

type Tab = 'home' | 'dms' | 'activity' | 'me';

const TABS: { id: Tab; label: string; icon: typeof House }[] = [
  { id: 'home', label: '홈', icon: House },
  { id: 'dms', label: 'DM', icon: MessagesSquare },
  { id: 'activity', label: '활동', icon: AtSign },
  { id: 'me', label: '나', icon: UserRound },
];

/** 행 크기: 모바일은 손가락으로 누르기 좋게 크게 */
const ROW = 'mx-2 flex items-center gap-2.5 rounded-xs px-2 py-2.5 text-xsmall16 md:gap-2 md:py-1.5 md:text-xsmall14';

export default function Sidebar() {
  const { data } = useBootstrap();
  const { online, connected } = useRealtime();
  const { openThread } = useUi();
  const params = useParams<{ id?: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [searchOpen, setSearchOpen] = useState(false);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('home');
  if (!data) return null;

  const joined = data.channels.filter((c) => c.type === 'public' && c.joined);
  const notJoined = data.channels.filter((c) => c.type === 'public' && !c.joined);
  const dms = data.channels.filter((c) => c.type === 'dm');
  const dmUserIds = new Set(dms.map((d) => d.dm_user_id));
  const others = data.users.filter((u) => u.id !== data.me.id && !dmUserIds.has(u.id));
  const live = data.realtime && connected;
  const dmUnread = dms.reduce((sum, c) => sum + c.unread, 0);
  const mentionCount = data.channels.reduce((sum, c) => sum + c.mention, 0);

  const go = (id: string) => router.push(`/c/${id}`);

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

  const dmLinks = dms.map((c) => (
    <ChannelLink
      key={c.id}
      c={c}
      active={params.id === c.id}
      icon={
        <PresenceAvatar
          name={channelLabel(c)}
          id={c.dm_user_id ?? data.me.id}
          on={!c.dm_user_id || online.has(c.dm_user_id)}
        />
      }
    />
  ));

  const people = others.map((u) => (
    <button
      key={u.id}
      onClick={() => openDm(u.id)}
      className={`${ROW} w-[calc(100%-1rem)] text-left text-neutral-40 hover:bg-neutral-90 hover:text-neutral-10`}
    >
      <PresenceAvatar name={u.display_name} id={u.id} on={online.has(u.id)} />
      <span className="truncate">{u.display_name}</span>
    </button>
  ));

  const channelSection = (
    <Section title="채널" onAdd={() => setCreateOpen(true)} addLabel="채널 만들기">
      {joined.map((c) => (
        <ChannelLink key={c.id} c={c} active={params.id === c.id} icon={<Hash className="size-4" />} />
      ))}
      {notJoined.length > 0 && (
        <button
          onClick={() => setBrowseOpen((v) => !v)}
          className={`${ROW} w-[calc(100%-1rem)] gap-1.5 text-neutral-40 hover:bg-neutral-90`}
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
            className={`${ROW} w-[calc(100%-1rem)] pl-7 text-left text-neutral-30 hover:bg-neutral-90`}
          >
            <span className="flex-1 truncate"># {c.name}</span>
            <span className="rounded-xxs bg-primary-10 px-1.5 py-0.5 text-xxsmall12 font-semibold text-primary">
              참여
            </span>
          </button>
        ))}
    </Section>
  );

  // 데스크톱은 탭 없이 홈 구성 그대로, 모바일은 하단 탭에 따라 화면 전환
  const show = (t: Tab) => (tab === t ? 'block' : 'hidden md:hidden');

  return (
    <>
      <aside className="flex w-full shrink-0 flex-col bg-white md:w-64 md:border-r md:border-neutral-80 md:bg-neutral-100">
        {/* 상단: 워크스페이스 + 검색 */}
        <div className="border-b border-neutral-80 bg-white pt-[env(safe-area-inset-top)] md:border-0 md:bg-transparent">
          <div className="flex items-center gap-2.5 px-4 pt-4 pb-3 md:pt-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-simple.svg" alt="" className="size-8 md:size-7" />
            <div className="min-w-0">
              <div className="truncate text-small18 font-bold text-neutral-0 md:text-xsmall16">{COHORT}</div>
              <div className="text-xxsmall12 text-neutral-40">참여자 전용 톡방</div>
            </div>
          </div>
          <button
            onClick={() => setSearchOpen(true)}
            className="mx-3 mb-3 flex w-[calc(100%-1.5rem)] items-center gap-2 rounded-md bg-neutral-95 px-3 py-2.5 text-xsmall14 text-neutral-45 md:mb-0 md:bg-white md:py-2 md:ring-1 md:ring-neutral-80 md:hover:ring-neutral-70"
          >
            <Search className="size-4" />
            메시지 검색
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto pt-3 pb-4 md:mt-1">
          <div className={`${show('home')} space-y-5 md:block`}>
            {channelSection}
            <Section title="다이렉트 메시지">
              {dmLinks}
              {people}
            </Section>
          </div>

          <div className={show('dms')}>
            <Section title="대화">
              {dms.length === 0 && <Empty>아직 대화가 없어요. 아래에서 대화를 시작해 보세요.</Empty>}
              {dmLinks}
            </Section>
            {people.length > 0 && (
              <div className="mt-5">
                <Section title="새 대화 시작">{people}</Section>
              </div>
            )}
          </div>

          <div className={show('activity')}>
            {tab === 'activity' && (
              <ActivityList
                onOpen={(r) => {
                  go(r.channel_id);
                  setTimeout(() => openThread(r.parent_id ?? r.id), 0);
                }}
              />
            )}
          </div>

          <div className={`${show('me')} px-4`}>
            <div className="flex flex-col items-center gap-2 rounded-lg bg-neutral-100 py-8">
              <Avatar name={data.me.display_name} id={data.me.id} size={64} />
              <div className="text-small18 font-bold text-neutral-0">{data.me.display_name}</div>
              <div className="flex items-center gap-1.5 text-xsmall14 text-neutral-40">
                <span className={`size-2 rounded-full ${live ? 'bg-secondary' : 'bg-neutral-60'}`} />
                {live ? '실시간 연결됨' : '자동 새로고침 중'}
              </div>
            </div>
            <form action={logout} className="mt-4">
              <button className="flex w-full items-center gap-3 rounded-md px-3 py-3.5 text-xsmall16 text-neutral-10 hover:bg-neutral-95">
                <LogOut className="size-5 text-neutral-40" />
                로그아웃
              </button>
            </form>
          </div>
        </nav>

        {/* 데스크톱: 하단 내 정보 */}
        <div className="hidden items-center gap-2 border-t border-neutral-80 px-4 py-3 md:flex">
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

        {/* 모바일: 하단 탭바 */}
        <div className="grid grid-cols-4 border-t border-neutral-80 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
          {TABS.map(({ id, label, icon: Icon }) => {
            const badge = id === 'dms' ? dmUnread : id === 'activity' ? mentionCount : 0;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`relative flex flex-col items-center gap-0.5 pt-2 pb-1.5 text-xxsmall12 ${
                  tab === id ? 'font-semibold text-primary' : 'text-neutral-45'
                }`}
              >
                <Icon className="size-6" strokeWidth={tab === id ? 2.4 : 1.8} />
                {label}
                {badge > 0 && (
                  <span className="absolute top-1 left-1/2 ml-2 min-w-4 rounded-full bg-requirement px-1 text-center text-[10px] leading-4 font-bold text-white">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </aside>
      {searchOpen && <SearchDialog onClose={() => setSearchOpen(false)} />}
      <CreateChannelModal open={createOpen} onOpenChange={setCreateOpen} onCreated={go} />
    </>
  );
}

function ActivityList({ onOpen }: { onOpen: (r: SearchResult) => void }) {
  const { data: boot } = useBootstrap();
  const { data, isLoading } = useQuery({
    queryKey: ['activity'],
    queryFn: () => api<SearchResult[]>('/api/activity'),
  });
  if (isLoading) return <Empty>불러오는 중…</Empty>;
  if (!data?.length) return <Empty>나를 멘션한 메시지가 여기에 모여요.</Empty>;
  return (
    <ul>
      {data.map((r) => (
        <li key={r.id}>
          <button onClick={() => onOpen(r)} className="flex w-full gap-3 px-4 py-3 text-left hover:bg-neutral-95">
            <Avatar name={r.display_name} id={r.user_id ?? r.id} size={36} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-xxsmall12 text-neutral-45">
                <span className="font-semibold text-neutral-30">{r.display_name}</span>
                {r.channel_type === 'dm' ? 'DM' : `#${r.channel_name}`} · {formatDay(r.created_at)}{' '}
                {formatTime(r.created_at)}
              </span>
              <span className="mt-0.5 line-clamp-2 block text-xsmall14 text-neutral-10">
                {toDisplayText(r.body, boot?.users ?? [])}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-8 text-center text-xsmall14 text-neutral-45">{children}</p>;
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
        <span className="text-xsmall14 font-semibold text-neutral-40 md:text-xxsmall12">{title}</span>
        {onAdd && (
          <button
            onClick={onAdd}
            title={addLabel}
            aria-label={addLabel}
            className="flex size-8 items-center justify-center rounded-xxs text-neutral-40 hover:bg-neutral-90 hover:text-primary md:size-6"
          >
            <Plus className="size-5 md:size-4" />
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
        className={`absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-white md:border-neutral-100 ${
          on ? 'bg-secondary' : 'bg-neutral-60'
        }`}
      />
    </span>
  );
}

function ChannelLink({ c, active, icon }: { c: SidebarChannel; active: boolean; icon: React.ReactNode }) {
  const prefetch = usePrefetchChannel();
  const unread = c.unread > 0 && !active;
  const badge = c.type === 'dm' ? c.unread : c.mention;
  return (
    <Link
      href={`/c/${c.id}`}
      onMouseEnter={() => prefetch(c.id)}
      onTouchStart={() => prefetch(c.id)}
      className={`${ROW} ${
        active
          ? 'md:bg-primary-10 md:font-semibold md:text-primary'
          : unread
            ? 'font-bold text-neutral-0 hover:bg-neutral-90'
            : 'text-neutral-30 hover:bg-neutral-90'
      }`}
    >
      <span className={`shrink-0 ${active ? 'md:text-primary' : 'text-neutral-45'}`}>{icon}</span>
      <span className="flex-1 truncate">{channelLabel(c)}</span>
      {!active && badge > 0 && (
        <span className="min-w-5 rounded-full bg-requirement px-1.5 text-center text-xxsmall12 font-bold text-white">
          {badge}
        </span>
      )}
    </Link>
  );
}
