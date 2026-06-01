import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginGuestWithAccessCode } from '../../services/guestService';
import { useAuth } from '../../stores/authStore';
import { toast } from '../../stores/toastStore';
import { ArrowLeft } from 'lucide-react';

export function GuestLogin() {
  const navigate = useNavigate();
  const setGuest = useAuth((s) => s.setGuest);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const guest = await loginGuestWithAccessCode(email, code);
      if (!guest) {
        toast.error('Invalid email or access code.');
        return;
      }
      setGuest(guest.id);
      toast.success(`Welcome back, ${guest.name.split(' ')[0]}!`);
      // If the user landed here because they scanned a booth QR before
      // signing in, resume that stamp now.
      let pending: string | null = null;
      try { pending = sessionStorage.getItem('fiad.pendingStampToken'); } catch { /* ignore */ }
      navigate(pending ? `/s/${pending}` : '/app/ticket');
    } catch (err) {
      toast.error((err as Error).message || 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <div className="px-6 pt-8 pb-4">
        <Link to="/" className="inline-flex items-center gap-1 text-plum/60 text-sm mb-4">
          <ArrowLeft size={16} /> Back
        </Link>
        <div className="font-display text-3xl text-plum">Welcome back</div>
        <p className="text-plum/60 text-sm mt-1">
          Sign in with the email and 6-character code from your welcome email.
        </p>
      </div>

      <form onSubmit={submit} className="flex-1 px-6 pb-10 space-y-4">
        <div>
          <label className="label">Email</label>
          <input
            required
            type="email"
            autoFocus
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
          />
        </div>
        <div>
          <label className="label">Access code</label>
          <input
            required
            type="text"
            inputMode="text"
            autoCapitalize="characters"
            spellCheck={false}
            className="input font-mono tracking-widest uppercase"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. K7N2QF"
            maxLength={8}
          />
          <div className="text-xs text-plum/50 mt-1">
            6-character code from your welcome email.
          </div>
        </div>

        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        <div className="text-center text-sm text-plum/60 pt-2">
          New here?{' '}
          <Link to="/app/register" className="text-coral font-medium">Register instead</Link>
        </div>
      </form>
    </div>
  );
}
