'use client';

import { useState } from 'react';

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const MAX_FILES = 10;

export type PendingUpload = {
  key: string;
  name: string;
  size: number;
  contentType: string;
  progress: number;
  previewUrl: string | null;
  url: string | null;
  error: string | null;
};

/** 파일을 고르는 즉시 Vercel Blob으로 직접 업로드하고 결과 URL을 모아둔다 */
export function useUploads() {
  const [uploads, setUploads] = useState<PendingUpload[]>([]);

  const patch = (key: string, next: Partial<PendingUpload>) =>
    setUploads((list) => list.map((u) => (u.key === key ? { ...u, ...next } : u)));

  const add = async (files: File[]) => {
    const room = MAX_FILES - uploads.length;
    if (files.length > room) alert(`파일은 한 번에 ${MAX_FILES}개까지 보낼 수 있어요.`);
    const accepted = files.slice(0, Math.max(0, room));

    const { upload } = await import('@vercel/blob/client');
    await Promise.all(
      accepted.map(async (file) => {
        const key = crypto.randomUUID();
        const contentType = file.type || 'application/octet-stream';
        const tooBig = file.size > MAX_FILE_SIZE_BYTES;
        setUploads((list) => [
          ...list,
          {
            key,
            name: file.name,
            size: file.size,
            contentType,
            progress: 0,
            previewUrl: contentType.startsWith('image/') ? URL.createObjectURL(file) : null,
            url: null,
            error: tooBig ? '20MB 이하만 올릴 수 있어요' : null,
          },
        ]);
        if (tooBig) return;
        try {
          const blob = await upload(`uploads/${file.name}`, file, {
            access: 'public',
            handleUploadUrl: '/api/upload',
            contentType,
            onUploadProgress: ({ percentage }) => patch(key, { progress: percentage }),
          });
          patch(key, { url: blob.url, progress: 100 });
        } catch (e) {
          console.error(e);
          patch(key, { error: '업로드에 실패했어요' });
        }
      }),
    );
  };

  const remove = (key: string) =>
    setUploads((list) => {
      const target = list.find((u) => u.key === key);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return list.filter((u) => u.key !== key);
    });

  const clear = () => {
    uploads.forEach((u) => u.previewUrl && URL.revokeObjectURL(u.previewUrl));
    setUploads([]);
  };

  const ready = uploads.filter((u) => u.url && !u.error);
  const busy = uploads.some((u) => !u.url && !u.error);

  return {
    uploads,
    add,
    remove,
    clear,
    busy,
    attachments: ready.map((u) => ({
      url: u.url!,
      name: u.name,
      content_type: u.contentType,
      size: u.size,
    })),
  };
}

export function formatBytes(size: number) {
  if (size < 1024) return `${size}B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)}KB`;
  return `${(size / 1024 / 1024).toFixed(1)}MB`;
}
