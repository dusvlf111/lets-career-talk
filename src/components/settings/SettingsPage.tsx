'use client';

import { ChevronLeft, Settings2, UserRound, Users } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { useBootstrap } from '../api';
import MembersSection from './MembersSection';
import ProfileSection from './ProfileSection';
import WorkspaceSection from './WorkspaceSection';

type Tab = 'profile' | 'members' | 'workspace';

const ROLE_LABEL = { owner: '소유자', admin: '관리자', member: '멤버' } as const;

export default function SettingsPage() {
  const { data } = useBootstrap();
  const [tab, setTab] = useState<Tab>('profile');
  if (!data) {
    return <div className="flex h-dvh items-center justify-center text-neutral-40">불러오는 중…</div>;
  }
  const admin = data.me.is_admin;
  const tabs: { id: Tab; label: string; icon: typeof UserRound; adminOnly?: boolean }[] = [
    { id: 'profile', label: '내 프로필', icon: UserRound },
    { id: 'members', label: '멤버 관리', icon: Users, adminOnly: true },
    { id: 'workspace', label: '워크스페이스 설정', icon: Settings2, adminOnly: true },
  ];
  const visible = tabs.filter((t) => !t.adminOnly || admin);

  return (
    <div className="min-h-dvh bg-neutral-100">
      <header className="sticky top-0 z-10 border-b border-neutral-80 bg-white pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 max-w-4xl items-center gap-2 px-3 md:h-16 md:px-6">
          <Link
            href="/c"
            aria-label="톡방으로 돌아가기"
            className="-ml-1 flex size-10 items-center justify-center rounded-xs text-neutral-20 hover:bg-neutral-95"
          >
            <ChevronLeft className="size-6" />
          </Link>
          <h1 className="flex-1 text-xsmall16 font-bold text-neutral-0 md:text-small18">설정</h1>
          <span className="rounded-xxs bg-primary-10 px-2 py-0.5 text-xxsmall12 font-semibold text-primary">
            {ROLE_LABEL[data.me.role]}
          </span>
        </div>
        {/* 모바일 탭 */}
        <div className="flex gap-1 overflow-x-auto px-3 pb-2 md:hidden">
          {visible.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xsmall14 ${
                tab === t.id ? 'bg-primary text-white' : 'bg-neutral-95 text-neutral-30'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <div className="mx-auto flex max-w-4xl gap-6 px-3 py-4 md:px-6 md:py-8">
        <nav className="hidden w-52 shrink-0 space-y-1 md:block">
          {visible.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex w-full items-center gap-2 rounded-xs px-3 py-2 text-xsmall14 ${
                tab === id ? 'bg-primary-10 font-semibold text-primary' : 'text-neutral-30 hover:bg-neutral-90'
              }`}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </nav>
        <main className="min-w-0 flex-1">
          {tab === 'profile' && <ProfileSection />}
          {tab === 'members' && admin && <MembersSection />}
          {tab === 'workspace' && admin && <WorkspaceSection />}
        </main>
      </div>
    </div>
  );
}

export function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-neutral-80 bg-white p-5 md:p-6">
      <h2 className="text-xsmall16 font-bold text-neutral-0">{title}</h2>
      {description && <p className="mt-1 text-xsmall14 text-neutral-40">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}
