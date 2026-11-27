'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { api, keys } from '../api';
import Button from '../ui/Button';
import { Field, Input, TextArea } from '../ui/Input';
import Modal from '../ui/Modal';

const NAME_MAX = 30;
const TOPIC_MAX = 200;

export default function CreateChannelModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: string) => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const reset = (next: boolean) => {
    if (!next) {
      setName('');
      setTopic('');
      setError(null);
    }
    onOpenChange(next);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || pending) return;
    setPending(true);
    setError(null);
    try {
      const { id } = await api<{ id: string }>('/api/channels', {
        method: 'POST',
        body: { name, topic },
      });
      await qc.invalidateQueries({ queryKey: keys.bootstrap });
      reset(false);
      onCreated(id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={reset}
      title="채널 만들기"
      description="주제별로 이야기를 나눌 공간을 만들어요. 모든 참여자가 볼 수 있어요."
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="채널 이름" hint="공백은 -로 바뀌어요.">
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-neutral-40">#</span>
            <Input
              autoFocus
              value={name}
              maxLength={NAME_MAX}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 스터디-모집"
              className="pl-7"
            />
          </div>
        </Field>
        <Field label="설명 (선택)">
          <TextArea
            rows={3}
            value={topic}
            maxLength={TOPIC_MAX}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="어떤 이야기를 나누는 채널인가요?"
          />
        </Field>
        {error && <p className="text-xsmall14 text-system-error">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outlined" onClick={() => reset(false)}>
            취소
          </Button>
          <Button type="submit" disabled={!name.trim() || pending}>
            {pending ? '만드는 중…' : '만들기'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
