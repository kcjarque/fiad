import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Phone, Mail, Globe, UserPlus, Share2, FileText, MapPin, Check, X,
} from 'lucide-react';
import { getStoreByQr } from '../services/storeService';
import { S2_VENUES } from '../stores/eventStore';
import type { Store } from '../types';

const venueLabel = (eventId: string) =>
  S2_VENUES.find((v) => v.id === eventId)?.label ?? 'Forever in a Day · Season 2';

const isInstagram = (url?: string) => !!url && /instagram\.com/i.test(url);

// Build a downloadable vCard so a scan → "Save to Contacts" in one tap.
const vcardHref = (s: Store) => {
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${s.name}`,
    `ORG:${s.name}`,
    s.category ? `TITLE:${s.category}` : '',
    s.contact ? `TEL;TYPE=CELL:${s.contact}` : '',
    s.email ? `EMAIL;TYPE=INTERNET:${s.email}` : '',
    s.socialMedia ? `URL:${s.socialMedia}` : '',
    `NOTE:Forever in a Day · Season 2 — Booth ${s.boothNumber}, ${venueLabel(s.eventId)}`,
    'END:VCARD',
  ].filter(Boolean);
  return `data:text/vcard;charset=utf-8,${encodeURIComponent(lines.join('\r\n'))}`;
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

  const igSocial = isInstagram(store.socialMedia);
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: store.name, text: `${store.name} — Forever in a Day supplier`, url });
      else { await navigator.clipboard.writeText(url); setShared(true); setTimeout(() => setShared(false), 1800); }
    } catch { /* user cancelled */ }
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

        {/* Quick actions */}
        <div className="mt-3 grid grid-cols-3 gap-3">
          {store.contact && (
            <a href={`tel:${store.contact.replace(/\s/g, '')}`} className="flex flex-col items-center gap-1.5 rounded-2xl bg-white shadow-card py-3.5 text-plum/80 hover:text-coral transition">
              <Phone size={19} /><span className="text-[11px] font-medium">Call</span>
            </a>
          )}
          {store.email && (
            <a href={`mailto:${store.email}`} className="flex flex-col items-center gap-1.5 rounded-2xl bg-white shadow-card py-3.5 text-plum/80 hover:text-coral transition">
              <Mail size={19} /><span className="text-[11px] font-medium">Email</span>
            </a>
          )}
          {store.socialMedia && (
            <a href={store.socialMedia} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1.5 rounded-2xl bg-white shadow-card py-3.5 text-plum/80 hover:text-coral transition">
              <Globe size={19} />
              <span className="text-[11px] font-medium">{igSocial ? 'Instagram' : 'Facebook'}</span>
            </a>
          )}
        </div>

        {/* Packages / promos */}
        {store.packagesUrl && (
          <button
            onClick={() => setPromoOpen(true)}
            className="mt-3 w-full flex items-center justify-center gap-2 rounded-2xl bg-white border border-champagne/50 text-plum font-medium py-3.5 shadow-card hover:border-champagne transition"
          >
            <FileText size={17} className="text-champagne" /> View Packages &amp; Promos
          </button>
        )}

        {/* Details */}
        <div className="mt-6 bg-white rounded-2xl shadow-card divide-y divide-plum/5">
          {store.contact && (
            <a href={`tel:${store.contact.replace(/\s/g, '')}`} className="flex items-center gap-3 px-4 py-3.5">
              <Phone size={16} className="text-coral shrink-0" />
              <span className="text-sm text-plum">{store.contact}</span>
            </a>
          )}
          {store.email && (
            <a href={`mailto:${store.email}`} className="flex items-center gap-3 px-4 py-3.5">
              <Mail size={16} className="text-coral shrink-0" />
              <span className="text-sm text-plum break-all">{store.email}</span>
            </a>
          )}
          {store.socialMedia && (
            <a href={store.socialMedia} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3.5">
              <Globe size={16} className="text-coral shrink-0" />
              <span className="text-sm text-plum truncate">{igSocial ? 'Instagram' : 'Facebook'}</span>
            </a>
          )}
        </div>

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
            <button onClick={() => setPromoOpen(false)} aria-label="Close" className="p-1 -mr-1"><X size={22} /></button>
          </div>
          <div className="flex-1 overflow-auto px-3 pb-6" onClick={(e) => e.stopPropagation()}>
            <img src={store.packagesUrl} alt={`${store.name} packages and promos`} className="w-full rounded-xl bg-white shadow-soft" />
          </div>
        </div>
      )}
    </div>
  );
}
