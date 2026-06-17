import { useEffect, useMemo, useState } from 'react';
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
  Heart,
  Users,
  Star,
  ArrowRight,
  ChevronDown,
  Check,
} from 'lucide-react';
import { registerGuest } from '../services/guestService';
import { createInquiry } from '../services/inquiryService';
import { getEventById } from '../services/eventService';
import { initMetaPixel, trackLead } from '../lib/meta';
import { toast } from '../stores/toastStore';

// Season 2 runs at TWO venues on overlapping dates. Each venue is its own
// event, so the admin gets a clean, separate registrant list per location
// (switchable in the admin event switcher). The funnel maps the chosen
// venue → its event id.
const VENUES = [
  { key: 'brittany', eventId: 'evt_fiad_s2_brittany', hotel: 'Brittany Hotel', area: 'BGC, Taguig' },
  { key: 'mella', eventId: 'evt_fiad_s2_mella', hotel: 'Mella Hotel', area: 'Las Piñas' },
] as const;
type VenueKey = (typeof VENUES)[number]['key'];

const EXPERIENCES = [
  { icon: Shirt, label: 'Bridal gown fittings', sub: 'Try on the dress before you commit' },
  { icon: Cake, label: 'Cake & food tastings', sub: 'Taste your way through caterers' },
  { icon: Camera, label: 'Same-day-edit screenings', sub: 'See real wedding films' },
  { icon: Users, label: '50+ curated suppliers', sub: 'Everything for your day, one roof' },
  { icon: Sparkles, label: 'Hanbok & K-beauty', sub: 'A Fil-Korean cultural experience' },
  { icon: Star, label: 'Live bridal runway show', sub: 'Couture on the catwalk' },
  { icon: Wine, label: 'Wine & spirits workshop', sub: 'Plan the perfect toast' },
  { icon: Music, label: 'Live music & more', sub: 'A full day of celebration' },
];

const VALUE_PROPS = [
  {
    icon: Users,
    title: 'One roof, zero stress',
    body: 'Compare and book photographers, caterers, venues, gowns and more — without driving across the metro for weeks.',
  },
  {
    icon: Heart,
    title: 'Try before you say "yes"',
    body: 'Fittings, cake tastings and same-day-edit screenings, so you book every supplier with total confidence.',
  },
  {
    icon: Sparkles,
    title: 'A day to remember',
    body: 'Hanbok experiences, K-beauty, a live fashion show, wine workshops and music — a celebration in itself.',
  },
];

const FAQS = [
  { q: 'Is it really free?', a: 'Yes — admission is completely free when you reserve your spot here.' },
  { q: 'Can I bring my partner or family?', a: 'Please do! Bring your fiancé(e), your parents, and your entourage. The more the merrier.' },
  { q: 'Can I attend either location?', a: 'Yes — pick whichever venue and day is most convenient for you when you register below.' },
  { q: 'Do I have to stay the whole day?', a: 'Not at all. Drop by anytime during event hours and explore at your own pace.' },
  { q: 'Will there be food?', a: 'Complimentary tastings from our exhibitors, plus food available to purchase at the venue.' },
  { q: 'What should I wear?', a: 'Smart casual in any color — comfortable enough to walk, dressy enough for photos.' },
];

/**
 * Parse a 'YYYY-MM-DD' event date as a LOCAL calendar date (+ optional day
 * offset). `new Date('2026-09-18')` parses as UTC midnight, which renders as
 * the previous day for any viewer west of UTC — so build the date from parts
 * in local time instead.
 */
const localDate = (iso: string, addDays = 0): Date => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d + addDays);
};

/** "Sat, December 5" — full weekday + date, no time. */
const fmtDay = (iso: string | undefined, addDays = 0): string => {
  if (!iso) return 'Date to be announced';
  try {
    return localDate(iso, addDays).toLocaleDateString('en-PH', {
      weekday: 'short',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return 'TBA';
  }
};

/** "Sep 18" — compact month + day. */
const shortDate = (iso: string | undefined, addDays = 0): string => {
  if (!iso) return 'TBA';
  try {
    return localDate(iso, addDays).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
  } catch {
    return 'TBA';
  }
};

const scrollToForm = () =>
  document.getElementById('register')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

type Step = 'landing' | 'help' | 'done';

type VenueOption = {
  key: VenueKey;
  eventId: string;
  hotel: string;
  area: string;
  day1: string;
  day2: string;
  rangeShort: string;
};

export function InviteFunnel() {
  // Fetch ONLY the two venue events (not the whole events list) — the public
  // funnel shouldn't pull every event's draft metadata to the client.
  const { data: venueEvents } = useQuery({
    queryKey: ['rsvp-venue-events'],
    queryFn: async () => {
      const pairs = await Promise.all(
        VENUES.map(async (v) => [v.eventId, await getEventById(v.eventId)] as const),
      );
      return Object.fromEntries(pairs);
    },
  });

  useEffect(() => {
    initMetaPixel();
  }, []);

  const [step, setStep] = useState<Step>('landing');
  const [form, setForm] = useState({
    name: '',
    email: '',
    mobile: '',
    venue: 'brittany' as VenueKey,
    day: 'day1' as 'day1' | 'day2',
    consent: false,
  });
  const [busy, setBusy] = useState(false);
  const [consentError, setConsentError] = useState(false);

  // Enrich each venue with its dates from the matching event row, so dates
  // stay editable from the admin Event tab.
  const venueOptions: VenueOption[] = useMemo(
    () =>
      VENUES.map((v) => {
        const ev = venueEvents?.[v.eventId];
        return {
          key: v.key,
          eventId: v.eventId,
          hotel: v.hotel,
          area: v.area,
          day1: fmtDay(ev?.date, 0),
          day2: fmtDay(ev?.date, 1),
          rangeShort: ev ? `${shortDate(ev.date, 0)} & ${shortDate(ev.date, 1)}` : 'September 2026',
        };
      }),
    [venueEvents],
  );

  const selected = venueOptions.find((v) => v.key === form.venue) ?? venueOptions[0];
  const chosenDate = form.day === 'day1' ? selected.day1 : selected.day2;
  const venueLabel = `${selected.hotel}, ${selected.area}`;

  const submitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!form.consent) {
      setConsentError(true);
      toast.error('Please accept the data privacy notice to continue.');
      return;
    }
    setBusy(true);
    try {
      await registerGuest(
        { name: form.name, email: form.email, mobile: form.mobile, preferredDay: form.day },
        selected.eventId,
      );
      // Fire the deduplicated Meta Lead (Pixel + CAPI) fire-and-forget — it must
      // never block the thank-you transition or surface a false "Registration
      // failed" if tracking hiccups. trackLead swallows its own errors.
      void trackLead({ email: form.email, phone: form.mobile, name: form.name, preferredDay: form.day });
      setStep('help');
      window.scrollTo({ top: 0 });
    } catch (err) {
      toast.error(`Registration failed: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  if (step === 'help')
    return (
      <HelpStep
        name={form.name}
        prefill={form}
        eventId={selected.eventId}
        onDone={() => setStep('done')}
      />
    );
  if (step === 'done')
    return <DoneStep venueLabel={venueLabel} chosenDate={chosenDate} day={form.day} />;

  return (
    <Landing
      venueOptions={venueOptions}
      selected={selected}
      form={form}
      setForm={setForm}
      busy={busy}
      consentError={consentError}
      clearConsentError={() => setConsentError(false)}
      onSubmit={submitRegistration}
    />
  );
}

function Landing({
  venueOptions,
  selected,
  form,
  setForm,
  busy,
  consentError,
  clearConsentError,
  onSubmit,
}: {
  venueOptions: VenueOption[];
  selected: VenueOption;
  form: {
    name: string;
    email: string;
    mobile: string;
    venue: VenueKey;
    day: 'day1' | 'day2';
    consent: boolean;
  };
  setForm: React.Dispatch<React.SetStateAction<typeof form>>;
  busy: boolean;
  consentError: boolean;
  clearConsentError: () => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <div className="min-h-screen text-plum overflow-x-hidden pb-24 sm:pb-0">
      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-cream/80 border-b border-plum/5">
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between">
          <img src="/logo.png" alt="Forever in a Day" className="h-9 w-auto" width="120" height="36" />
          <button onClick={scrollToForm} className="btn-primary !px-4 !py-2 text-sm min-h-[44px]">
            Reserve free spot
          </button>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative max-w-3xl mx-auto px-5 pt-12 sm:pt-16 pb-10 text-center">
        <div className="reveal chip" style={{ animationDelay: '0ms' }}>
          FIAD Season 2 · Wedding, Events &amp; Debut Fair
        </div>
        <h1
          className="reveal font-display text-[2.5rem] leading-[1.05] sm:text-6xl text-plum mt-5"
          style={{ animationDelay: '80ms' }}
        >
          Plan your dream wedding in&nbsp;one{' '}
          <span className="foil-gold-text foil-shimmer">magical day.</span>
        </h1>
        <p
          className="reveal text-plum/75 text-lg mt-5 max-w-xl mx-auto"
          style={{ animationDelay: '160ms' }}
        >
          Meet the country’s most-loved suppliers, try on gowns, taste the cakes, and watch a live
          runway show — a Fil-Korean celebration fair made for couples like you.
        </p>

        {/* Two locations — pick the one nearest you */}
        <div
          className="reveal mt-7 grid sm:grid-cols-2 gap-2.5 max-w-lg mx-auto"
          style={{ animationDelay: '240ms' }}
        >
          {venueOptions.map((v) => (
            <div key={v.key} className="bg-white/70 rounded-xl px-4 py-3 text-left shadow-card">
              <div className="font-medium text-plum inline-flex items-center gap-1.5">
                <MapPin size={15} className="text-coral" aria-hidden="true" /> {v.hotel}
              </div>
              <div className="text-xs text-plum/70 mt-0.5 ml-[22px]">
                {v.area} · {v.rangeShort}
              </div>
            </div>
          ))}
        </div>
        <div
          className="reveal inline-flex items-center gap-1.5 mt-4 text-sm font-medium text-plum"
          style={{ animationDelay: '280ms' }}
        >
          <CheckCircle2 size={16} className="text-coral" aria-hidden="true" /> Free admission · both
          locations
        </div>

        <div
          className="reveal flex flex-col sm:flex-row items-center justify-center gap-3 mt-8"
          style={{ animationDelay: '320ms' }}
        >
          <button onClick={scrollToForm} className="btn-primary w-full sm:w-auto !px-8 text-base">
            Reserve my free spot
          </button>
          <button
            onClick={() => document.getElementById('experience')?.scrollIntoView({ behavior: 'smooth' })}
            className="btn-ghost w-full sm:w-auto text-plum/70"
          >
            See what’s inside <ChevronDown size={16} className="ml-1" aria-hidden="true" />
          </button>
        </div>
        <p className="reveal text-xs text-plum/60 mt-4" style={{ animationDelay: '380ms' }}>
          Limited slots per day — reserve before they’re gone.
        </p>
      </section>

      {/* ── Social proof / trust band ── */}
      <section className="max-w-3xl mx-auto px-5 pb-12">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          {[
            { stat: '50+', label: 'Curated suppliers' },
            { stat: '2', label: 'Metro locations' },
            { stat: 'Free', label: 'Admission' },
            { stat: '1', label: 'Couple wins rings' },
          ].map((s) => (
            <div key={s.label} className="bg-white/70 rounded-2xl py-4 px-2 shadow-card">
              <div className="font-display text-2xl sm:text-3xl text-coral leading-none">{s.stat}</div>
              <div className="text-xs text-plum/70 mt-1.5 leading-tight">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Ring raffle hook ── */}
      <section className="max-w-5xl mx-auto px-5">
        <div className="relative overflow-hidden rounded-3xl bg-plum text-cream px-6 py-10 sm:py-12 text-center shadow-soft">
          <Gem size={28} className="mx-auto text-champagne animate-floaty" aria-hidden="true" />
          <div className="text-[11px] uppercase tracking-[0.2em] text-champagne mt-3">
            The grand moment
          </div>
          <h2 className="font-display text-3xl sm:text-4xl mt-2">
            Win <span className="foil-gold-text foil-shimmer">your wedding rings</span>
          </h2>
          <p className="text-cream/75 mt-3 max-w-md mx-auto">
            Every registered couple is entered to win a wedding ring set, drawn live on stage.
            Your forever could begin right here.
          </p>
        </div>
      </section>

      {/* ── Value props ── */}
      <section className="max-w-5xl mx-auto px-5 py-14">
        <div className="grid sm:grid-cols-3 gap-4">
          {VALUE_PROPS.map((v) => (
            <div key={v.title} className="card !p-6">
              <div className="h-11 w-11 rounded-xl bg-coral/10 text-coral flex items-center justify-center">
                <v.icon size={20} aria-hidden="true" />
              </div>
              <h3 className="font-display text-xl text-plum mt-4">{v.title}</h3>
              <p className="text-sm text-plum/75 mt-1.5 leading-relaxed">{v.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Experience grid ── */}
      <section id="experience" className="max-w-5xl mx-auto px-5 pb-14 scroll-mt-20">
        <div className="text-center max-w-xl mx-auto">
          <div className="text-[11px] uppercase tracking-[0.2em] text-coral">What’s inside</div>
          <h2 className="font-display text-3xl sm:text-4xl text-plum mt-2">
            Everything for your big day
          </h2>
          <p className="text-plum/75 mt-2">
            Two days of fittings, tastings, culture and celebration — all under one roof.
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-8">
          {EXPERIENCES.map((x) => (
            <div key={x.label} className="bg-white rounded-2xl p-4 shadow-card hover:shadow-soft transition">
              <x.icon size={20} className="text-coral" aria-hidden="true" />
              <div className="font-medium text-plum mt-3 leading-tight">{x.label}</div>
              <div className="text-xs text-plum/60 mt-1 leading-snug">{x.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Two days ── */}
      <section className="max-w-5xl mx-auto px-5 pb-14">
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { tag: 'Day 1', items: ['Grand opening & ribbon cutting', 'Gown fittings, cake tastings & K-culture', 'Wine selection workshop', 'Live bridal runway show', 'Musical performances'] },
            { tag: 'Day 2', items: ['Doors open · interactive booths', 'Q&A with a celebrity wedding planner', 'Wine & spirits basics', 'Supplier awards night', 'Wedding ring raffle & Season 3 reveal'] },
          ].map((d) => (
            <div key={d.tag} className="card !p-6">
              <div className="font-display text-2xl text-plum">{d.tag}</div>
              <ul className="mt-4 space-y-2.5">
                {d.items.map((it) => (
                  <li key={it} className="flex items-start gap-2.5 text-sm text-plum/75">
                    <CheckCircle2 size={16} className="text-champagne shrink-0 mt-0.5" aria-hidden="true" />
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-plum/60 mt-4">
          Full programme announced closer to the date. Highlights shown are representative.
        </p>
      </section>

      {/* ── Registration form ── */}
      <section id="register" className="max-w-xl mx-auto px-5 py-10 scroll-mt-20">
        <div className="text-center mb-6">
          <div className="text-[11px] uppercase tracking-[0.2em] text-coral">Reserve your spot</div>
          <h2 className="font-display text-3xl sm:text-4xl text-plum mt-2">Save your free seat</h2>
          <p className="text-plum/75 mt-2">
            Takes 20 seconds. We’ll send your confirmation and event reminders.
          </p>
        </div>

        <form onSubmit={onSubmit} className="bg-white rounded-2xl shadow-soft p-6 space-y-4">
          <div>
            <label htmlFor="rsvp-name" className="label">
              Full name <span className="text-coral" aria-hidden="true">*</span>
            </label>
            <input
              id="rsvp-name"
              name="name"
              required
              aria-required="true"
              autoComplete="name"
              className="input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Juana Dela Cruz"
            />
          </div>
          <div>
            <label htmlFor="rsvp-mobile" className="label">
              Mobile number <span className="text-coral" aria-hidden="true">*</span>
            </label>
            <input
              id="rsvp-mobile"
              name="mobile"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              aria-required="true"
              className="input"
              value={form.mobile}
              onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
              placeholder="+63 9xx xxx xxxx"
            />
          </div>
          <div>
            <label htmlFor="rsvp-email" className="label">
              Email <span className="text-coral" aria-hidden="true">*</span>
            </label>
            <input
              id="rsvp-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              aria-required="true"
              className="input"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="you@email.com"
            />
          </div>

          {/* Location picker */}
          <div>
            <div className="label" id="rsvp-venue-label">
              Choose your location <span className="text-coral" aria-hidden="true">*</span>
            </div>
            <div role="radiogroup" aria-labelledby="rsvp-venue-label" className="grid gap-2.5 mt-1">
              {venueOptions.map((v) => {
                const active = form.venue === v.key;
                return (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={active}
                    key={v.key}
                    onClick={() => setForm((f) => ({ ...f, venue: v.key }))}
                    className={`rounded-xl border p-3.5 text-left transition cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 ${
                      active
                        ? 'border-coral bg-coral/10 ring-1 ring-coral'
                        : 'border-plum/15 bg-white hover:border-plum/30'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-plum inline-flex items-center gap-1.5">
                        <MapPin size={15} className="text-coral shrink-0" aria-hidden="true" /> {v.hotel}
                      </span>
                      {active && <Check size={16} className="text-coral shrink-0" aria-hidden="true" />}
                    </div>
                    <div className="text-xs text-plum/70 mt-0.5 ml-[22px]">
                      {v.area} · {v.rangeShort}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Day picker (for the chosen venue) */}
          <div>
            <div className="label" id="rsvp-day-label">
              Which day at {selected.hotel}?
            </div>
            <div role="radiogroup" aria-labelledby="rsvp-day-label" className="grid grid-cols-2 gap-2.5 mt-1">
              {(
                [
                  { key: 'day1', title: 'Day 1', sub: selected.day1 },
                  { key: 'day2', title: 'Day 2', sub: selected.day2 },
                ] as const
              ).map((opt) => {
                const active = form.day === opt.key;
                return (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={active}
                    key={opt.key}
                    onClick={() => setForm((f) => ({ ...f, day: opt.key }))}
                    className={`rounded-xl border p-3 text-left transition cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 ${
                      active
                        ? 'border-coral bg-coral/10 ring-1 ring-coral'
                        : 'border-plum/15 bg-white hover:border-plum/30'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-plum">{opt.title}</span>
                      {active && <Check size={16} className="text-coral shrink-0" aria-hidden="true" />}
                    </div>
                    <div className="text-xs text-plum/70">{opt.sub}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="flex items-start gap-3 text-xs text-plum/75 bg-cream/60 rounded-xl p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.consent}
                onChange={(e) => {
                  setForm((f) => ({ ...f, consent: e.target.checked }));
                  if (e.target.checked) clearConsentError();
                }}
                aria-invalid={consentError}
                aria-describedby={consentError ? 'consent-error' : undefined}
                className="mt-0.5 h-4 w-4 accent-coral cursor-pointer"
              />
              <span>
                I consent to the collection of my contact details for event updates and communications
                under RA 10173 (Data Privacy Act). I can request deletion anytime.
              </span>
            </label>
            {consentError && (
              <p id="consent-error" role="alert" className="text-xs text-coral mt-1.5 px-1">
                Please accept the data privacy notice to continue.
              </p>
            )}
          </div>

          <button type="submit" disabled={busy} className="btn-primary w-full text-base">
            {busy ? 'Reserving…' : 'Reserve my free spot'}
          </button>
          <p className="text-center text-xs text-plum/60">
            Free · No spam · Your spot is held instantly
          </p>
        </form>
      </section>

      {/* ── FAQ ── */}
      <section className="max-w-xl mx-auto px-5 py-10">
        <h2 className="font-display text-2xl text-plum text-center mb-6">Good to know</h2>
        <div className="space-y-2.5">
          {FAQS.map((f) => (
            <details key={f.q} className="group card !p-0 overflow-hidden">
              <summary className="flex items-center justify-between gap-3 cursor-pointer list-none px-5 py-4 outline-none rounded-2xl focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-inset">
                <span className="font-medium text-plum">{f.q}</span>
                <ChevronDown size={18} className="text-plum/40 transition group-open:rotate-180 shrink-0" aria-hidden="true" />
              </summary>
              <p className="px-5 pb-4 -mt-1 text-sm text-plum/75 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="max-w-5xl mx-auto px-5 py-10">
        <div className="rounded-3xl bg-gradient-to-br from-coral to-rose text-white text-center px-6 py-12 shadow-soft">
          <Heart size={26} className="mx-auto" aria-hidden="true" />
          <h2 className="font-display text-3xl sm:text-4xl mt-3">Your forever starts here.</h2>
          <p className="text-white/90 mt-2 max-w-md mx-auto">
            Reserve your free spot and step into the wedding planning day couples can’t stop talking about.
          </p>
          <button
            onClick={scrollToForm}
            className="btn mt-6 bg-white text-coral hover:brightness-95 !px-8 text-base"
          >
            Reserve my free spot <ArrowRight size={18} className="ml-1.5" aria-hidden="true" />
          </button>
        </div>
      </section>

      <footer className="text-center py-8 px-5">
        <div className="text-[10px] text-plum/60">Forever in a Day © 2026 · A Fil-Korean Wedding &amp; Debut Fair</div>
      </footer>

      {/* ── Sticky mobile CTA ── */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 z-40 p-3 bg-cream/90 backdrop-blur-md border-t border-plum/10">
        <button onClick={scrollToForm} className="btn-primary w-full text-base">
          Reserve my free spot
        </button>
      </div>
    </div>
  );
}

function HelpStep({
  name,
  prefill,
  eventId,
  onDone,
}: {
  name: string;
  prefill: { name: string; email: string; mobile: string };
  eventId: string;
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
        eventId,
      );
      toast.success('Thanks! Our team will reach out.');
      onDone();
    } catch (err) {
      toast.error(`Could not send: ${(err as Error).message}`);
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[100svh] bg-gradient-to-b from-cream via-rose/15 to-rose/35">
      <div className="max-w-xl mx-auto px-5 py-12">
        <div className="text-center">
          <div className="h-16 w-16 rounded-full bg-coral/15 text-coral flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={34} aria-hidden="true" />
          </div>
          <h1 className="font-display text-3xl text-plum">You’re registered, {firstName}!</h1>
          <p className="text-plum/75 mt-2">One more thing before you go —</p>
        </div>

        {!showForm ? (
          <div className="mt-6 bg-white rounded-2xl shadow-card p-6 text-center">
            <Sparkles size={22} className="text-champagne mx-auto" aria-hidden="true" />
            <div className="font-display text-2xl text-plum mt-2">
              Do you need help organizing your event?
            </div>
            <p className="text-sm text-plum/75 mt-1">
              Weddings, debuts, corporate — our team can help you plan it.
            </p>
            <div className="grid sm:grid-cols-2 gap-2.5 mt-5">
              <button onClick={() => setShowForm(true)} className="btn-primary w-full">
                Yes, I’d love help
              </button>
              <button onClick={onDone} className="btn-ghost w-full border border-plum/15 text-plum">
                No, thanks
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={sendInquiry} className="mt-6 bg-white rounded-2xl shadow-card p-6 space-y-4">
            <div className="font-display text-xl text-plum">Tell us about your event</div>
            <div>
              <label htmlFor="inq-type" className="label">What type of event?</label>
              <input
                id="inq-type"
                className="input"
                value={inq.eventType}
                onChange={(e) => setInq({ ...inq, eventType: e.target.value })}
                placeholder="Wedding, debut, corporate…"
              />
            </div>
            <div>
              <label htmlFor="inq-msg" className="label">Tell us more (optional)</label>
              <textarea
                id="inq-msg"
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
              <button type="button" onClick={onDone} className="btn-ghost w-full border border-plum/15 text-plum">
                Skip
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function DoneStep({
  venueLabel,
  chosenDate,
  day,
}: {
  venueLabel: string;
  chosenDate: string;
  day: 'day1' | 'day2';
}) {
  return (
    <div className="min-h-[100svh] bg-gradient-to-b from-cream via-rose/15 to-rose/35">
      <div className="max-w-xl mx-auto px-5 py-16 text-center">
        <div className="h-16 w-16 rounded-full bg-coral/15 text-coral flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 size={34} aria-hidden="true" />
        </div>
        <h1 className="font-display text-4xl text-plum">See you at the fair!</h1>
        <p className="text-plum/75 mt-2">
          Your spot is reserved. We’ll send your details and reminders before the event.
        </p>

        <div className="mt-7 bg-white rounded-2xl shadow-card p-6 inline-block text-left">
          <div className="flex items-center gap-2.5 text-plum">
            <CalendarDays size={16} className="text-coral" aria-hidden="true" />
            <span className="font-medium">
              You’re coming on {day === 'day1' ? 'Day 1' : 'Day 2'}
            </span>
          </div>
          <div className="text-sm text-plum/70 mt-1 ml-[26px]">{chosenDate}</div>
          <div className="flex items-center gap-2.5 text-plum mt-3">
            <MapPin size={16} className="text-coral" aria-hidden="true" />
            <span className="font-medium">{venueLabel}</span>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-1.5 text-sm text-plum/60">
          <Sparkles size={14} className="text-champagne" aria-hidden="true" /> Forever in a Day © 2026
        </div>
      </div>
    </div>
  );
}
