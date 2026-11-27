import type { ButtonHTMLAttributes } from 'react';

/** 렛커 SolidButton / OutlinedButton 스타일 (apps/web/src/common/button) */
type Variant = 'primary' | 'secondary' | 'outlined' | 'danger' | 'ghost';
type Size = 'xs' | 'sm' | 'md';

const BASE =
  'inline-flex shrink-0 items-center justify-center gap-1 rounded-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-hover',
  secondary: 'bg-primary-10 text-primary hover:bg-primary-15',
  outlined: 'border border-neutral-70 bg-white text-neutral-20 hover:bg-neutral-95',
  danger: 'bg-system-error text-white hover:brightness-95',
  ghost: 'text-neutral-30 hover:bg-neutral-90',
};

const SIZES: Record<Size, string> = {
  xs: 'h-8 px-3 text-xsmall14',
  sm: 'h-9 px-3 text-xsmall14',
  md: 'h-10 px-4 text-xsmall14',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button {...rest} className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`} />;
}
