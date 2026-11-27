import { z } from 'zod';

import { HttpError, requireUser, route } from '@/lib/auth';
import { assertCanRead, createMessage, listMessages } from '@/lib/chat';

type Ctx = { params: Promise<{ id: string }> };

export const GET = route(async (req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  await assertCanRead(user, id);
  const before = new URL(req.url).searchParams.get('before');
  return listMessages(user, id, before ? Number(before) : undefined);
});

const attachmentSchema = z.object({
  url: z.string().url(),
  name: z.string().min(1),
  content_type: z.string(),
  size: z.number().int().nonnegative(),
});

const schema = z.object({
  id: z.string().uuid().optional(),
  body: z.string().default(''),
  parentId: z.string().nullable().default(null),
  attachments: z.array(attachmentSchema).default([]),
});

export const POST = route(async (req: Request, { params }: Ctx) => {
  const [user, { id }, json] = await Promise.all([requireUser(), params, req.json()]);
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new HttpError(400, '잘못된 요청입니다.');
  const channel = await assertCanRead(user, id);
  const { id: clientId, body, parentId, attachments } = parsed.data;
  try {
    return await createMessage(user, channel, body, parentId, attachments, clientId);
  } catch (e) {
    if (String(e).includes('UNIQUE') || String(e).includes('PRIMARY KEY')) {
      throw new HttpError(409, '이미 전송된 메시지예요.');
    }
    throw e;
  }
});
