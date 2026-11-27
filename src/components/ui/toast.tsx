'use client';

import { CircleAlert, CircleCheck } from 'lucide-react';
import { useEffect, useSyncExternalStore } from 'react';

/** window.alert 대체. 화면 하단에 잠깐 떠 있다 사라지는 토스트 */
type Toast = { id: number; message: string; variant: 'error' | 'success' };

const TOAST_DURATION_MS = 3_000;
let toasts: Toast[] = [];
let seq = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function push(message: string, variant: Toast['variant']) {
  toasts = [...toasts, { id: ++seq, message, variant }];
  emit();
}

export const toast = {
  error: (message: string) => push(message, 'error'),
  success: (message: string) => push(message, 'success'),
};

function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

function ToastItem({ t }: { t: Toast }) {
  useEffect(() => {
    const timer = setTimeout(() => dismiss(t.id), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [t.id]);
  const Icon = t.variant === 'error' ? CircleAlert : CircleCheck;
  return (
    <div
      role="status"
      className="pointer-events-auto flex animate-fade-in-up items-center gap-2 rounded-md bg-neutral-0/90 px-4 py-3 text-xsmall14 text-white shadow-04"
    >
      <Icon className={`size-5 shrink-0 ${t.variant === 'error' ? 'text-requirement' : 'text-secondary'}`} />
      {t.message}
    </div>
  );
}

export function ToastHost() {
  const list = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => toasts,
    () => toasts,
  );
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[70] flex flex-col items-center gap-2 px-4">
      {list.map((t) => (
        <ToastItem key={t.id} t={t} />
      ))}
    </div>
  );
}
