'use client';

import { usePathname } from 'next/navigation';
import { createContext, useContext, useState } from 'react';

import { useBootstrap } from './api';
import RealtimeProvider from './Realtime';
import Sidebar from './Sidebar';

type UiCtx = {
  threadId: string | null;
  openThread: (id: string | null) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
};

const Ctx = createContext<UiCtx>({
  threadId: null,
  openThread: () => {},
  sidebarOpen: false,
  setSidebarOpen: () => {},
});

export const useUi = () => useContext(Ctx);

export default function Workspace({ children }: { children: React.ReactNode }) {
  const { data, error } = useBootstrap();
  const [threadId, openThread] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // 모바일: /c 는 홈(목록) 화면, /c/[id] 는 대화 화면을 각각 전체 화면으로 (슬랙 모바일 방식)
  const isHome = usePathname() === '/c';

  if (error) {
    return (
      <div className="flex h-dvh items-center justify-center text-sm text-system-error">
        {error.message}
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex h-dvh items-center justify-center bg-white text-neutral-40">
        불러오는 중…
      </div>
    );
  }

  return (
    <Ctx.Provider value={{ threadId, openThread, sidebarOpen, setSidebarOpen }}>
      <RealtimeProvider bootstrap={data}>
        <div className="flex h-dvh overflow-hidden bg-white">
          <div className={`${isHome ? 'flex' : 'hidden'} min-w-0 flex-1 md:flex md:flex-none`}>
            <Sidebar />
          </div>
          <div className={`${isHome ? 'hidden' : 'flex'} min-w-0 flex-1 md:flex`}>{children}</div>
        </div>
      </RealtimeProvider>
    </Ctx.Provider>
  );
}
