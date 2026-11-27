import { requireAdmin, route } from '@/lib/auth';
import { all } from '@/lib/db';

/** 관리자용 멤버 목록 (역할·가입일·비활성화 여부) */
export const GET = route(async () => {
  await requireAdmin();
  return all(
    `SELECT id, username, display_name, role, created_at, deactivated_at FROM users
     ORDER BY CASE role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, deactivated_at IS NOT NULL, created_at`,
  );
});
