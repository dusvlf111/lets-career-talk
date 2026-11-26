import { requireUser, route } from '@/lib/auth';
import { run } from '@/lib/db';

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (_req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  await run(
    'UPDATE channel_members SET last_read_at = ? WHERE channel_id = ? AND user_id = ?',
    [Date.now(), id, user.id],
  );
});
