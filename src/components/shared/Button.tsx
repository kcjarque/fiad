import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
  fullWidth?: boolean;
};

const map: Record<Variant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn bg-red-600 text-white hover:brightness-110',
};

export function Button({ variant = 'primary', fullWidth, className = '', ...rest }: Props) {
  return (
    <button
      {...rest}
      className={`${map[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
    />
  );
}
