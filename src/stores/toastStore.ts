import { create } from 'zustand';

export type Toast = {
  id: string;
  message: string;
  tone: 'success' | 'error' | 'info';
};

type ToastState = {
  toasts: Toast[];
  push: (t: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
};

export const useToasts = create<ToastState>((set) => ({
  toasts: [],
  push: (t) => {
    const id = Math.random().toString(36).slice(2, 10);
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }));
    }, 3000);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));

export const toast = {
  success: (message: string) => useToasts.getState().push({ message, tone: 'success' }),
  error: (message: string) => useToasts.getState().push({ message, tone: 'error' }),
  info: (message: string) => useToasts.getState().push({ message, tone: 'info' }),
};
