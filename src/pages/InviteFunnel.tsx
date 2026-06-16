import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle2,
  Sparkles,
  CalendarDays,
  MapPin,
  Gem,
  Cake,
  Shirt,
  Music,
  Wine,
  Camera,
} from 'lucide-react';
import { registerGuest } from '../services/guestService';
import { createInquiry } from '../services/inquiryService';
import { getEventById } from '../services/eventService';
import { SEASON_2_EVENT_ID } from '../stores/eventStore';
import { toast } from '../stores/toastStore';

const HIGHLIGHTS = [
  { icon: Shirt, label: 'Gown fittings & try-ons' },
  { icon: Camera, label: 'Same-day-edit screenings' },
  { icon: Cake, label: 'Cake & food tastings' },
  { icon: Sparkles, label: 'Hanbok experience' },
  { icon: Wine, label: 'Wine & spirits workshops' },
  { icon: Music, label: 'Fashion show & live music' },
];

/** Format an event date (optionally +N days) as "Sat, December 5" — no time. */
const fmtDay = (iso: string | undefined, addDays = 0): string => {
  if (!iso) return 'Dates to be announced';
  try {
    const d = new Date(iso);
    d.setDate(d.getDate() + addDays);
    return d.toLocaleDateString('en-PH', { weekday: 'short', month: 'long', day: 'numeric' });
  } catch {
    return 'TBA';
  }
};

type Step = 'register' | 'help' | 'done';

export function InviteFunnel() {
  const { data: event } = useQuery({
    queryKey: ['event', SEASON_2_EVENT_ID],
    queryFn: () => getEventById(SEASON_2_EVENT_ID),
  });

  const [step, setStep] = useState<Step>('register');
  const [form, setForm] = useState({
    name: '',
    email: '',
    mobile: '',
    day: 'day1' as 'day1' | 'day2',
    consent: false,
  });
  const [busy, setBusy] = useState(false);

  const day1 = fmtDay(event?.date, 0);
  const day2 = fmtDay(event?.date, 1);
  const venue = event?.venue && event.venue !== 'TBA' ? event.venue : 'Venue to be announced';

  const submitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!form.consent) {
      toast.error('Please accept the data privacy notice to continue.');
      return;
    }
    setBusy(true);
    try {
      await registerGuest(
        { name: form.name, email: form.email, mobile: form.mobile, preferredDay: form.day },
        SEASON_2_EVENT_ID,
      );
      setStep('help');
    } catch (err) {
      toast.error(`Registration failed: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[100svh] bg-gradient-to-b from-cream via-rose/15 to-rose/35">
      <div className="max-w-xl mx-auto px-5 py-8 sm:py-12">
        {step === 'register' && (
          <RegisterStep
            event={event}
            day1={day1}
            day2={day2}
            venue={venue}
            form={form}
            setForm={setForm}
            busy={busy}
            onSubmit={submitRegistration}
          />
        )}
        {step === 'help' && (
          <HelpStep name={form.name} prefill={form} onDone={() => setStep('done')} />
        )}
        {step === 'done' && <DoneStep day1={day1} day2={day2} venue={venue} day={form.day} />}
      </div>
    </div>
  );
}

function RegisterStep({
  event,
  day1,
  day2,
  venue,
  form,
  setForm,
  busy,
  onSubmit,
}: {
  event: { name: string } | undefined;
  day1: string;
  day2: string;
  venue: string;
  form: { name: string; email: string; mobile: string; day: 'day1' | 'day2'; consent: boolean };
  setForm: React.Dispatch<React.SetStateAction<typeof form>>;
  busy: boolean;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <>
      {/* Hero */}
      <div className="text-center">
        <img src="/logo.png" alt="Forever in a Day" className="mx-auto w-full max-w-[230px] h-auto" />
        <div className="mt-3 chip">{event?.name ?? 'FIAD Season 2'}</div>
        <h1 className="font-display text-3xl sm:text-4xl text-plum mt-4 leading-tight">
          The Wedding, Events &amp; Debut Fair
        </h1>
        <p className="text-plum/70 mt-2">
          A Fil-Korean themed, interactive celebration fair. Reserve your spot — register free below.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 mt-4 text-sm text-plum/70">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays size={15} className="text-coral" /> {day1} &amp; {day2}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin size={15} className="text-coral" /> {venue}
          </span>
        </div>
      </div>

      {/* Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-7">
        {HIGHLIGHTS.map((h) => (
          <div
            key={h.label}
            className="bg-white/70 rounded-xl p-3 flex items-center gap-2.5 shadow-card"
          >
            <h.icon size={17} className="text-coral shrink-0" />
            <span className="text-xs text-plum/80 leading-tight">{h.label}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-center gap-2 text-sm text-plum">
        <Gem size={16} className="text-champagne" />
        <span className="font-medium">Plus a Wedding Ring Raffle for one lucky couple.</span>
      </div>

      {/* Registration form */}
      <form onSubmit={onSubmit} className="mt-7 bg-white rounded-2xl shadow-card p-6 space-y-4">
        <div className="font-display text-xl text-plum">Reserve your spot</div>
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
          <label className="label">Mobile number</label>
          <input
            required
            className="input"
            value={form.mobile}
            onChange={(e) => setForm({ ...form, mobile: e.target.value })}
            placeholder="+63 9xx xxx xxxx"
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
          <label className="label">Which day are you coming?</label>
          <div className="grid grid-cols-2 gap-2.5 mt-1">
            {(
              [
                { key: 'day1', title: 'Day 1', sub: day1 },
                { key: 'day2', title: 'Day 2', sub: day2 },
              ] as const
            ).map((opt) => {
              const active = form.day === opt.key;
              return (
                <button
                  type="button"
                  key={opt.key}
                  onClick={() => setForm({ ...form, day: opt.key })}
                  className={`rounded-xl border p-3 text-left transition ${
                    active
                      ? 'border-coral bg-coral/10 ring-1 ring-coral'
                      : 'border-plum/15 bg-white hover:border-plum/30'
                  }`}
                >
                  <div className="font-medium text-plum">{opt.title}</div>
                  <div className="text-xs text-plum/60">{opt.sub}</div>
                </button>
              );
            })}
          </div>
        </div>

        <label className="flex items-start gap-3 text-xs text-plum/70 bg-cream/60 rounded-xl p-3">
          <input
            type="checkbox"
            checked={form.consent}
            onChange={(e) => setForm({ ...form, consent: e.target.checked })}
            className="mt-0.5 h-4 w-4 accent-coral"
          />
          <span>
            I consent to the collection of my contact details for event updates and communications
            under RA 10173 (Data Privacy Act). I can request deletion anytime.
          </span>
        </label>

        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? 'Reserving…' : 'Reserve my spot'}
        </button>
      </form>

      <p className="text-center text-[10px] text-plum/40 mt-6">Forever in a Day © 2026</p>
    </>
  );
}

function HelpStep({
  name,
  prefill,
  onDone,
}: {
  name: string;
  prefill: { name: string; email: string; mobile: string };
  onDone: () => void;
}) {
  const firstName = name.trim().split(' ')[0] || 'there';
  const [showForm, setShowForm] = useState(false);
  const [inq, setInq] = useState({ eventType: '', message: '' });
  const [busy, setBusy] = useState(false);

  const sendInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await createInquiry(
        {
          name: prefill.name,
          email: prefill.email,
          phone: prefill.mobile,
          eventType: inq.eventType,
          message: inq.message,
        },
        SEASON_2_EVENT_ID,
      );
      toast.success('Thanks! Our team will reach out.');
      onDone();
    } catch (err) {
      toast.error(`Could not send: ${(err as Error).message}`);
      setBusy(false);
    }
  };

  return (
    <div className="py-6">
      <div className="text-center">
        <div className="h-16 w-16 rounded-full bg-coral/15 text-coral flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 size={34} />
        </div>
        <h1 className="font-display text-3xl text-plum">You’re registered, {firstName}!</h1>
        <p className="text-plum/70 mt-2">
          One more thing before you go —
        </p>
      </div>

      {!showForm ? (
        <div className="mt-6 bg-white rounded-2xl shadow-card p-6 text-center">
          <Sparkles size={22} className="text-champagne mx-auto" />
          <div className="font-display text-2xl text-plum mt-2">
            Do you need help organizing your event?
          </div>
          <p className="text-sm text-plum/60 mt-1">
            Weddings, debuts, corporate — our team can help you plan it.
          </p>
          <div className="grid sm:grid-cols-2 gap-2.5 mt-5">
            <button onClick={() => setShowForm(true)} className="btn-primary w-full">
              Yes, I’d love help
            </button>
            <button
              onClick={onDone}
              className="btn-ghost w-full border border-plum/15 text-plum"
            >
              No, thanks
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={sendInquiry} className="mt-6 bg-white rounded-2xl shadow-card p-6 space-y-4">
          <div className="font-display text-xl text-plum">Tell us about your event</div>
          <div>
            <label className="label">What type of event?</label>
            <input
              className="input"
              value={inq.eventType}
              onChange={(e) => setInq({ ...inq, eventType: e.target.value })}
              placeholder="Wedding, debut, corporate…"
            />
          </div>
          <div>
            <label className="label">Tell us more (optional)</label>
            <textarea
              className="input min-h-[90px]"
              value={inq.message}
              onChange={(e) => setInq({ ...inq, message: e.target.value })}
              placeholder="Target date, guest count, what you need help with…"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-2.5">
            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? 'Sending…' : 'Send request'}
            </button>
            <button
              type="button"
              onClick={onDone}
              className="btn-ghost w-full border border-plum/15 text-plum"
            >
              Skip
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function DoneStep({
  day1,
  day2,
  venue,
  day,
}: {
  day1: string;
  day2: string;
  venue: string;
  day: 'day1' | 'day2';
}) {
  const chosen = day === 'day1' ? day1 : day2;
  return (
    <div className="py-10 text-center">
      <div className="h-16 w-16 rounded-full bg-coral/15 text-coral flex items-center justify-center mx-auto mb-5">
        <CheckCircle2 size={34} />
      </div>
      <h1 className="font-display text-3xl text-plum">See you at the fair!</h1>
      <p className="text-plum/70 mt-2">
        Your spot is reserved. We’ll send your details and reminders before the event.
      </p>

      <div className="mt-7 bg-white rounded-2xl shadow-card p-6 inline-block text-left">
        <div className="flex items-center gap-2.5 text-plum">
          <CalendarDays size={16} className="text-coral" />
          <span className="font-medium">You’re coming on {day === 'day1' ? 'Day 1' : 'Day 2'}</span>
        </div>
        <div className="text-sm text-plum/60 mt-1 ml-[26px]">{chosen}</div>
        <div className="flex items-center gap-2.5 text-plum mt-3">
          <MapPin size={16} className="text-coral" />
          <span className="font-medium">{venue}</span>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-center gap-1.5 text-sm text-plum/50">
        <Sparkles size={14} className="text-champagne" /> Forever in a Day © 2026
      </div>
    </div>
  );
}
