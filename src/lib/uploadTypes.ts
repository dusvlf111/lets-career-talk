/** 업로드 허용 형식 그룹 (서버·클라이언트 공용) */
export const UPLOAD_TYPE_GROUPS = {
  image: { label: '이미지', types: ['image/*'] },
  document: {
    label: '문서 (PDF·오피스·텍스트)',
    types: [
      'application/pdf',
      'text/plain',
      'text/csv',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
  },
  hwp: {
    label: '한글 (hwp·hwpx)',
    types: ['application/x-hwp', 'application/haansofthwp', 'application/vnd.hancom.hwp', 'application/vnd.hancom.hwpx'],
  },
  video: { label: '영상 (mp4·mov)', types: ['video/mp4', 'video/quicktime'] },
  archive: { label: '압축 파일 (zip)', types: ['application/zip', 'application/x-zip-compressed'] },
  other: { label: '기타 형식', types: ['application/octet-stream'] },
} as const;

export type UploadTypeGroup = keyof typeof UPLOAD_TYPE_GROUPS;

export const UPLOAD_TYPE_GROUP_IDS = Object.keys(UPLOAD_TYPE_GROUPS) as UploadTypeGroup[];

export function contentTypesFor(groups: UploadTypeGroup[]) {
  return groups.flatMap((g) => UPLOAD_TYPE_GROUPS[g]?.types ?? []);
}

/** 브라우저에서 파일 형식이 허용 그룹에 드는지 */
export function isAllowedType(contentType: string, groups: UploadTypeGroup[]) {
  return contentTypesFor(groups).some((t) =>
    t.endsWith('/*') ? contentType.startsWith(t.slice(0, -1)) : t === contentType,
  );
}
