'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useState } from 'react';

import { api, keys, useBootstrap, type AdminMember, type Role } from '../api';
import { Avatar, formatDay } from '../format';
import { matchesName } from '../mentions';
import Button from '../ui/Button';
import { confirm } from '../ui/confirm';
import { toast } from '../ui/toast';
import { Card } from './SettingsPage';

const ROLE_LABEL: Record<Role, string> = { owner: '소유자', admin: '관리자', member: '멤버' };
const ROLE_STYLE: Record<Role, string> = {
  owner: 'bg-neutral-0 text-white',
  admin: 'bg-primary-10 text-primary',
  member: 'bg-neutral-90 text-neutral-30',
};
const MEMBERS_KEY = ['admin', 'members'] as const;

export default function MembersSection() {
  const { data: boot } = useBootstrap();
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const { data: members } = useQuery({
    queryKey: MEMBERS_KEY,
    queryFn: () => api<AdminMember[]>('/api/admin/members'),
  });
  if (!boot) return null;
  const iAmOwner = boot.me.role === 'owner';

  const update = async (m: AdminMember, body: { role?: 'admin' | 'member'; deactivated?: boolean }, done: string) => {
    try {
      await api(`/api/admin/members/${m.id}`, { method: 'PATCH', body });
      await Promise.all([
        qc.invalidateQueries({ queryKey: MEMBERS_KEY }),
        qc.invalidateQueries({ queryKey: keys.bootstrap }),
      ]);
      toast.success(done);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const toggleAdmin = async (m: AdminMember) => {
    const makeAdmin = m.role === 'member';
    const ok = await confirm({
      title: makeAdmin ? `${m.display_name}님을 관리자로 지정할까요?` : `${m.display_name}님의 관리자 권한을 해제할까요?`,
      description: makeAdmin
        ? '관리자는 공지 작성, 채널 삭제, 멤버 관리, 워크스페이스 설정을 할 수 있어요.'
        : '일반 멤버로 바뀌어요.',
      confirmLabel: makeAdmin ? '관리자로 지정' : '권한 해제',
      variant: makeAdmin ? 'default' : 'destructive',
    });
    if (ok) update(m, { role: makeAdmin ? 'admin' : 'member' }, makeAdmin ? '관리자로 지정했어요' : '관리자 권한을 해제했어요');
  };

  const toggleActive = async (m: AdminMember) => {
    const deactivate = !m.deactivated_at;
    const ok = await confirm({
      title: deactivate ? `${m.display_name}님을 비활성화할까요?` : `${m.display_name}님을 다시 활성화할까요?`,
      description: deactivate
        ? '바로 로그아웃되고 더 이상 들어올 수 없어요. 남긴 메시지는 그대로 남아요.'
        : '다시 로그인해서 참여할 수 있어요.',
      confirmLabel: deactivate ? '비활성화' : '활성화',
      variant: deactivate ? 'destructive' : 'default',
    });
    if (ok) update(m, { deactivated: deactivate }, deactivate ? '비활성화했어요' : '다시 활성화했어요');
  };

  const list = (members ?? []).filter(
    (m) => !q || matchesName(m.display_name, q) || m.username.toLowerCase().includes(q.toLowerCase()),
  );
  const activeCount = (members ?? []).filter((m) => !m.deactivated_at).length;

  return (
    <Card
      title={`멤버 ${activeCount}명`}
      description="관리자를 지정하거나 멤버를 비활성화할 수 있어요. 관리자 권한 해제와 다른 관리자 관리는 소유자만 할 수 있어요."
    >
      <div className="relative mb-3">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-45" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="이름 또는 아이디로 검색"
          className="w-full rounded-md bg-neutral-95 py-2.5 pr-3 pl-9 text-xsmall16 outline-none ring-primary focus:ring-1 md:text-xsmall14"
        />
      </div>
      <ul className="divide-y divide-neutral-85">
        {list.map((m) => {
          const isMe = m.id === boot.me.id;
          const canManage = !isMe && m.role !== 'owner' && (iAmOwner || m.role === 'member');
          return (
            <li key={m.id} className={`flex flex-wrap items-center gap-3 py-3 ${m.deactivated_at ? 'opacity-50' : ''}`}>
              <Avatar name={m.display_name} id={m.id} size={36} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-xsmall14 font-semibold text-neutral-0">{m.display_name}</span>
                  {isMe && <span className="text-xxsmall12 text-neutral-45">(나)</span>}
                  <span className={`rounded-xxs px-1.5 py-0.5 text-[11px] font-semibold ${ROLE_STYLE[m.role]}`}>
                    {ROLE_LABEL[m.role]}
                  </span>
                  {m.deactivated_at && (
                    <span className="rounded-xxs bg-requirement/10 px-1.5 py-0.5 text-[11px] font-semibold text-system-error">
                      비활성
                    </span>
                  )}
                </div>
                <div className="text-xxsmall12 text-neutral-45">
                  @{m.username} · {formatDay(m.created_at)} 가입
                </div>
              </div>
              {canManage && (
                <div className="flex w-full gap-2 sm:w-auto">
                  {!m.deactivated_at && (m.role === 'member' || iAmOwner) && (
                    <Button size="xs" variant={m.role === 'member' ? 'secondary' : 'outlined'} onClick={() => toggleAdmin(m)}>
                      {m.role === 'member' ? '관리자로 지정' : '관리자 해제'}
                    </Button>
                  )}
                  <Button size="xs" variant="outlined" onClick={() => toggleActive(m)}>
                    {m.deactivated_at ? '활성화' : '비활성화'}
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
