import { useState } from 'react';
import { CheckCircle2, Sparkles, ArrowRight } from 'lucide-react';
import { registerGuest } from '../services/guestService';
import { createInquiry } from '../services/inquiryService';
import { SEASON_2_EVENT_ID } from '../stores/eventStore';
import { Modal } from '../components/shared/Modal';
import { toast } from '../stores/toastStore';

export function RegisterSeason2() {
  const [form, setForm] = useState({ name: '', email: '', mobile: '', consent: false });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!form.consent) {
      toast.error('Please accept the data privacy notice to continue.');
      return;
    }
    setBusy(true);
    try {
      // Explicitly tag this registration to Season 2 — the public visitor's
      // browser still defaults its selected event to Season 1.
      await registerGuest(
        { name: form.name, email: form.email, mobile: form.mobile },
        SEASON_2_EVENT_ID,
      );
      setDone(true);
    } catch (err) {
      toast.error(`Registration failed: ${(err as Error).message}`);
      setBusy(false);
    }
  };

  if (done) return <ThankYou name={form.name} prefill={form} />;

  return (
    <div className="min-h-[100svh] bg-gradient-to-b from-cream via-rose/20 to-rose/40 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 max-w-md mx-auto w-full">
        <div className="text-center mb-8">
          <img
            src="/logo.png"
            alt="Forever in a Day"
            className="mx-auto w-full max-w-[240px] h-auto"
          />
          <div className="mt-3 chip">Season 2 — Register your interest</div>
          <p className="text-plum/70 mt-3 text-sm">
            Be the first to know about our next wedding &amp; debut bazaar. Sign up below
            and we’ll keep you posted.
          </p>
        </div>

        <form onSubmit={submit} className="w-full space-y-4 bg-white rounded-2xl shadow-card p-6">
          <div>
            <label className="label">Full name</label>
            <input
              required
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Juana Dela Cruz"
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              required
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@email.com"
            />
          </div>
          <div>
            <label className="label">Mobile number</label>
            <input
              required
              className="input"
              value={form.mobile}
              onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              placeholder="+63 9xx xxx xxxx"
            />
          </div>

          <label className="flex items-start gap-3 text-xs text-plum/70 bg-cream/60 rounded-xl p-3">
            <input
              type="checkbox"
              checked={form.consent}
              onChange={(e) => setForm({ ...form, consent: e.target.checked })}
              className="mt-0.5 h-4 w-4 accent-coral"
            />
            <span>
              I consent to the collection of my contact details for event updates and
              communications under RA 10173 (Data Privacy Act). I can request deletion anytime.
            </span>
          </label>

          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? 'Registering…' : 'Sign me up'}
          </button>
        </form>
      </div>

      <footer className="text-center pb-8 px-6">
        <div className="text-[10px] text-plum/40">Forever in a Day © 2026</div>
      </footer>
    </div>
  );
}

function ThankYou({
  name,
  prefill,
}: {
  name: string;
  prefill: { name: string; email: string; mobile: string };
}) {
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const firstName = name.trim().split(' ')[0] || 'there';

  return (
    <div className="min-h-[100svh] bg-gradient-to-b from-cream via-rose/20 to-rose/40 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 max-w-md mx-auto w-full text-center">
        <div className="h-16 w-16 rounded-full bg-coral/15 text-coral flex items-center justify-center mb-5">
          <CheckCircle2 size={34} />
        </div>
        <h1 className="font-display text-3xl text-plum">You’re on the list!</h1>
        <p className="text-plum/70 mt-2">
          Thanks, {firstName}. We’ll be in touch with details about Season 2 soon.
        </p>

        <button
          onClick={() => setInquiryOpen(true)}
          className="mt-8 w-full flex items-center gap-3 p-4 rounded-2xl bg-white shadow-card hover:shadow-soft transition text-left"
        >
          <div className="h-11 w-11 rounded-full bg-champagne text-plum flex items-center justify-center shrink-0">
            <Sparkles size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-plum leading-tight">
              Do you need help in organizing your event?
            </div>
            <div className="text-xs text-plum/60">Click here — we’d love to help.</div>
          </div>
          <ArrowRight size={18} className="text-plum/40 shrink-0" />
        </button>
      </div>

      <footer className="text-center pb-8 px-6">
        <div className="text-[10px] text-plum/40">Forever in a Day © 2026</div>
      </footer>

      <InquiryModal open={inquiryOpen} onClose={() => setInquiryOpen(false)} prefill={prefill} />
    </div>
  );
}

function InquiryModal({
  open,
  onClose,
  prefill,
}: {
  open: boolean;
  onClose: () => void;
  prefill: { name: string; email: string; mobile: string };
}) {
  const [form, setForm] = useState({
    name: prefill.name,
    email: prefill.email,
    phone: prefill.mobile,
    eventType: '',
    message: '',
  });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await createInquiry(
        {
          name: form.name,
          email: form.email,
          phone: form.phone,
          eventType: form.eventType,
          message: form.message,
        },
        SEASON_2_EVENT_ID,
      );
      setSent(true);
    } catch (err) {
      toast.error(`Could not send: ${(err as Error).message}`);
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={sent ? undefined : 'Tell us about your event'} size="md">
      {sent ? (
        <div className="text-center py-4">
          <div className="h-14 w-14 rounded-full bg-coral/15 text-coral flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={30} />
          </div>
          <h3 className="font-display text-2xl text-plum">Request received</h3>
          <p className="text-sm text-plum/70 mt-2">
            Our team will reach out to you shortly. Thank you!
          </p>
          <button onClick={onClose} className="btn-primary w-full mt-6">
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm text-plum/60 -mt-1">
            Share a few details and our team will get back to you about planning your wedding,
            debut, or special event.
          </p>
          <div>
            <label className="label">Your name</label>
            <input
              required
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Email</label>
              <input
                required
                type="email"
                className="input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Mobile number</label>
              <input
                required
                className="input"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label">What type of event?</label>
            <input
              className="input"
              value={form.eventType}
              onChange={(e) => setForm({ ...form, eventType: e.target.value })}
              placeholder="Wedding, debut, corporate…"
            />
          </div>
          <div>
            <label className="label">Tell us more (optional)</label>
            <textarea
              className="input min-h-[90px]"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Target date, guest count, what you need help with…"
            />
          </div>
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? 'Sending…' : 'Send request'}
          </button>
        </form>
      )}
    </Modal>
  );
}
