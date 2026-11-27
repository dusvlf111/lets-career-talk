'use client';

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
        <div className="flex h-dvh overflow-hidden">
          <Sidebar />
          <div className="flex min-w-0 flex-1">{children}</div>
        </div>
      </RealtimeProvider>
    </Ctx.Provider>
  );
}
