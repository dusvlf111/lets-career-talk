'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const DESKTOP_QUERY = '(min-width: 768px)';

export default function HomeRedirect() {
  const router = useRouter();
  useEffect(() => {
    if (window.matchMedia(DESKTOP_QUERY).matches) router.replace('/c/general');
  }, [router]);
  return (
    <div className="hidden flex-1 items-center justify-center text-xsmall14 text-neutral-45 md:flex">
      채널을 선택해 주세요
    </div>
  );
}
