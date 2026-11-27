'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

import { ConfirmHost } from '@/components/ui/confirm';
import { ToastHost } from '@/components/ui/toast';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 5_000, retry: 1 } } }),
  );
  return (
    <QueryClientProvider client={client}>
      {children}
      <ConfirmHost />
      <ToastHost />
    </QueryClientProvider>
  );
}
