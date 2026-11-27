import { z } from 'zod';

import { HttpError, requireUser, route } from '@/lib/auth';
import { notifyMessage } from '@/lib/chat';
import { one, run } from '@/lib/db';

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({ emoji: z.string().min(1).max(16) });

/** 리액션 토글. DB 왕복을 줄이기 위해 메시지+권한을 한 번에 조회하고, 삭제 결과로 추가 여부를 정한다 */
export const POST = route(async (req: Request, { params }: Ctx) => {
  const [user, { id }, json] = await Promise.all([requireUser(), params, req.json()]);
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new HttpError(400, '잘못된 이모지입니다.');

  const msg = await one<{ channel_id: string; parent_id: string | null; type: 'public' | 'dm'; member: number }>(
    `SELECT m.channel_id, m.parent_id, c.type,
            EXISTS(SELECT 1 FROM channel_members cm WHERE cm.channel_id = m.channel_id AND cm.user_id = ?) AS member
     FROM messages m JOIN channels c ON c.id = m.channel_id
     WHERE m.id = ? AND m.deleted_at IS NULL`,
    [user.id, id],
  );
  if (!msg) throw new HttpError(404, '메시지를 찾을 수 없어요.');
  if (msg.type === 'dm' && Number(msg.member) !== 1) throw new HttpError(403, '접근 권한이 없습니다.');

  const { emoji } = parsed.data;
  const removed = await run(
    'DELETE FROM reactions WHERE message_id = ? AND user_id = ? AND emoji = ?',
    [id, user.id, emoji],
  );
  if (removed.rowsAffected === 0) {
    await run(
      'INSERT INTO reactions (message_id, user_id, emoji, created_at) VALUES (?, ?, ?, ?)',
      [id, user.id, emoji, Date.now()],
    );
  }
  await notifyMessage({ id: msg.channel_id, type: msg.type }, id, msg.parent_id);
});
