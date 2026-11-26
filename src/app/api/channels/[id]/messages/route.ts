import { z } from 'zod';

import { HttpError, requireUser, route } from '@/lib/auth';
import { assertCanRead, assertCanWrite, createMessage, listMessages } from '@/lib/chat';

type Ctx = { params: Promise<{ id: string }> };

export const GET = route(async (req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  await assertCanRead(user, id);
  const before = new URL(req.url).searchParams.get('before');
  return listMessages(user, id, before ? Number(before) : undefined);
});

const schema = z.object({
  body: z.string(),
  parentId: z.string().nullable().default(null),
});

export const POST = route(async (req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) throw new HttpError(400, '잘못된 요청입니다.');
  const channel = await assertCanWrite(user, id);
  return createMessage(user, channel, parsed.data.body, parsed.data.parentId);
});
