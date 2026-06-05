import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { registerGuest } from '../../services/guestService';
import { useAuth } from '../../stores/authStore';
import { toast } from '../../stores/toastStore';

export function Register() {
  const navigate = useNavigate();
  const setGuest = useAuth((s) => s.setGuest);
  const [form, setForm] = useState({ name: '', email: '', mobile: '', consent: false });
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Re-entry guard — a double-tap during the network roundtrip would
    // otherwise queue two registerGuest calls with the same email.
    if (busy) return;
    if (!form.consent) {
      toast.error('Please accept the data privacy notice to continue.');
      return;
    }
    setBusy(true);
    try {
      const guest = await registerGuest(form);
      setGuest(guest.id);
      toast.success('You are registered! Your ticket is ready.');
      navigate('/app/ticket');
    } catch (err) {
      toast.error(`Registration failed: ${(err as Error).message}`);
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <div className="px-6 pt-8 pb-4">
        <Link to="/" className="inline-flex items-center gap-1 text-plum/60 text-sm mb-4">
          <ArrowLeft size={16} /> Back
        </Link>
        <div className="font-display text-3xl text-plum">Welcome!</div>
        <p className="text-plum/60 text-sm mt-1">Register to get your digital ticket and start collecting raffle entries.</p>
      </div>
      <form onSubmit={submit} className="flex-1 px-6 pb-10 space-y-4">
        <div>
          <label className="label">Full name</label>
          <input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Juana Dela Cruz" />
        </div>
        <div>
          <label className="label">Email</label>
          <input required type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@email.com" />
        </div>
        <div>
          <label className="label">Mobile number</label>
          <input required className="input" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} placeholder="+63 9xx xxx xxxx" />
        </div>

        <label className="flex items-start gap-3 text-sm text-plum/80 bg-white rounded-xl p-4 shadow-card">
          <input
            type="checkbox"
            checked={form.consent}
            onChange={(e) => setForm({ ...form, consent: e.target.checked })}
            className="mt-1 h-4 w-4 accent-coral"
          />
          <span>
            I consent to the collection of my contact details for raffle fulfilment and event communications under RA 10173
            (Data Privacy Act). I can request deletion anytime.
          </span>
        </label>

        <button type="submit" disabled={busy} className="btn-primary w-full">
          Get my ticket
        </button>

        <div className="text-center text-sm text-plum/60 pt-2">
          Already registered?{' '}
          <Link to="/app/login" className="text-coral font-medium">Sign in</Link>
        </div>
      </form>
    </div>
  );
}
