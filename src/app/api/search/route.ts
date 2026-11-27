import { requireUser, route } from '@/lib/auth';
import { all } from '@/lib/db';

const SEARCH_LIMIT = 30;

export const GET = route(async (req: Request) => {
  const user = await requireUser();
  const q = new URL(req.url).searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) return [];
  const escaped = q.replace(/[\\%_]/g, (c) => `\\${c}`);
  return all(
    `SELECT m.id, m.channel_id, m.parent_id, m.body, m.created_at,
            u.display_name, m.user_id, c.name AS channel_name, c.type AS channel_type
     FROM messages m
     JOIN users u ON u.id = m.user_id
     JOIN channels c ON c.id = m.channel_id
     LEFT JOIN channel_members cm ON cm.channel_id = c.id AND cm.user_id = ?
     WHERE m.deleted_at IS NULL AND m.body LIKE ? ESCAPE '\\'
       AND (c.type = 'public' OR cm.user_id IS NOT NULL)
     ORDER BY m.created_at DESC LIMIT ?`,
    [user.id, `%${escaped}%`, SEARCH_LIMIT],
  );
});
