import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Session =
  | { role: 'guest'; guestId: string }
  | { role: 'store'; storeId: string }
  | { role: 'admin'; adminId: string }
  | { role: null };

type AuthState = {
  session: Session;
  setGuest: (guestId: string) => void;
  setStore: (storeId: string) => void;
  setAdmin: (adminId: string) => void;
  logout: () => void;
};

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      session: { role: null },
      setGuest: (guestId) => set({ session: { role: 'guest', guestId } }),
      setStore: (storeId) => set({ session: { role: 'store', storeId } }),
      setAdmin: (adminId) => set({ session: { role: 'admin', adminId } }),
      logout: () => set({ session: { role: null } }),
    }),
    { name: 'fiad.auth' },
  ),
);
