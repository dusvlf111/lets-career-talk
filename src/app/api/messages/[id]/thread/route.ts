import { HttpError, requireUser, route } from '@/lib/auth';
import { assertCanRead, getMessage, listThread } from '@/lib/chat';

type Ctx = { params: Promise<{ id: string }> };

export const GET = route(async (_req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const parent = await getMessage(user, id);
  if (!parent) throw new HttpError(404, '메시지를 찾을 수 없어요.');
  await assertCanRead(user, parent.channel_id);
  return { parent, replies: await listThread(user, id) };
});
