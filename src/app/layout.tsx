import type { Metadata, Viewport } from 'next';

import './globals.css';
import Providers from './providers';

export const metadata: Metadata = {
  title: `${process.env.NEXT_PUBLIC_COHORT_NAME ?? '렛츠커리어'} 톡방`,
  description: '렛츠커리어 참여자 전용 톡방',
};

export const viewport: Viewport = { themeColor: '#3f0e40' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
