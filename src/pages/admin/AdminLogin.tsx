import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { loginAdmin } from '../../services/authService';
import { useAuth } from '../../stores/authStore';
import { toast } from '../../stores/toastStore';

export function AdminLogin() {
  const navigate = useNavigate();
  const setAdmin = useAuth((s) => s.setAdmin);
  const [email, setEmail] = useState('bella@fiad.ph');
  const [passcode, setPasscode] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const admin = await loginAdmin(email, passcode);
      if (!admin) {
        toast.error('Invalid credentials.');
        return;
      }
      setAdmin(admin.id);
      // Multi-tenant: choose which event to manage before the dashboard.
      navigate('/admin/events');
    } catch (err) {
      toast.error(`Sign-in failed: ${(err as Error).message}`);
    }
  };

  return (
    <div className="min-h-screen bg-plum text-cream flex flex-col p-6">
      <Link to="/" className="inline-flex items-center gap-1 text-cream/70 hover:text-cream text-sm">
        <ArrowLeft size={16} /> Back
      </Link>
      <div className="flex-1 flex items-center justify-center">
        <form onSubmit={submit} className="bg-white/5 border border-cream/10 backdrop-blur p-8 rounded-2xl w-full max-w-sm space-y-4">
        <div>
          <div className="font-display text-2xl">Admin Console</div>
          <div className="text-cream/60 text-sm">Sign in to manage the event.</div>
        </div>
        <div>
          <label className="text-cream/70 text-xs uppercase tracking-wider">Email</label>
          <input className="input !bg-white/10 !text-cream !border-cream/20" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="text-cream/70 text-xs uppercase tracking-wider">Passcode</label>
          <input type="password" className="input !bg-white/10 !text-cream !border-cream/20" value={passcode} onChange={(e) => setPasscode(e.target.value)} placeholder="Enter passcode" />
        </div>
          <button className="btn-primary w-full" type="submit">Sign in</button>
        </form>
      </div>
    </div>
  );
}
