'use client';

import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { useState, useSyncExternalStore } from 'react';

import Button from './Button';

/**
 * window.confirm 대체. 렛커 ConfirmDialog(packages/ui/src/AlertDialog) 스타일.
 * 사용: if (await confirm({ title: '삭제할까요?', variant: 'destructive' })) { ... }
 */
type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
};

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };

let current: Pending | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function confirm(options: ConfirmOptions) {
  return new Promise<boolean>((resolve) => {
    current?.resolve(false);
    current = { ...options, resolve };
    emit();
  });
}

function close(ok: boolean) {
  current?.resolve(ok);
  current = null;
  emit();
}

export function ConfirmHost() {
  const pending = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => null,
  );
  const [shown, setShown] = useState<Pending | null>(null);
  if (pending && pending !== shown) setShown(pending);
  const data = pending ?? shown;

  return (
    <AlertDialog.Root open={Boolean(pending)} onOpenChange={(open) => !open && close(false)}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-[60] bg-black/50 data-[state=open]:animate-fade-in" />
        <AlertDialog.Content className="fixed inset-x-0 bottom-0 z-[60] rounded-t-xl bg-white p-6 pb-[max(env(safe-area-inset-bottom),24px)] shadow-05 focus:outline-none data-[state=open]:animate-fade-in-up md:inset-x-auto md:top-1/2 md:bottom-auto md:left-1/2 md:w-[calc(100%-2rem)] md:max-w-md md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lg md:pb-6 md:shadow-04 md:data-[state=open]:animate-fade-in">
          <AlertDialog.Title className="text-small18 font-semibold text-neutral-0">{data?.title}</AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-xsmall14 text-neutral-30">
            {data?.description}
          </AlertDialog.Description>
          <div className="mt-6 grid grid-cols-2 gap-2 md:flex md:justify-end">
            <AlertDialog.Cancel asChild>
              <Button variant="outlined">{data?.cancelLabel ?? '취소'}</Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button variant={data?.variant === 'destructive' ? 'danger' : 'primary'} onClick={() => close(true)}>
                {data?.confirmLabel ?? '확인'}
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
