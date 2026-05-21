import type { ReactNode } from 'react';

export function PageShell({
  title,
  subtitle,
  children,
  right,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="min-h-full pb-28">
      {(title || subtitle || right) && (
        <div className="px-5 pt-6 pb-3 flex items-start justify-between gap-3">
          <div>
            {title && <h1 className="font-display text-2xl text-plum">{title}</h1>}
            {subtitle && <p className="text-plum/60 text-sm mt-1">{subtitle}</p>}
          </div>
          {right}
        </div>
      )}
      <div className="px-5 space-y-4">{children}</div>
    </div>
  );
}
