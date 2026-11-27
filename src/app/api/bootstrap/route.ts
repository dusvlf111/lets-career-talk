import { isAdmin, requireUser, route } from '@/lib/auth';
import { sidebar } from '@/lib/chat';
import { all } from '@/lib/db';
import { getSettings, publicSettings } from '@/lib/settings';

export const GET = route(async () => {
  const user = await requireUser();
  const [channels, users, settings] = await Promise.all([
    sidebar(user),
    all<{ id: string; display_name: string }>(
      'SELECT id, display_name FROM users WHERE deactivated_at IS NULL ORDER BY display_name',
    ),
    getSettings(),
  ]);
  return {
    me: {
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      role: user.role,
      is_admin: isAdmin(user),
    },
    settings: publicSettings(settings),
    channels,
    users,
    realtime: Boolean(process.env.ABLY_API_KEY),
  };
});
