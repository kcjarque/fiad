import { NavLink, useNavigate } from 'react-router-dom';
import { Camera, ClipboardList, ShieldCheck, QrCode, LogOut, type LucideIcon } from 'lucide-react';
import { useAuth } from '../../stores/authStore';

const items: { to: string; label: string; Icon: LucideIcon }[] = [
  { to: '/store/scan', label: 'Scan', Icon: Camera },
  { to: '/store/history', label: 'History', Icon: ClipboardList },
  { to: '/store/overrides', label: 'Overrides', Icon: ShieldCheck },
  { to: '/store/passport-qr', label: 'Booth QR', Icon: QrCode },
];

export function StoreNav() {
  const navigate = useNavigate();
  const logout = useAuth((s) => s.logout);
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-plum/10 z-40">
      <div className="max-w-md mx-auto flex justify-between px-2 py-2">
        {items.map((i) => (
          <NavLink
            key={i.to}
            to={i.to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-1 text-xs ${
                isActive ? 'text-coral font-semibold' : 'text-plum/60'
              }`
            }
          >
            <i.Icon size={20} className="mb-0.5" />
            <span>{i.label}</span>
          </NavLink>
        ))}
        <button
          onClick={() => {
            logout();
            navigate('/');
          }}
          className="flex-1 flex flex-col items-center justify-center py-1 text-xs text-plum/60"
        >
          <LogOut size={20} className="mb-0.5" />
          <span>Logout</span>
        </button>
      </div>
    </nav>
  );
}
