import { requireUser, route } from '@/lib/auth';
import { sidebar } from '@/lib/chat';
import { all } from '@/lib/db';

export const GET = route(async () => {
  const user = await requireUser();
  const [channels, users] = await Promise.all([
    sidebar(user),
    all<{ id: string; display_name: string }>(
      'SELECT id, display_name FROM users ORDER BY display_name',
    ),
  ]);
  return {
    me: { ...user, is_admin: Number(user.is_admin) === 1 },
    channels,
    users,
    realtime: Boolean(process.env.ABLY_API_KEY),
  };
});
