import { z } from 'zod';

import { forgetUser, HttpError, requireAdmin, route, type Role } from '@/lib/auth';
import { one, run } from '@/lib/db';

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  role: z.enum(['admin', 'member']).optional(),
  deactivated: z.boolean().optional(),
});

/**
 * 슬랙과 같은 규칙
 * - 소유자: 누구든 관리자 지정/해제, 비활성화 가능 (자기 자신 제외)
 * - 관리자: 멤버를 관리자로 지정, 멤버 비활성화 가능. 다른 관리자·소유자는 건드릴 수 없음
 */
export const PATCH = route(async (req: Request, { params }: Ctx) => {
  const me = await requireAdmin();
  const { id } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) throw new HttpError(400, '잘못된 요청입니다.');
  if (id === me.id) throw new HttpError(400, '내 권한은 직접 바꿀 수 없어요.');

  const target = await one<{ role: Role }>('SELECT role FROM users WHERE id = ?', [id]);
  if (!target) throw new HttpError(404, '멤버를 찾을 수 없어요.');
  if (target.role === 'owner') throw new HttpError(403, '소유자의 권한은 바꿀 수 없어요.');
  const iAmOwner = me.role === 'owner';
  if (target.role === 'admin' && !iAmOwner) {
    throw new HttpError(403, '다른 관리자는 소유자만 변경할 수 있어요.');
  }

  const { role, deactivated } = parsed.data;
  if (role) {
    await run('UPDATE users SET role = ?, is_admin = ? WHERE id = ?', [role, role === 'admin' ? 1 : 0, id]);
  }
  if (deactivated !== undefined) {
    await run('UPDATE users SET deactivated_at = ? WHERE id = ?', [deactivated ? Date.now() : null, id]);
  }
  forgetUser(id);
});
