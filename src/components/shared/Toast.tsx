import { useToasts } from '../../stores/toastStore';

export function ToastHost() {
  const { toasts, dismiss } = useToasts();
  return (
    <div className="fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map((t) => {
        const tone =
          t.tone === 'success'
            ? 'bg-emerald-600'
            : t.tone === 'error'
              ? 'bg-red-600'
              : 'bg-plum';
        return (
          <div
            key={t.id}
            onClick={() => dismiss(t.id)}
            className={`${tone} text-white px-5 py-3 rounded-xl shadow-soft pointer-events-auto cursor-pointer max-w-xs text-sm`}
          >
            {t.message}
          </div>
        );
      })}
    </div>
  );
}
