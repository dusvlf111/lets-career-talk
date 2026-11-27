import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';

import { currentUser } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { contentTypesFor } from '@/lib/uploadTypes';

const BYTES_PER_MB = 1024 * 1024;

/** 브라우저가 Blob에 직접 올릴 수 있도록 단기 토큰을 발급한다 (4.5MB 함수 제한 우회) */
export async function POST(req: Request) {
  const body = (await req.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => {
        const [user, settings] = await Promise.all([currentUser(), getSettings()]);
        if (!user) throw new Error('로그인이 필요합니다.');
        // 워크스페이스 설정의 업로드 허용 여부·용량·형식을 그대로 적용
        if (!settings.upload_enabled) throw new Error('파일 업로드가 꺼져 있어요.');
        return {
          allowedContentTypes: contentTypesFor(settings.upload_types),
          maximumSizeInBytes: settings.upload_max_mb * BYTES_PER_MB,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ uid: user.id }),
        };
      },
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
