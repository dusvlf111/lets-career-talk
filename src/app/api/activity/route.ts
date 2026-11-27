import { requireUser, route } from '@/lib/auth';
import { all } from '@/lib/db';

const ACTIVITY_LIMIT = 50;

/** 나를 멘션한 메시지 (볼 수 있는 채널만) */
export const GET = route(async () => {
  const user = await requireUser();
  return all(
    `SELECT m.id, m.channel_id, m.parent_id, m.body, m.created_at,
            u.display_name, m.user_id, c.name AS channel_name, c.type AS channel_type
     FROM messages m
     JOIN users u ON u.id = m.user_id
     JOIN channels c ON c.id = m.channel_id
     LEFT JOIN channel_members cm ON cm.channel_id = c.id AND cm.user_id = ?
     WHERE m.deleted_at IS NULL AND m.user_id != ? AND m.body LIKE ?
       AND (c.type = 'public' OR cm.user_id IS NOT NULL)
     ORDER BY m.created_at DESC LIMIT ?`,
    [user.id, user.id, `%<@${user.id}>%`, ACTIVITY_LIMIT],
  );
});
