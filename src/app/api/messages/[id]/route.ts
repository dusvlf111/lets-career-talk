import { z } from 'zod';

import { HttpError, requireUser, route, type User } from '@/lib/auth';
import { getChannel, MAX_MESSAGE_LENGTH, notifyMessage } from '@/lib/chat';
import { one, run } from '@/lib/db';

type Ctx = { params: Promise<{ id: string }> };

async function ownedMessage(user: User, id: string) {
  const msg = await one<{ user_id: string; channel_id: string; parent_id: string | null; deleted_at: number | null }>(
    'SELECT user_id, channel_id, parent_id, deleted_at FROM messages WHERE id = ?',
    [id],
  );
  if (!msg || msg.deleted_at) throw new HttpError(404, '메시지를 찾을 수 없어요.');
  const channel = await getChannel(msg.channel_id);
  // 관리자도 DM에는 손댈 수 없다 (공개 채널의 메시지만 관리)
  const canManage =
    msg.user_id === user.id || (Number(user.is_admin) === 1 && channel?.type === 'public');
  if (!canManage) throw new HttpError(403, '내 메시지만 수정/삭제할 수 있어요.');
  return { msg, channel: channel! };
}

const schema = z.object({ body: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH) });

export const PATCH = route(async (req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const { msg, channel } = await ownedMessage(user, id);
  if (msg.user_id !== user.id) throw new HttpError(403, '내 메시지만 수정할 수 있어요.');
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) throw new HttpError(400, '메시지를 확인해주세요.');
  await run('UPDATE messages SET body = ?, edited_at = ? WHERE id = ?', [parsed.data.body, Date.now(), id]);
  await notifyMessage(channel, id, msg.parent_id);
});

export const DELETE = route(async (_req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const { msg, channel } = await ownedMessage(user, id);
  await run('UPDATE messages SET deleted_at = ? WHERE id = ?', [Date.now(), id]);
  await notifyMessage(channel, id, msg.parent_id);
});
