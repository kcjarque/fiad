import { useRef, useState } from 'react';
import {
  Store,
  Users,
  TrendingUp,
  Sparkles,
  MapPin,
  CheckCircle2,
  Send,
  ArrowRight,
  CalendarDays,
  Upload,
  FileText,
  X,
} from 'lucide-react';
import { createSupplierSignup, uploadSupplierDocs } from '../services/supplierService';
import { SUPPLIERS } from '../constants/suppliers';
import { toPhE164, phLocal } from '../utils/phone';
import { toast } from '../stores/toastStore';

const BENEFITS = [
  {
    icon: Users,
    title: 'Qualified foot traffic',
    body: 'Hundreds of pre-registered couples, debutants and families — actively planning and ready to book.',
  },
  {
    icon: MapPin,
    title: 'Two premium venues',
    body: 'Brittany Hotel (BGC, Taguig) and Mella Hotel (Las Piñas) — two full days at each.',
  },
  {
    icon: TrendingUp,
    title: 'Ready-to-book leads',
    body: 'Runway shows, tastings and live activities put buyers right in front of your booth.',
  },
  {
    icon: Sparkles,
    title: 'Season 2 momentum',
    body: 'Season 1 drew 480+ registered guests across the fair. Season 2 is bigger.',
  },
];

const MAX_FILES = 5;
const MAX_SIZE = 100 * 1024 * 1024; // 100 MB per file, matching the client's form

const scrollToForm = () =>
  document.getElementById('apply')?.scrollIntoView({ behavior: 'smooth' });

export function SupplierSignup() {
  const [form, setForm] = useState({
    businessName: '',
    contactPerson: '',
    email: '',
    mobile: '',
    industries: [] as string[],
    industriesOther: '',
    social: '',
    products: '',
    message: '',
  });
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const toggleIndustry = (s: string) =>
    setForm((f) => ({
      ...f,
      industries: f.industries.includes(s)
        ? f.industries.filter((x) => x !== s)
        : [...f.industries, s],
    }));

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    setFiles((prev) => {
      const next = [...prev];
      for (const f of Array.from(list)) {
        if (next.length >= MAX_FILES) {
          toast.error('You can upload up to 5 files.');
          break;
        }
        const okType =
          f.type === 'application/pdf' ||
          f.type.startsWith('image/') ||
          /\.(pdf|jpe?g|png|heic|heif|webp|gif)$/i.test(f.name);
        if (!okType) {
          toast.error(`${f.name}: upload a PDF or a photo (JPG / PNG / HEIC).`);
          continue;
        }
        if (f.size > MAX_SIZE) {
          toast.error(`${f.name} is over 100 MB.`);
          continue;
        }
        if (next.some((x) => x.name === f.name && x.size === f.size)) continue;
        next.push(f);
      }
      return next;
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!form.businessName.trim() || !form.contactPerson.trim()) {
      toast.error('Please enter your business name and contact person.');
      return;
    }
    if (form.industries.length === 0) {
      toast.error('Please choose at least one industry / service.');
      return;
    }
    if (files.length === 0) {
      toast.error('Please upload your DTI & BIR requirements.');
      return;
    }
    setBusy(true);
    const industries = form.industries
      .map((s) => (s === 'Others' && form.industriesOther.trim() ? `Others: ${form.industriesOther.trim()}` : s))
      .join(', ');
    try {
      const documentUrls = await uploadSupplierDocs(files);
      await createSupplierSignup({
        businessName: form.businessName,
        contactPerson: form.contactPerson,
        email: form.email,
        mobile: form.mobile,
        category: industries,
        social: form.social,
        products: form.products,
        documentUrls,
        message: form.message,
      });
      setDone(true);
      window.scrollTo({ top: 0 });
    } catch (err) {
      toast.error(`Could not submit: ${(err as Error).message}`);
      setBusy(false);
    }
  };

  if (done)
    return (
      <div className="min-h-[100svh] bg-gradient-to-b from-cream via-rose/15 to-rose/35">
        <div className="max-w-xl mx-auto px-5 py-20 text-center">
          <div className="h-16 w-16 rounded-full bg-coral/15 text-coral flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={34} aria-hidden="true" />
          </div>
          <h1 className="font-display text-4xl text-plum">Application received!</h1>
          <p className="text-plum/75 mt-3">
            Thanks, <span className="font-medium text-plum">{form.businessName.trim()}</span>. Our
            team will review your details and requirements and reach out with booth options and
            packages for Forever in a Day Season 2.
          </p>
          <div className="mt-8 flex items-center justify-center gap-1.5 text-sm text-plum/60">
            <Sparkles size={14} className="text-champagne" aria-hidden="true" /> Forever in a Day © 2026
          </div>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen text-plum overflow-x-hidden pb-16">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-cream/80 border-b border-plum/5">
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between">
          <img src="/logo.png" alt="Forever in a Day" className="h-9 w-auto" width="120" height="36" />
          <button onClick={scrollToForm} className="btn-primary !px-4 !py-2 text-sm min-h-[44px]">
            Apply now
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative max-w-3xl mx-auto px-5 pt-12 sm:pt-16 pb-10 text-center">
        <div className="reveal chip" style={{ animationDelay: '0ms' }}>
          <Store size={13} className="text-coral" aria-hidden="true" /> FIAD Season 2 · Now accepting suppliers
        </div>
        <h1
          className="reveal font-display text-[2.5rem] leading-[1.05] sm:text-6xl text-plum mt-5"
          style={{ animationDelay: '80ms' }}
        >
          Grow your business at{' '}
          <span className="foil-gold-text foil-shimmer">Forever in a Day.</span>
        </h1>
        <p
          className="reveal text-plum/75 text-lg mt-5 max-w-xl mx-auto"
          style={{ animationDelay: '160ms' }}
        >
          Exhibit at the Philippines' premier wedding, events &amp; debut fair. Meet hundreds of
          couples, debutants and celebrants ready to book — face to face, over two days at two
          venues.
        </p>
        <div className="reveal mt-7" style={{ animationDelay: '240ms' }}>
          <button onClick={scrollToForm} className="btn-primary text-base inline-flex items-center gap-2">
            Apply for a booth <ArrowRight size={18} aria-hidden="true" />
          </button>
        </div>
      </section>

      {/* Stats strip */}
      <section className="max-w-3xl mx-auto px-5 pb-12">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          {[
            { n: '480+', l: 'Registered guests' },
            { n: '2', l: 'Premium venues' },
            { n: '2 days', l: 'At each venue' },
            { n: '20+', l: 'Supplier categories' },
          ].map((s) => (
            <div key={s.l} className="card !p-4">
              <div className="font-display text-2xl text-coral leading-none">{s.n}</div>
              <div className="text-xs text-plum/60 mt-1 leading-snug">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Why exhibit */}
      <section className="max-w-5xl mx-auto px-5 pb-14">
        <h2 className="font-display text-3xl text-plum text-center mb-7">Why exhibit with us</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {BENEFITS.map((b) => (
            <div key={b.title} className="card !p-6 flex items-start gap-4">
              <div className="h-11 w-11 shrink-0 rounded-xl bg-coral/12 text-coral flex items-center justify-center">
                <b.icon size={22} aria-hidden="true" />
              </div>
              <div>
                <div className="font-medium text-plum text-lg">{b.title}</div>
                <p className="text-sm text-plum/70 mt-1 leading-relaxed">{b.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Application form */}
      <section id="apply" className="max-w-xl mx-auto px-5 py-10 scroll-mt-20">
        <div className="text-center mb-6">
          <div className="text-[11px] uppercase tracking-[0.2em] text-coral">Supplier application</div>
          <h2 className="font-display text-3xl sm:text-4xl text-plum mt-2">Apply to be a supplier</h2>
          <p className="text-plum/75 mt-2">
            Tell us about your business — our team will reach out with booth details and packages.
          </p>
        </div>

        <form onSubmit={submit} className="bg-white rounded-2xl shadow-soft p-6 space-y-4">
          <div>
            <label htmlFor="sup-business" className="label">
              Business / brand name <span className="text-coral" aria-hidden="true">*</span>
            </label>
            <input
              id="sup-business"
              required
              aria-required="true"
              className="input"
              value={form.businessName}
              onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
              placeholder="e.g. Peridot Studios"
              autoComplete="organization"
            />
          </div>

          <div>
            <label htmlFor="sup-contact" className="label">
              Contact person <span className="text-coral" aria-hidden="true">*</span>
            </label>
            <input
              id="sup-contact"
              required
              aria-required="true"
              className="input"
              value={form.contactPerson}
              onChange={(e) => setForm((f) => ({ ...f, contactPerson: e.target.value }))}
              placeholder="Full name"
              autoComplete="name"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="sup-email" className="label">
                Email <span className="text-coral" aria-hidden="true">*</span>
              </label>
              <input
                id="sup-email"
                type="email"
                inputMode="email"
                required
                aria-required="true"
                className="input"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="you@business.com"
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="sup-mobile" className="label">
                Mobile number <span className="text-coral" aria-hidden="true">*</span>
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-plum/70 select-none">
                  +63
                </span>
                <input
                  id="sup-mobile"
                  type="tel"
                  inputMode="numeric"
                  required
                  aria-required="true"
                  className="input pl-12"
                  value={phLocal(form.mobile)}
                  onChange={(e) => setForm((f) => ({ ...f, mobile: toPhE164(e.target.value) }))}
                  placeholder="9XX XXX XXXX"
                  autoComplete="tel"
                />
              </div>
            </div>
          </div>

          {/* Industry / Services — multi-select */}
          <div>
            <div className="label mb-1.5">
              Industry / Services <span className="text-coral" aria-hidden="true">*</span>
              <span className="text-plum/40 font-normal"> — select all that apply</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {SUPPLIERS.map((s) => {
                const checked = form.industries.includes(s);
                return (
                  <label
                    key={s}
                    className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 cursor-pointer text-sm transition ${
                      checked
                        ? 'border-coral bg-coral/8 text-plum'
                        : 'border-plum/12 text-plum/80 hover:border-plum/25'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="accent-coral h-4 w-4 shrink-0"
                      checked={checked}
                      onChange={() => toggleIndustry(s)}
                    />
                    {s}
                  </label>
                );
              })}
            </div>
            {form.industries.includes('Others') && (
              <input
                className="input mt-2"
                value={form.industriesOther}
                onChange={(e) => setForm((f) => ({ ...f, industriesOther: e.target.value }))}
                placeholder="Please specify…"
                autoComplete="off"
              />
            )}
          </div>

          <div>
            <label htmlFor="sup-social" className="label">
              Facebook / Instagram / Website <span className="text-plum/40 font-normal">(optional)</span>
            </label>
            <input
              id="sup-social"
              className="input"
              value={form.social}
              onChange={(e) => setForm((f) => ({ ...f, social: e.target.value }))}
              placeholder="fb.com/yourbrand · @yourbrand"
              autoComplete="off"
            />
          </div>

          <div>
            <label htmlFor="sup-products" className="label">
              Products &amp; services <span className="text-plum/40 font-normal">(optional)</span>
            </label>
            <textarea
              id="sup-products"
              className="input min-h-[70px]"
              value={form.products}
              onChange={(e) => setForm((f) => ({ ...f, products: e.target.value }))}
              placeholder="What do you offer? e.g. wedding gowns, catering packages, photo & video…"
            />
          </div>

          {/* Basic Requirements — DTI & BIR file upload */}
          <div>
            <div className="label mb-1">
              Basic Requirements: DTI &amp; BIR <span className="text-coral" aria-hidden="true">*</span>
            </div>
            <p className="text-xs text-plum/60 mb-2 leading-relaxed">
              Sole Proprietorship: DTI Certificate · Corporations/Partnerships: SEC Registration ·
              For all: updated BIR Form 2303 and latest Tax Clearance. Upload a PDF or take a clear
              photo of each document — up to 5 files.
            </p>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/*,application/pdf,.pdf,.jpg,.jpeg,.png,.heic,.heif,.webp"
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-plum/25 bg-cream/40 px-4 py-4 cursor-pointer hover:border-coral text-plum/70 text-sm transition"
            >
              <Upload size={16} aria-hidden="true" /> Add file(s)
            </button>
            {files.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {files.map((f, i) => (
                  <li
                    key={`${f.name}-${i}`}
                    className="flex items-center justify-between gap-2 text-sm bg-cream/60 rounded-lg px-3 py-2"
                  >
                    <span className="inline-flex items-center gap-2 min-w-0">
                      <FileText size={14} className="text-coral shrink-0" aria-hidden="true" />
                      <span className="truncate">{f.name}</span>
                      <span className="text-plum/40 text-xs shrink-0">
                        {(f.size / 1024 / 1024).toFixed(1)}MB
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setFiles((prev) => prev.filter((_, x) => x !== i))}
                      className="text-plum/40 hover:text-coral shrink-0"
                      aria-label={`Remove ${f.name}`}
                    >
                      <X size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label htmlFor="sup-message" className="label">
              Any questions or inquiries? <span className="text-plum/40 font-normal">(optional)</span>
            </label>
            <textarea
              id="sup-message"
              className="input min-h-[70px]"
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              placeholder="Booth size, which venue you prefer, questions…"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="btn-primary w-full text-base inline-flex items-center justify-center gap-2"
          >
            {busy ? 'Submitting…' : (<>Submit application <Send size={16} aria-hidden="true" /></>)}
          </button>
          <p className="text-center text-xs text-plum/60">
            By submitting, you agree we may contact you about FIAD supplier opportunities.
          </p>
        </form>
      </section>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-5 pt-6 text-center">
        <div className="inline-flex items-center gap-1.5 text-sm text-plum/60">
          <CalendarDays size={14} className="text-champagne" aria-hidden="true" /> Forever in a Day
          Season 2 · 2026
        </div>
      </footer>
    </div>
  );
}
