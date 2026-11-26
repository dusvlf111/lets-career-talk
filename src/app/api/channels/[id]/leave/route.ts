import { HttpError, requireUser, route } from '@/lib/auth';
import { getChannel } from '@/lib/chat';
import { run } from '@/lib/db';

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (_req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const channel = await getChannel(id);
  if (!channel || channel.type !== 'public' || id === 'general') {
    throw new HttpError(400, '이 채널은 나갈 수 없어요.');
  }
  await run('DELETE FROM channel_members WHERE channel_id = ? AND user_id = ?', [id, user.id]);
});
