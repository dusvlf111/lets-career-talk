import { requireUser, route } from '@/lib/auth';
import { assertCanRead, joinChannel } from '@/lib/chat';

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (_req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  await assertCanRead(user, id);
  await joinChannel(user.id, id);
});
