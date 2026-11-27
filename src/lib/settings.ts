import 'server-only';

import { z } from 'zod';

import { all, run } from './db';
import { memo } from './memo';
import { UPLOAD_TYPE_GROUP_IDS, type UploadTypeGroup } from './uploadTypes';

/** 슬랙의 워크스페이스 설정에 해당하는 값들 */
export const settingsSchema = z.object({
  workspace_name: z.string().trim().min(1).max(40),
  invite_code: z.string().trim().max(100),
  member_can_create_channel: z.boolean(),
  announcement_admin_only: z.boolean(),
  member_can_delete_message: z.boolean(),
  upload_enabled: z.boolean(),
  upload_max_mb: z.number().int().min(1).max(100),
  upload_types: z.array(z.enum(UPLOAD_TYPE_GROUP_IDS as [UploadTypeGroup, ...UploadTypeGroup[]])),
});

export type Settings = z.infer<typeof settingsSchema>;

const DEFAULT_UPLOAD_MAX_MB = 20;

function defaults(): Settings {
  return {
    workspace_name: process.env.NEXT_PUBLIC_COHORT_NAME ?? '렛츠커리어',
    // 관리자가 바꾸기 전까지는 Vercel 환경변수 INVITE_CODE를 쓴다
    invite_code: '',
    member_can_create_channel: true,
    announcement_admin_only: true,
    member_can_delete_message: true,
    upload_enabled: true,
    upload_max_mb: DEFAULT_UPLOAD_MAX_MB,
    upload_types: [...UPLOAD_TYPE_GROUP_IDS],
  };
}

/** 인스턴스별 캐시라 다른 인스턴스의 변경은 최대 이 시간 뒤에 반영된다 */
const SETTINGS_CACHE_TTL_MS = 10 * 1000;
const cache = memo<Settings>(SETTINGS_CACHE_TTL_MS);
const CACHE_KEY = 'settings';

async function loadSettings(): Promise<Settings> {
  {
    const rows = await all<{ key: string; value: string }>('SELECT key, value FROM settings');
    const stored: Record<string, unknown> = {};
    for (const r of rows) {
      try {
        stored[r.key] = JSON.parse(r.value);
      } catch {
        // 깨진 값은 무시하고 기본값 사용
      }
    }
    const merged = { ...defaults(), ...stored };
    const parsed = settingsSchema.safeParse(merged);
    return parsed.success ? parsed.data : defaults();
  }
}

export async function getSettings(): Promise<Settings> {
  return cache.get(CACHE_KEY, loadSettings);
}

export async function updateSettings(patch: Partial<Settings>) {
  for (const [key, value] of Object.entries(patch)) {
    await run(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
      [key, JSON.stringify(value)],
    );
  }
  cache.delete(CACHE_KEY);
  return getSettings();
}

/** 가입은 드물고 보안상 중요하므로 캐시 없이 항상 DB에서 읽는다 */
export async function effectiveInviteCode() {
  const s = await loadSettings();
  return s.invite_code || process.env.INVITE_CODE || '';
}

/** 모든 참여자에게 보내도 되는 설정 (입장 암호 제외) */
export function publicSettings(s: Settings) {
  const { invite_code: _secret, ...rest } = s;
  return rest;
}
