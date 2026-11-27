'use client';

import * as Dialog from '@radix-ui/react-dialog';

/** 모바일 하단 시트 (Radix Dialog) */
export default function BottomSheet({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-fade-in" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 rounded-t-xl bg-white pb-[max(env(safe-area-inset-bottom),12px)] shadow-05 focus:outline-none data-[state=open]:animate-fade-in-up"
        >
          <Dialog.Title className="sr-only">{title}</Dialog.Title>
          <div className="mx-auto mt-2 mb-1 h-1 w-10 rounded-full bg-neutral-75" />
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function SheetAction({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-4 px-5 py-3.5 text-left text-xsmall16 active:bg-neutral-95 ${
        danger ? 'text-system-error' : 'text-neutral-10'
      }`}
    >
      <span className={danger ? 'text-system-error' : 'text-neutral-40'}>{icon}</span>
      {label}
    </button>
  );
}
