import { z } from 'zod';

import { HttpError, requireUser, route } from '@/lib/auth';
import { assertCanRead } from '@/lib/chat';
import { run } from '@/lib/db';
import { publish } from '@/lib/realtime';

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({ topic: z.string().trim().max(200) });

export const PATCH = route(async (req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const channel = await assertCanRead(user, id);
  if (channel.type !== 'public') throw new HttpError(400, 'DM은 주제를 설정할 수 없어요.');
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) throw new HttpError(400, '주제는 200자까지 가능해요.');
  await run('UPDATE channels SET topic = ? WHERE id = ?', [parsed.data.topic, id]);
  await publish({ type: 'channels' }, { kind: 'global' });
});

export const DELETE = route(async (_req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  if (Number(user.is_admin) !== 1) throw new HttpError(403, '관리자만 채널을 삭제할 수 있어요.');
  const channel = await assertCanRead(user, id);
  if (channel.type !== 'public' || id === 'general') {
    throw new HttpError(400, '이 채널은 삭제할 수 없어요.');
  }
  await run('DELETE FROM reactions WHERE message_id IN (SELECT id FROM messages WHERE channel_id = ?)', [id]);
  await run('DELETE FROM messages WHERE channel_id = ?', [id]);
  await run('DELETE FROM channel_members WHERE channel_id = ?', [id]);
  await run('DELETE FROM channels WHERE id = ?', [id]);
  await publish({ type: 'channels' }, { kind: 'global' });
});
