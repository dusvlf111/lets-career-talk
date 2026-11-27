import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';

/** 렛커 Input v2 스타일 (apps/web/src/common/input/v2) */
const FIELD =
  'w-full min-w-0 rounded-md bg-neutral-95 p-3 text-xsmall14 text-neutral-0 outline-none ring-primary placeholder:text-neutral-50 focus:ring-1';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = '', ...rest }, ref) {
    return <input ref={ref} autoComplete="off" {...rest} className={`${FIELD} ${className}`} />;
  },
);

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function TextArea({ className = '', ...rest }, ref) {
    return <textarea ref={ref} {...rest} className={`${FIELD} resize-none ${className}`} />;
  },
);

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xsmall14 font-semibold text-neutral-10">{label}</span>
      {children}
      {hint && <span className="block text-xxsmall12 text-neutral-40">{hint}</span>}
    </label>
  );
}
