import type { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card text-center py-10">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-champagne/40 text-plum mb-3">
        <Sparkles size={24} />
      </div>
      <h3 className="font-display text-xl text-plum mb-1">{title}</h3>
      {description && <p className="text-plum/60 text-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
