'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { api, keys } from '../api';
import Button from '../ui/Button';
import { Field, TextArea } from '../ui/Input';
import Modal from '../ui/Modal';
import { toast } from '../ui/toast';

const TOPIC_MAX = 200;

export default function EditTopicModal({
  channelId,
  channelName,
  initialTopic,
  open,
  onOpenChange,
}: {
  channelId: string;
  channelName: string;
  initialTopic: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const [topic, setTopic] = useState(initialTopic);
  const [pending, setPending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    try {
      await api(`/api/channels/${channelId}`, { method: 'PATCH', body: { topic } });
      await qc.invalidateQueries({ queryKey: keys.bootstrap });
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={`#${channelName} 설명 편집`}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="채널 설명">
          <TextArea
            autoFocus
            rows={3}
            value={topic}
            maxLength={TOPIC_MAX}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="어떤 이야기를 나누는 채널인가요?"
          />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outlined" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button type="submit" disabled={pending}>
            저장
          </Button>
        </div>
      </form>
    </Modal>
  );
}
