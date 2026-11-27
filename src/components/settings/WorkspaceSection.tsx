'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff } from 'lucide-react';
import { useEffect, useState } from 'react';

import { UPLOAD_TYPE_GROUP_IDS, UPLOAD_TYPE_GROUPS, type UploadTypeGroup } from '@/lib/uploadTypes';

import { api, keys, type AdminSettings } from '../api';
import Button from '../ui/Button';
import { Field, Input } from '../ui/Input';
import { toast } from '../ui/toast';
import { Card } from './SettingsPage';

const SETTINGS_KEY = ['admin', 'settings'] as const;
const UPLOAD_MAX_MB_LIMIT = 100;

export default function WorkspaceSection() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: () => api<AdminSettings>('/api/admin/settings'),
  });
  const [draft, setDraft] = useState<AdminSettings | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setDraft(data);
  }, [data]);

  if (!draft || !data) return <p className="text-xsmall14 text-neutral-40">불러오는 중…</p>;

  const set = <K extends keyof AdminSettings>(key: K, value: AdminSettings[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  const toggleType = (g: UploadTypeGroup) =>
    set(
      'upload_types',
      draft.upload_types.includes(g) ? draft.upload_types.filter((t) => t !== g) : [...draft.upload_types, g],
    );

  const changed = (Object.keys(draft) as (keyof AdminSettings)[]).some(
    (k) => JSON.stringify(draft[k]) !== JSON.stringify(data[k]),
  );

  const save = async () => {
    setSaving(true);
    try {
      const { invite_code_from_env: _ignored, ...body } = draft;
      await api('/api/admin/settings', { method: 'PATCH', body });
      await Promise.all([
        qc.invalidateQueries({ queryKey: SETTINGS_KEY }),
        qc.invalidateQueries({ queryKey: keys.bootstrap }),
      ]);
      toast.success('설정을 저장했어요');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 pb-24">
      <Card title="기본 정보">
        <div className="space-y-4">
          <Field label="워크스페이스 이름" hint="사이드바와 로그인 화면, 브라우저 탭에 표시돼요.">
            <Input value={draft.workspace_name} maxLength={40} onChange={(e) => set('workspace_name', e.target.value)} />
          </Field>
          <Field
            label="입장 암호"
            hint={
              draft.invite_code
                ? '새로 가입하는 사람이 입력해야 하는 암호예요. 바꿔도 기존 멤버에게는 영향이 없어요.'
                : data.invite_code_from_env
                  ? '지금은 Vercel 환경변수(INVITE_CODE)의 암호를 쓰고 있어요. 여기에 입력하면 이 값이 우선 적용돼요.'
                  : '입장 암호가 없으면 아무도 가입할 수 없어요.'
            }
          >
            <div className="relative">
              <Input
                type={showCode ? 'text' : 'password'}
                value={draft.invite_code}
                onChange={(e) => set('invite_code', e.target.value)}
                placeholder={data.invite_code_from_env ? '환경변수 값 사용 중' : '입장 암호'}
                className="pr-11"
              />
              <button
                type="button"
                onClick={() => setShowCode((v) => !v)}
                aria-label={showCode ? '암호 숨기기' : '암호 보기'}
                className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center text-neutral-45"
              >
                {showCode ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </Field>
        </div>
      </Card>

      <Card title="권한" description="관리자(소유자 포함)는 아래 설정과 관계없이 모두 할 수 있어요.">
        <div className="divide-y divide-neutral-85">
          <Toggle
            label="멤버도 채널을 만들 수 있어요"
            checked={draft.member_can_create_channel}
            onChange={(v) => set('member_can_create_channel', v)}
          />
          <Toggle
            label="#공지 채널은 관리자만 글을 쓸 수 있어요"
            description="끄면 누구나 공지 채널에 글을 쓸 수 있어요. 스레드 답글은 항상 가능해요."
            checked={draft.announcement_admin_only}
            onChange={(v) => set('announcement_admin_only', v)}
          />
          <Toggle
            label="멤버가 자기 메시지를 삭제할 수 있어요"
            checked={draft.member_can_delete_message}
            onChange={(v) => set('member_can_delete_message', v)}
          />
        </div>
      </Card>

      <Card title="파일 업로드">
        <div className="divide-y divide-neutral-85">
          <Toggle label="파일 업로드 허용" checked={draft.upload_enabled} onChange={(v) => set('upload_enabled', v)} />
        </div>
        {draft.upload_enabled && (
          <div className="mt-4 space-y-5">
            <Field label="파일당 최대 용량 (MB)" hint={`1~${UPLOAD_MAX_MB_LIMIT}MB`}>
              <Input
                type="number"
                min={1}
                max={UPLOAD_MAX_MB_LIMIT}
                value={draft.upload_max_mb}
                onChange={(e) =>
                  set('upload_max_mb', Math.max(1, Math.min(UPLOAD_MAX_MB_LIMIT, Number(e.target.value) || 1)))
                }
                className="max-w-40"
              />
            </Field>
            <div>
              <div className="mb-2 text-xsmall14 font-semibold text-neutral-10">허용할 형식</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {UPLOAD_TYPE_GROUP_IDS.map((g) => (
                  <label
                    key={g}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2.5 text-xsmall14 ${
                      draft.upload_types.includes(g) ? 'border-primary-40 bg-primary-5' : 'border-neutral-80'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={draft.upload_types.includes(g)}
                      onChange={() => toggleType(g)}
                      className="size-4 accent-primary"
                    />
                    {UPLOAD_TYPE_GROUPS[g].label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* 저장 바 */}
      <div
        className={`fixed inset-x-0 bottom-0 z-20 border-t border-neutral-80 bg-white px-4 py-3 pb-[max(env(safe-area-inset-bottom),12px)] transition-transform ${
          changed ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="mx-auto flex max-w-4xl items-center justify-end gap-2">
          <span className="mr-auto text-xsmall14 text-neutral-40">저장하지 않은 변경사항이 있어요</span>
          <Button variant="outlined" onClick={() => setDraft(data)}>
            되돌리기
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? '저장 중…' : '저장'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-4 py-3.5 first:pt-0 last:pb-0">
      <span className="min-w-0 flex-1">
        <span className="block text-xsmall14 text-neutral-10">{label}</span>
        {description && <span className="mt-0.5 block text-xxsmall12 text-neutral-45">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-neutral-70'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-02 transition-transform ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </button>
    </label>
  );
}
