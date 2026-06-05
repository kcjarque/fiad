import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function PageShell({
  title,
  subtitle,
  children,
  right,
  back = true,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  right?: ReactNode;
  /** Show a back button at the top-left. Default true. Pass false on
   *  destination pages where back is meaningless. */
  back?: boolean;
}) {
  const navigate = useNavigate();
  return (
    <div className="min-h-full pb-28">
      {(title || subtitle || right || back) && (
        <div className="px-5 pt-6 pb-4 bg-gradient-to-b from-rose/25 to-transparent">
          {back && (
            <button
              onClick={() => navigate(-1)}
              aria-label="Back"
              className="inline-flex items-center gap-1 -ml-1 mb-2 px-2 py-1 rounded-lg text-plum/70 hover:text-plum hover:bg-plum/5 transition-colors text-sm"
            >
              <ArrowLeft size={18} /> Back
            </button>
          )}
          <div className="flex items-start justify-between gap-3">
            <div>
              {title && <h1 className="font-display text-2xl text-plum">{title}</h1>}
              {subtitle && <p className="text-plum/60 text-sm mt-1">{subtitle}</p>}
            </div>
            {right}
          </div>
        </div>
      )}
      <div className="px-5 space-y-4">{children}</div>
    </div>
  );
}
