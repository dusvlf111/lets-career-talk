import { z } from 'zod';

import { HttpError, requireUser, route } from '@/lib/auth';
import { joinChannel, newId } from '@/lib/chat';
import { one, run } from '@/lib/db';
import { publish } from '@/lib/realtime';

const schema = z.object({
  name: z.string().trim().min(1).max(30),
  topic: z.string().trim().max(200).default(''),
});

export const POST = route(async (req: Request) => {
  const user = await requireUser();
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) throw new HttpError(400, '채널 이름은 1~30자로 입력해주세요.');
  const name = parsed.data.name.replace(/^#/, '').replace(/\s+/g, '-');

  const exists = await one("SELECT 1 FROM channels WHERE type = 'public' AND name = ?", [name]);
  if (exists) throw new HttpError(409, '같은 이름의 채널이 이미 있어요.');

  const id = newId();
  await run(
    `INSERT INTO channels (id, name, type, topic, created_by, created_at)
     VALUES (?, ?, 'public', ?, ?, ?)`,
    [id, name, parsed.data.topic, user.id, Date.now()],
  );
  await joinChannel(user.id, id);
  await publish({ type: 'channels' }, { kind: 'global' });
  return { id };
});
