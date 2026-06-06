import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { Register } from './pages/guest/Register';
import { GuestLogin } from './pages/guest/Login';
import { Ticket } from './pages/guest/Ticket';
import { Raffle } from './pages/guest/Raffle';
import { Passport } from './pages/guest/Passport';
import { Challenges } from './pages/guest/Challenges';
import { Walkthrough } from './pages/guest/Walkthrough';
import { Scan } from './pages/guest/Scan';
import { QrSignIn } from './pages/guest/QrSignIn';
import { StampLink } from './pages/guest/StampLink';
import { GuestNav } from './components/guest/GuestNav';
import { StoreLogin } from './pages/store/StoreLogin';
import { StoreScan } from './pages/store/StoreScan';
import { StoreHistory } from './pages/store/StoreHistory';
import { StoreOverrides } from './pages/store/StoreOverrides';
import { StorePassportQR } from './pages/store/StorePassportQR';
import { StoreNav } from './components/store/StoreNav';
import { AdminLogin } from './pages/admin/AdminLogin';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminEvent } from './pages/admin/AdminEvent';
import { AdminStores } from './pages/admin/AdminStores';
import { AdminGuests } from './pages/admin/AdminGuests';
import { AdminTransactions } from './pages/admin/AdminTransactions';
import { AdminOverrides } from './pages/admin/AdminOverrides';
import { AdminChallenges } from './pages/admin/AdminChallenges';
import { AdminWalkthrough } from './pages/admin/AdminWalkthrough';
import { AdminPrizes } from './pages/admin/AdminPrizes';
import { AdminDraw } from './pages/admin/AdminDraw';
import { AdminDrawStage } from './pages/admin/AdminDrawStage';
import { ToastHost } from './components/shared/Toast';
import { useAuth } from './stores/authStore';

function GuestLayout() {
  return (
    <div className="max-w-md mx-auto min-h-screen bg-cream">
      <Outlet />
      <GuestNav />
    </div>
  );
}

function StoreLayout() {
  return (
    <div className="max-w-md mx-auto min-h-screen bg-cream">
      <Outlet />
      <StoreNav />
    </div>
  );
}

function RequireGuest({ children }: { children: React.ReactNode }) {
  const session = useAuth((s) => s.session);
  if (session.role !== 'guest') return <Navigate to="/app/register" replace />;
  return <>{children}</>;
}

function RequireStore({ children }: { children: React.ReactNode }) {
  const session = useAuth((s) => s.session);
  if (session.role !== 'store') return <Navigate to="/store/login" replace />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const session = useAuth((s) => s.session);
  if (session.role !== 'admin') return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastHost />
      <Routes>
        <Route path="/" element={<Landing />} />

        {/* Guest */}
        <Route path="/app/register" element={<div className="max-w-md mx-auto bg-cream min-h-screen"><Register /></div>} />
        <Route path="/app/login" element={<div className="max-w-md mx-auto bg-cream min-h-screen"><GuestLogin /></div>} />
        <Route path="/app/qr/:token" element={<QrSignIn />} />
        <Route path="/s/:token" element={<StampLink />} />
        <Route element={<GuestLayout />}>
          <Route path="/app/ticket" element={<RequireGuest><Ticket /></RequireGuest>} />
          <Route path="/app/raffle" element={<RequireGuest><Raffle /></RequireGuest>} />
          <Route path="/app/passport" element={<RequireGuest><Passport /></RequireGuest>} />
          <Route path="/app/challenges" element={<RequireGuest><Challenges /></RequireGuest>} />
          <Route path="/app/walkthrough" element={<RequireGuest><Walkthrough /></RequireGuest>} />
          <Route path="/app/schedule" element={<RequireGuest><Walkthrough initialTab="schedule_item" /></RequireGuest>} />
          <Route path="/app/scan" element={<RequireGuest><Scan /></RequireGuest>} />
        </Route>

        {/* Store */}
        <Route path="/store/login" element={<StoreLogin />} />
        <Route element={<StoreLayout />}>
          <Route path="/store/scan" element={<RequireStore><StoreScan /></RequireStore>} />
          <Route path="/store/history" element={<RequireStore><StoreHistory /></RequireStore>} />
          <Route path="/store/overrides" element={<RequireStore><StoreOverrides /></RequireStore>} />
          <Route path="/store/passport-qr" element={<RequireStore><StorePassportQR /></RequireStore>} />
        </Route>

        {/* Admin */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
        <Route path="/admin/event" element={<RequireAdmin><AdminEvent /></RequireAdmin>} />
        <Route path="/admin/stores" element={<RequireAdmin><AdminStores /></RequireAdmin>} />
        <Route path="/admin/guests" element={<RequireAdmin><AdminGuests /></RequireAdmin>} />
        <Route path="/admin/transactions" element={<RequireAdmin><AdminTransactions /></RequireAdmin>} />
        <Route path="/admin/overrides" element={<RequireAdmin><AdminOverrides /></RequireAdmin>} />
        <Route path="/admin/challenges" element={<RequireAdmin><AdminChallenges /></RequireAdmin>} />
        <Route path="/admin/walkthrough" element={<RequireAdmin><AdminWalkthrough /></RequireAdmin>} />
        <Route path="/admin/prizes" element={<RequireAdmin><AdminPrizes /></RequireAdmin>} />
        <Route path="/admin/draw" element={<RequireAdmin><AdminDraw /></RequireAdmin>} />
        {/* Projector / LCD presentation window — opened from /admin/draw.
            Intentionally outside the AdminShell so it fills the whole window. */}
        <Route path="/admin/draw/stage" element={<RequireAdmin><AdminDrawStage /></RequireAdmin>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
