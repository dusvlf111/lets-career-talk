'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

/** 렛커 ConfirmDialog 셸과 같은 톤의 범용 모달 (Radix Dialog) */
export default function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'md' | 'lg';
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-fade-in" />
        <Dialog.Content
          aria-describedby={description ? undefined : undefined}
          className={`fixed inset-x-0 bottom-0 z-50 max-h-[90dvh] overflow-y-auto rounded-t-xl bg-white p-6 pb-[max(env(safe-area-inset-bottom),24px)] shadow-05 focus:outline-none data-[state=open]:animate-fade-in-up md:inset-x-auto md:top-1/2 md:bottom-auto md:left-1/2 md:w-[calc(100%-2rem)] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lg md:pb-6 md:shadow-04 md:data-[state=open]:animate-fade-in ${
            size === 'lg' ? 'max-w-xl' : 'max-w-md'
          }`}
        >
          <Dialog.Title className="pr-8 text-small18 font-semibold text-neutral-0">{title}</Dialog.Title>
          {description ? (
            <Dialog.Description className="mt-1 text-xsmall14 text-neutral-30">{description}</Dialog.Description>
          ) : (
            <Dialog.Description className="sr-only">{typeof title === 'string' ? title : ''}</Dialog.Description>
          )}
          {children && <div className="mt-5">{children}</div>}
          {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
          <Dialog.Close
            aria-label="닫기"
            className="absolute top-4 right-4 flex size-8 items-center justify-center rounded-full text-neutral-40 hover:bg-neutral-95 hover:text-neutral-0"
          >
            <X className="size-5" />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
