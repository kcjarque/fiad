import type { ReactNode } from 'react';

type Props = {
  imageUrl?: string;
  kicker?: string;
  title: string;
  subtitle?: string;
  children?: ReactNode;
  /** Hero height. `sm` ≈ 180px, `md` ≈ 240px, `lg` ≈ 320px, `xl` ≈ 400px */
  height?: 'sm' | 'md' | 'lg' | 'xl';
  /** Use dark plum gradient only (no photo). */
  solid?: boolean;
  /** Absolutely positioned content inside the hero (top-right corner) */
  topRight?: ReactNode;
  className?: string;
  /** Extra classes for the content wrapper. Use to push text up when the
   *  page overlaps the Hero from below (e.g. floating-card patterns). */
  contentClassName?: string;
};

const heightMap = {
  sm: 'h-44',
  md: 'h-56',
  lg: 'h-72',
  xl: 'h-[360px]',
};

export function Hero({
  imageUrl,
  kicker,
  title,
  subtitle,
  children,
  height = 'md',
  solid = false,
  topRight,
  className = '',
  contentClassName = '',
}: Props) {
  return (
    <div className={`relative overflow-hidden ${heightMap[height]} ${className}`}>
      {/* Background */}
      {solid || !imageUrl ? (
        <div className="absolute inset-0 bg-gradient-to-br from-rose via-coral to-[#8B2348]" />
      ) : (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${imageUrl})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-coral/20 via-coral/60 to-[#8B2348]/95" />
        </>
      )}

      {/* Subtle champagne accent line at bottom */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-champagne/60 to-transparent" />

      {/* Top-right slot */}
      {topRight && <div className="absolute top-4 right-5 z-10">{topRight}</div>}

      {/* Content. If the caller passed any pb-* override via contentClassName,
          drop the default pb-5 — Tailwind's CSS source order would otherwise
          let the smaller default win and silently undo the override. */}
      <div className={`relative h-full flex flex-col justify-end px-5 ${/\bpb-\S+/.test(contentClassName) ? '' : 'pb-5'} text-cream ${contentClassName}`}>
        {kicker && (
          <div className="text-[10px] uppercase tracking-[0.3em] text-champagne/90 mb-2">
            {kicker}
          </div>
        )}
        <h1 className="font-display text-[28px] leading-tight text-cream drop-shadow-sm">
          {title}
        </h1>
        {subtitle && (
          <p className="text-cream/80 text-sm mt-1 max-w-md leading-relaxed">{subtitle}</p>
        )}
        {children && <div className="mt-3">{children}</div>}
      </div>
    </div>
  );
}
