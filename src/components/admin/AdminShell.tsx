import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../../stores/authStore';

const sections = [
  { to: '/admin/dashboard', label: 'Dashboard' },
  { to: '/admin/event', label: 'Event' },
  { to: '/admin/stores', label: 'Vendors' },
  { to: '/admin/guests', label: 'Guests' },
  { to: '/admin/transactions', label: 'Transactions' },
  { to: '/admin/overrides', label: 'Overrides' },
  { to: '/admin/challenges', label: 'Challenges' },
  { to: '/admin/walkthrough', label: 'Walkthrough' },
  { to: '/admin/prizes', label: 'Prizes' },
  { to: '/admin/draw', label: 'Live Draw' },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useAuth((s) => s.logout);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close drawer on navigation
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  const currentLabel = sections.find((s) => s.to === location.pathname)?.label ?? 'Admin';

  return (
    <div className="min-h-screen lg:flex bg-cream">
      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 bg-plum text-cream flex items-center gap-3 px-4 py-3 shadow-soft">
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          className="w-10 h-10 -ml-2 flex items-center justify-center rounded-lg hover:bg-cream/10"
        >
          <Menu size={22} />
        </button>
        <div className="flex-1 font-display text-lg leading-tight">{currentLabel}</div>
        <div className="text-cream/70 text-xs uppercase tracking-wider">FIAD</div>
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 bg-plum text-cream p-5 flex-col">
        <div className="mb-6">
          <div className="bg-cream rounded-xl p-3 mb-2">
            <img src="/logo.png" alt="Forever in a Day" className="w-full h-auto" />
          </div>
          <div className="text-cream/60 text-xs uppercase tracking-wider">Admin Console</div>
        </div>
        <nav className="flex-1 space-y-1 text-sm">
          {sections.map((s) => (
            <NavLink
              key={s.to}
              to={s.to}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-lg ${
                  isActive ? 'bg-coral text-white' : 'hover:bg-cream/10 text-cream/85'
                }`
              }
            >
              {s.label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={() => {
            logout();
            navigate('/');
          }}
          className="mt-6 text-xs text-cream/70 hover:text-cream text-left"
        >
          Sign out
        </button>
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50" role="dialog">
          <div
            className="absolute inset-0 bg-plum/60 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85%] bg-plum text-cream p-5 flex flex-col shadow-soft">
            <div className="flex items-start justify-between mb-6 gap-3">
              <div className="flex-1">
                <div className="bg-cream rounded-xl p-3 mb-2">
                  <img src="/logo.png" alt="Forever in a Day" className="w-full h-auto" />
                </div>
                <div className="text-cream/60 text-xs uppercase tracking-wider">Admin Console</div>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="text-cream/70 p-1"
              >
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 space-y-1 text-sm overflow-y-auto">
              {sections.map((s) => (
                <NavLink
                  key={s.to}
                  to={s.to}
                  className={({ isActive }) =>
                    `block px-3 py-2 rounded-lg ${
                      isActive ? 'bg-coral text-white' : 'hover:bg-cream/10 text-cream/85'
                    }`
                  }
                >
                  {s.label}
                </NavLink>
              ))}
            </nav>
            <button
              onClick={() => {
                logout();
                navigate('/');
              }}
              className="mt-6 text-sm text-cream/70 hover:text-cream text-left"
            >
              Sign out
            </button>
          </aside>
        </div>
      )}

      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 text-plum">{children}</main>
    </div>
  );
}
