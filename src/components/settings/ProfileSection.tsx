'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { api, keys, useBootstrap } from '../api';
import { Avatar } from '../format';
import Button from '../ui/Button';
import { Field, Input } from '../ui/Input';
import { toast } from '../ui/toast';
import { Card } from './SettingsPage';

export default function ProfileSection() {
  const { data } = useBootstrap();
  const qc = useQueryClient();
  const [name, setName] = useState(data?.me.display_name ?? '');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [saving, setSaving] = useState(false);
  if (!data) return null;

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api('/api/me', { method: 'PATCH', body: { display_name: name } });
      await qc.invalidateQueries({ queryKey: keys.bootstrap });
      toast.success('이름을 바꿨어요');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api('/api/me/password', { method: 'POST', body: { current, next } });
      setCurrent('');
      setNext('');
      toast.success('비밀번호를 바꿨어요');
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <Card title="프로필" description="톡방에 표시되는 이름이에요. 멘션도 이 이름으로 보여요.">
        <form onSubmit={saveName} className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <Avatar name={name || data.me.display_name} id={data.me.id} size={56} />
          <div className="flex-1">
            <Field label="이름">
              <Input value={name} maxLength={20} onChange={(e) => setName(e.target.value)} />
            </Field>
          </div>
          <Button type="submit" disabled={saving || !name.trim() || name === data.me.display_name}>
            저장
          </Button>
        </form>
        <p className="mt-3 text-xxsmall12 text-neutral-45">로그인 아이디: {data.me.username} (다른 사람에게는 보이지 않아요)</p>
      </Card>

      <Card title="비밀번호 변경">
        <form onSubmit={changePassword} className="space-y-4">
          <Field label="현재 비밀번호">
            <Input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          </Field>
          <Field label="새 비밀번호" hint="8자 이상">
            <Input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" disabled={!current || next.length < 8}>
              비밀번호 변경
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
