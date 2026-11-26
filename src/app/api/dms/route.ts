import { z } from 'zod';

import { HttpError, requireUser, route } from '@/lib/auth';
import { newId } from '@/lib/chat';
import { one, run } from '@/lib/db';

const schema = z.object({ userId: z.string() });

/** 1:1 DM 채널을 찾거나 만든다. dm_key = 정렬된 두 사용자 id */
export const POST = route(async (req: Request) => {
  const user = await requireUser();
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) throw new HttpError(400, '잘못된 요청입니다.');
  const other = await one<{ id: string }>('SELECT id FROM users WHERE id = ?', [parsed.data.userId]);
  if (!other) throw new HttpError(404, '사용자를 찾을 수 없어요.');

  const key = [user.id, other.id].sort().join(':');
  const found = await one<{ id: string }>('SELECT id FROM channels WHERE dm_key = ?', [key]);
  if (found) return { id: found.id };

  const id = newId();
  const now = Date.now();
  await run(
    `INSERT INTO channels (id, name, type, dm_key, created_by, created_at)
     VALUES (?, NULL, 'dm', ?, ?, ?)`,
    [id, key, user.id, now],
  );
  for (const uid of new Set([user.id, other.id])) {
    await run(
      'INSERT OR IGNORE INTO channel_members (channel_id, user_id, last_read_at, joined_at) VALUES (?, ?, ?, ?)',
      [id, uid, now, now],
    );
  }
  return { id };
});
