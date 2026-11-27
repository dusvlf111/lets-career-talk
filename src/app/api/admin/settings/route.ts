import { HttpError, requireAdmin, route } from '@/lib/auth';
import { getSettings, settingsSchema, updateSettings } from '@/lib/settings';

/** 관리자용: 입장 암호까지 포함한 전체 설정 */
export const GET = route(async () => {
  await requireAdmin();
  const settings = await getSettings();
  return { ...settings, invite_code_from_env: !settings.invite_code && Boolean(process.env.INVITE_CODE) };
});

export const PATCH = route(async (req: Request) => {
  await requireAdmin();
  const parsed = settingsSchema.partial().safeParse(await req.json());
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? '설정값을 확인해주세요.');
  if (parsed.data.upload_types && parsed.data.upload_types.length === 0) {
    throw new HttpError(400, '업로드 형식을 하나 이상 선택해주세요.');
  }
  return updateSettings(parsed.data);
});
