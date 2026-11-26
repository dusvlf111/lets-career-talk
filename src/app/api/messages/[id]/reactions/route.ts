import { z } from 'zod';

import { HttpError, requireUser, route } from '@/lib/auth';
import { assertCanRead, notifyMessage } from '@/lib/chat';
import { one, run } from '@/lib/db';

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({ emoji: z.string().min(1).max(16) });

export const POST = route(async (req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) throw new HttpError(400, '잘못된 이모지입니다.');
  const msg = await one<{ channel_id: string; parent_id: string | null }>(
    'SELECT channel_id, parent_id FROM messages WHERE id = ? AND deleted_at IS NULL',
    [id],
  );
  if (!msg) throw new HttpError(404, '메시지를 찾을 수 없어요.');
  const channel = await assertCanRead(user, msg.channel_id);

  const { emoji } = parsed.data;
  const existing = await one(
    'SELECT 1 FROM reactions WHERE message_id = ? AND user_id = ? AND emoji = ?',
    [id, user.id, emoji],
  );
  if (existing) {
    await run('DELETE FROM reactions WHERE message_id = ? AND user_id = ? AND emoji = ?', [id, user.id, emoji]);
  } else {
    await run(
      'INSERT INTO reactions (message_id, user_id, emoji, created_at) VALUES (?, ?, ?, ?)',
      [id, user.id, emoji, Date.now()],
    );
  }
  await notifyMessage(channel, id, msg.parent_id);
});
