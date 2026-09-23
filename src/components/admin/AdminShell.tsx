import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu, X, LayoutDashboard, CalendarDays, Store, QrCode, Printer, ChartNoAxesCombined,
  Users, ScanLine, ClipboardList, ScanQrCode, Inbox, Mail, UserPlus, Receipt,
  SlidersHorizontal, Trophy, Route, Gift, Radio, Download, LogOut,
} from 'lucide-react';
import { useAuth } from '../../stores/authStore';
import { EventSwitcher } from './EventSwitcher';
import './AdminShell.css';

const groups = [
  { label: 'Workspace', links: [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/event', label: 'Event', icon: CalendarDays },
    { to: '/admin/stores', label: 'Vendors', icon: Store },
  ] },
  { label: 'Guests & outreach', links: [
    { to: '/admin/guests', label: 'Guests', icon: Users },
    { to: '/admin/checkin', label: 'Check-in', icon: ScanLine },
    { to: '/admin/attendance', label: 'Attendance log', icon: ClipboardList },
    { to: '/admin/inquiries', label: 'Inquiries', icon: Inbox },
    { to: '/admin/email-marketing', label: 'Email Marketing', icon: Mail },
    { to: '/admin/supplier-signups', label: 'Supplier Sign-ups', icon: UserPlus },
  ] },
  { label: 'Sales & reporting', links: [
    { to: '/admin/supplier-sales', label: 'Supplier Sales', icon: ChartNoAxesCombined },
    { to: '/admin/transactions', label: 'Transactions', icon: Receipt },
    { to: '/admin/export', label: 'Data Export', icon: Download },
    { to: '/admin/overrides', label: 'Overrides', icon: SlidersHorizontal },
  ] },
  { label: 'Event tools', links: [
    { to: '/admin/qr-generator', label: 'QR Generator', icon: QrCode },
    { to: '/admin/qr-cards', label: 'QR Cards (print all)', icon: Printer },
    { to: '/admin/raffle-scan', label: 'Raffle Scanner', icon: ScanQrCode },
    { to: '/admin/challenges', label: 'Challenges', icon: Trophy },
    { to: '/admin/walkthrough', label: 'Walkthrough', icon: Route },
    { to: '/admin/prizes', label: 'Raffle Prizes', icon: Gift },
    { to: '/admin/draw', label: 'Live Draw', icon: Radio },
  ] },
];

function SidebarContent({ onClose, onLogout }: { onClose?: () => void; onLogout: () => void }) {
  return (
    <>
      <div className="admin-brand">
        <img src="/logo.png" alt="Forever in a Day" />
        <span>ADMIN WORKSPACE</span>
        {onClose && <button className="admin-drawer-close" onClick={onClose} aria-label="Close menu"><X size={20} /></button>}
      </div>
      <div className="admin-event-scope"><EventSwitcher /></div>
      <nav className="admin-navigation" aria-label="Admin navigation">
        {groups.map((group) => (
          <div className="admin-nav-group" key={group.label}>
            <h2>{group.label}</h2>
            {group.links.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} onClick={onClose} className={({ isActive }) => `admin-nav-link${isActive ? ' is-active' : ''}`}>
                <Icon size={17} strokeWidth={1.7} aria-hidden="true" />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="admin-sidebar-footer">
        <button onClick={onLogout}><LogOut size={16} aria-hidden="true" /> Sign out</button>
        <span>Forever in a Day · Admin console</span>
      </div>
    </>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useAuth((s) => s.logout);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!drawerOpen) return;
    const menuButton = menuRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const drawer = drawerRef.current;
    const focusable = () => Array.from(drawer?.querySelectorAll<HTMLElement>('button, a[href], select') ?? []);
    focusable()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerOpen(false);
      if (event.key !== 'Tab') return;
      const elements = focusable();
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      menuButton?.focus();
    };
  }, [drawerOpen]);

  const currentLabel = groups.flatMap((group) => group.links).find((link) => link.to === location.pathname)?.label ?? 'Admin';
  const signOut = () => { logout(); navigate('/'); };

  return (
    <div className="min-h-screen lg:flex bg-cream">
      <header className="admin-mobile-header lg:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3">
        <button ref={menuRef} onClick={() => setDrawerOpen(true)} aria-label="Open menu" aria-expanded={drawerOpen} aria-controls="admin-mobile-menu" className="w-10 h-10 -ml-2 flex items-center justify-center rounded-lg hover:bg-plum/5"><Menu size={22} /></button>
        <div className="flex-1 text-sm font-semibold">{currentLabel}</div>
        <span className="text-plum/45 text-[10px] font-semibold tracking-widest">FIAD</span>
      </header>
      <aside className="admin-sidebar hidden lg:flex">
        <SidebarContent onLogout={signOut} />
      </aside>
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-plum/30 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <aside ref={drawerRef} id="admin-mobile-menu" role="dialog" aria-modal="true" aria-label="Admin menu" className="admin-sidebar admin-sidebar-drawer">
            <SidebarContent onClose={() => setDrawerOpen(false)} onLogout={signOut} />
          </aside>
        </div>
      )}
      <main className="flex-1 min-w-0 overflow-y-auto p-4 md:p-6 lg:p-8 text-plum">{children}</main>
    </div>
  );
}
