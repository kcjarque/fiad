import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Phone, Mail, Globe, UserPlus, Share2, FileText, MapPin, Check, X, ExternalLink, CalendarCheck,
} from 'lucide-react';
import { getStoreByQr } from '../services/storeService';
import { createBooking } from '../services/bookingService';
import { S2_VENUES } from '../stores/eventStore';
import type { Store, ContactEntry } from '../types';

const venueLabel = (eventId: string) =>
  S2_VENUES.find((v) => v.id === eventId)?.label ?? 'Forever in a Day · Season 2';

const isInstagram = (url?: string) => !!url && /instagram\.com/i.test(url);

// Build a downloadable vCard so a scan → "Save to Contacts" in one tap.
const vcardHref = (s: Store) => {
  const lines = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${s.name}`, `ORG:${s.name}`, s.category ? `TITLE:${s.category}` : ''];
  getEntries(s).forEach((c) => {
    if (c.phone) lines.push(`TEL;TYPE=CELL:${c.phone}`);
    if (c.email) lines.push(`EMAIL;TYPE=INTERNET:${c.email}`);
    if (c.social) lines.push(`URL:${c.social}`);
  });
  lines.push(`NOTE:Forever in a Day · Season 2 — Booth ${s.boothNumber}, ${venueLabel(s.eventId)}`, 'END:VCARD');
  return `data:text/vcard;charset=utf-8,${encodeURIComponent(lines.filter(Boolean).join('\r\n'))}`;
};

// Multi-brand contacts, falling back to the legacy single fields.
const getEntries = (s: Store): ContactEntry[] => {
  if (s.contacts && s.contacts.length) return s.contacts.filter((c) => c.phone || c.email || c.social);
  if (s.contact || s.email || s.socialMedia) return [{ phone: s.contact, email: s.email, social: s.socialMedia }];
  return [];
};

export function CallingCard() {
  const { token } = useParams<{ token: string }>();
  const { data: store, isLoading } = useQuery({
    queryKey: ['card', token],
    queryFn: () => (token ? getStoreByQr(token) : Promise.resolve(undefined)),
    enabled: !!token,
  });
  const [shared, setShared] = useState(false);
  const [promoOpen, setPromoOpen] = useState(false);
  const [bookOpen, setBookOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({ name: '', mobile: '', email: '', date: '', message: '' });

  if (isLoading) {
    return <div className="min-h-[100svh] bg-cream flex items-center justify-center text-plum/50">Loading…</div>;
  }
  if (!store) {
    return (
      <div className="min-h-[100svh] bg-cream flex flex-col items-center justify-center p-6 text-center">
        <div className="font-cormorant text-3xl text-plum">Card not found</div>
        <p className="text-plum/60 mt-2 text-sm max-w-xs">This calling card link is invalid or the supplier is no longer listed.</p>
      </div>
    );
  }

  const entries = getEntries(store);
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: store.name, text: `${store.name} — Forever in a Day supplier`, url });
      else { await navigator.clipboard.writeText(url); setShared(true); setTimeout(() => setShared(false), 1800); }
    } catch { /* user cancelled */ }
  };

  const submitBooking = async () => {
    if (submitting) return;
    if (!form.name.trim() || (!form.mobile.trim() && !form.email.trim())) {
      setErr('Please enter your name and a mobile number or email.');
      return;
    }
    setErr('');
    setSubmitting(true);
    try {
      await createBooking({
        storeId: store.id,
        eventId: store.eventId,
        clientName: form.name,
        clientMobile: form.mobile,
        clientEmail: form.email,
        eventDate: form.date,
        message: form.message,
      });
      setSubmitted(true);
      setForm({ name: '', mobile: '', email: '', date: '', message: '' });
    } catch {
      setErr('Could not send your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100svh] bg-gradient-to-b from-cream via-cream to-rose/25">
      {/* faint gold dot texture, like the ticket hero */}
      <div
        className="fixed inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 30%, #D4AF7A 1px, transparent 1px), radial-gradient(circle at 70% 60%, #D4AF7A 1px, transparent 1px)',
          backgroundSize: '110px 110px, 150px 150px',
        }}
      />

      <div className="relative max-w-md mx-auto px-5 py-9">
        {/* Brand eyebrow */}
        <div className="text-center">
          <div className="font-script text-3xl text-coral leading-none">Forever in a Day</div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.35em] text-plum/45">Season 2 · Supplier Card</div>
        </div>

        {/* Logo */}
        <div className="mt-6 flex justify-center">
          <div className="bg-white rounded-3xl shadow-soft ring-1 ring-champagne/30 p-5 w-36 h-36 flex items-center justify-center">
            {store.logoUrl
              ? <img src={store.logoUrl} alt={store.name} className="max-w-full max-h-full object-contain" />
              : <span className="font-cormorant text-4xl text-plum/30">{store.name.slice(0, 1)}</span>}
          </div>
        </div>

        {/* Name + category + booth */}
        <div className="mt-5 text-center">
          <h1 className="font-cormorant text-[34px] leading-tight text-plum">{store.name}</h1>
          {store.category && (
            <div className="mt-1 text-[11px] uppercase tracking-[0.25em] text-plum/50">{store.category}</div>
          )}
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white border border-champagne/40 px-3.5 py-1.5 text-xs text-plum/70 shadow-sm">
            <MapPin size={13} className="text-coral" /> Booth {store.boothNumber} · {venueLabel(store.eventId)}
          </div>
        </div>

        {/* Primary CTA — Save to Contacts */}
        <a
          href={vcardHref(store)}
          download={`${store.name}.vcf`}
          className="mt-7 w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-coral to-[#8B2348] text-cream font-medium py-3.5 shadow-soft active:scale-[0.99] transition"
        >
          <UserPlus size={18} /> Save to Contacts
        </a>

        {/* Book / inquire — evergreen, still works after the fair ends */}
        <button
          onClick={() => { setSubmitted(false); setErr(''); setBookOpen(true); }}
          className="mt-3 w-full flex items-center justify-center gap-2 rounded-2xl bg-white border border-coral/40 text-coral font-medium py-3.5 shadow-card hover:bg-coral/5 transition"
        >
          <CalendarCheck size={18} /> Request a booking
        </button>

        {/* Contacts — one block per brand sharing the booth */}
        {entries.map((c, i) => (
          <div key={i} className="mt-3 bg-white rounded-2xl shadow-card overflow-hidden">
            {c.label && (
              <div className="px-4 pt-3 pb-1 text-[11px] uppercase tracking-[0.22em] text-champagne font-medium">{c.label}</div>
            )}
            <div className="divide-y divide-plum/5">
              {c.phone && (
                <a href={`tel:${c.phone.replace(/\s/g, '')}`} className="flex items-center gap-3 px-4 py-3.5">
                  <Phone size={16} className="text-coral shrink-0" /><span className="text-sm text-plum">{c.phone}</span>
                </a>
              )}
              {c.email && (
                <a href={`mailto:${c.email}`} className="flex items-center gap-3 px-4 py-3.5">
                  <Mail size={16} className="text-coral shrink-0" /><span className="text-sm text-plum break-all">{c.email}</span>
                </a>
              )}
              {c.social && (
                <a href={c.social} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3.5">
                  <Globe size={16} className="text-coral shrink-0" /><span className="text-sm text-plum truncate">{isInstagram(c.social) ? 'Instagram' : 'Facebook'}</span>
                </a>
              )}
            </div>
          </div>
        ))}

        {/* Packages / promos */}
        {store.packagesUrl && (
          <button
            onClick={() => setPromoOpen(true)}
            className="mt-3 w-full flex items-center justify-center gap-2 rounded-2xl bg-white border border-champagne/50 text-plum font-medium py-3.5 shadow-card hover:border-champagne transition"
          >
            <FileText size={17} className="text-champagne" /> View Packages &amp; Promos
          </button>
        )}

        {/* Share */}
        <button onClick={share} className="mt-4 w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-medium text-plum/70 hover:text-plum transition">
          {shared ? <><Check size={16} className="text-coral" /> Link copied</> : <><Share2 size={16} /> Share this card</>}
        </button>

        <div className="mt-6 text-center text-[10px] uppercase tracking-[0.3em] text-plum/35">
          Forever in a Day · Weddings, Events &amp; Debut Fair
        </div>
      </div>

      {promoOpen && store.packagesUrl && (
        <div className="fixed inset-0 z-50 bg-plum/85 backdrop-blur-sm flex flex-col" onClick={() => setPromoOpen(false)}>
          <div className="flex items-center justify-between px-4 py-3 text-cream shrink-0">
            <div className="text-sm font-medium truncate">{store.name} · Packages &amp; Promos</div>
            <div className="flex items-center gap-3">
              <a href={store.packagesUrl} target="_blank" rel="noopener noreferrer" className="text-cream/80 text-xs inline-flex items-center gap-1"><ExternalLink size={14} /> Open</a>
              <button onClick={() => setPromoOpen(false)} aria-label="Close" className="p-1 -mr-1"><X size={22} /></button>
            </div>
          </div>
          <div className="flex-1 overflow-auto px-3 pb-6" onClick={(e) => e.stopPropagation()}>
            {/\.pdf(\?|$)/i.test(store.packagesUrl) ? (
              <iframe title={`${store.name} packages and promos`} src={store.packagesUrl} className="w-full rounded-xl bg-white shadow-soft" style={{ height: '80vh', border: 0 }} />
            ) : (
              <img src={store.packagesUrl} alt={`${store.name} packages and promos`} className="w-full rounded-xl bg-white shadow-soft" />
            )}
          </div>
        </div>
      )}

      {bookOpen && (
        <div className="fixed inset-0 z-50 bg-plum/70 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4" onClick={() => !submitting && setBookOpen(false)}>
          <div className="bg-cream w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-soft max-h-[92svh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-1">
              <div className="font-cormorant text-2xl text-plum">Request a booking</div>
              <button onClick={() => !submitting && setBookOpen(false)} aria-label="Close" className="text-plum/50 p-1"><X size={22} /></button>
            </div>
            {submitted ? (
              <div className="px-5 pb-8 pt-4 text-center">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 mb-3"><Check size={30} /></div>
                <div className="font-cormorant text-2xl text-plum">Request sent!</div>
                <p className="text-sm text-plum/60 mt-1">{store.name} will reach out about their rates &amp; packages.</p>
                <button onClick={() => setBookOpen(false)} className="mt-5 w-full rounded-2xl bg-gradient-to-r from-coral to-[#8B2348] text-cream font-medium py-3">Done</button>
              </div>
            ) : (
              <div className="px-5 pb-6 pt-1 space-y-3">
                <p className="text-sm text-plum/60">Interested in {store.name}'s rates or promos? Send a request — they'll get back to you, even after the fair.</p>
                <input className="input" placeholder="Your name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <input className="input" placeholder="Mobile number" inputMode="tel" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
                <input className="input" placeholder="Email" inputMode="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <input className="input" placeholder="Event date (optional)" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                <textarea className="input" rows={3} placeholder="What are you interested in? (package, budget, etc.)" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
                {err && <div className="text-sm text-red-600">{err}</div>}
                <button
                  onClick={submitBooking}
                  disabled={submitting}
                  className="w-full rounded-2xl bg-gradient-to-r from-coral to-[#8B2348] text-cream font-medium py-3.5 shadow-soft disabled:opacity-50 active:scale-[0.99] transition"
                >
                  {submitting ? 'Sending…' : 'Send request'}
                </button>
                <p className="text-[11px] text-plum/40 text-center">We share your details with {store.name} so they can contact you.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
