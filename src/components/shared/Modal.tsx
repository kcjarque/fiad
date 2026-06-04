import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { X } from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
};

const sizeMap = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-3xl' };

export function Modal({ open, onClose, title, children, size = 'md' }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-plum/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`w-full ${sizeMap[size]} bg-white rounded-2xl shadow-soft overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="px-4 pl-6 py-3 border-b border-plum/10 flex items-center justify-between gap-3">
            <h3 className="font-display text-xl text-plum truncate">{title}</h3>
            <button
              onClick={onClose}
              className="shrink-0 h-10 w-10 rounded-full text-plum/60 hover:text-plum hover:bg-plum/5 flex items-center justify-center transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        )}
        <div className="px-6 py-5 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
