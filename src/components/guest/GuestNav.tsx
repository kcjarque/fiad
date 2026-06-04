import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  Ticket,
  Dices,
  BookHeart,
  Trophy,
  Map,
  CalendarClock,
  MoreHorizontal,
  LogOut,
  ScanLine,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../stores/authStore';

const items: { to: string; label: string; Icon: LucideIcon }[] = [
  { to: '/app/ticket', label: 'Ticket', Icon: Ticket },
  { to: '/app/raffle', label: 'Raffle', Icon: Dices },
  { to: '/app/passport', label: 'Passport', Icon: BookHeart },
  { to: '/app/challenges', label: 'Quests', Icon: Trophy },
  { to: '/app/schedule', label: 'Schedule', Icon: CalendarClock },
  { to: '/app/walkthrough', label: 'Event', Icon: Map },
];

export function GuestNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const logout = useAuth((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate('/', { replace: true });
  };

  return (
    <>
      <nav className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-plum/10 z-40">
        <div className="max-w-md mx-auto flex justify-between px-1 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
          {items.map((i) => (
            <NavLink
              key={i.to}
              to={i.to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center min-h-[3rem] gap-0.5 rounded-xl transition-colors ${
                  isActive ? 'text-coral' : 'text-plum/55 hover:text-plum/80'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <i.Icon size={20} strokeWidth={isActive ? 2.4 : 2} />
                  <span className={`text-[10px] whitespace-nowrap leading-none ${isActive ? 'font-semibold' : 'font-medium'}`}>
                    {i.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
          <button
            onClick={() => setMenuOpen(true)}
            className="flex-1 flex flex-col items-center justify-center min-h-[3rem] gap-0.5 rounded-xl text-plum/55 hover:text-plum/80 transition-colors"
            aria-label="More"
          >
            <MoreHorizontal size={20} />
            <span className="text-[10px] whitespace-nowrap leading-none font-medium">More</span>
          </button>
        </div>
      </nav>

      {/* Bottom sheet */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-50 bg-plum/40 backdrop-blur-sm flex items-end"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="w-full max-w-md mx-auto bg-white rounded-t-3xl shadow-soft p-4 pb-8 animate-[slideUp_0.2s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="font-display text-plum text-lg">Menu</div>
              <button onClick={() => setMenuOpen(false)} className="text-plum/60 p-1" aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-1">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  navigate('/app/scan');
                }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-plum/5 text-left"
              >
                <div className="h-10 w-10 rounded-full bg-coral/10 text-coral flex items-center justify-center">
                  <ScanLine size={18} />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-plum">Scan booth QR</div>
                  <div className="text-xs text-plum/60">Stamp your passport</div>
                </div>
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-plum/5 text-left"
              >
                <div className="h-10 w-10 rounded-full bg-plum/10 text-plum flex items-center justify-center">
                  <LogOut size={18} />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-plum">Sign out</div>
                  <div className="text-xs text-plum/60">End this session</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
