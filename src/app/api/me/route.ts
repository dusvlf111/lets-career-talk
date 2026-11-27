import { z } from 'zod';

import { forgetUser, HttpError, requireUser, route } from '@/lib/auth';
import { run } from '@/lib/db';

const schema = z.object({ display_name: z.string().trim().min(1, '이름을 입력해주세요.').max(20, '이름은 20자까지 가능해요.') });

export const PATCH = route(async (req: Request) => {
  const user = await requireUser();
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? '이름을 확인해주세요.');
  await run('UPDATE users SET display_name = ? WHERE id = ?', [parsed.data.display_name, user.id]);
  forgetUser(user.id);
});
