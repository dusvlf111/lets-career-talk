import { FileArchive, FileSpreadsheet, FileText, FileVideo } from 'lucide-react';

import type { Attachment } from './api';
import { formatBytes } from './useUploads';

function FileIcon({ contentType }: { contentType: string }) {
  const cls = 'size-5';
  if (contentType.startsWith('video/')) return <FileVideo className={cls} />;
  if (contentType.includes('zip')) return <FileArchive className={cls} />;
  if (contentType.includes('sheet') || contentType.includes('excel') || contentType === 'text/csv') {
    return <FileSpreadsheet className={cls} />;
  }
  return <FileText className={cls} />;
}

export default function Attachments({ files }: { files: Attachment[] }) {
  if (files.length === 0) return null;
  const images = files.filter((f) => f.content_type.startsWith('image/'));
  const others = files.filter((f) => !f.content_type.startsWith('image/'));

  return (
    <div className="mt-1.5 space-y-1.5">
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((f) => (
            <a key={f.id} href={f.url} target="_blank" rel="noreferrer noopener" className="block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={f.url}
                alt={f.name}
                loading="lazy"
                className="max-h-72 max-w-full rounded-sm border object-contain sm:max-w-sm"
              />
            </a>
          ))}
        </div>
      )}
      {others.map((f) => (
        <a
          key={f.id}
          href={`${f.url}?download=1`}
          className="flex w-full max-w-sm items-center gap-3 rounded-sm border bg-white px-3 py-2 shadow-02 hover:border-primary-40"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xs bg-primary-10 text-primary">
            <FileIcon contentType={f.content_type} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{f.name}</span>
            <span className="text-xs text-neutral-40">{formatBytes(f.size)} · 다운로드</span>
          </span>
        </a>
      ))}
    </div>
  );
}
