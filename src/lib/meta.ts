// Meta (Facebook) Lead tracking for the ads funnel.
//
// Fires a deduplicated `Lead` conversion through BOTH:
//   • the browser Pixel (instant, but lost to ad-blockers / iOS)
//   • the Conversions API via the `meta-capi` edge function (server-side,
//     resilient) — using the SAME event_id so Meta deduplicates them.
//
// Everything is gated on VITE_META_PIXEL_ID (client) + the edge-function
// secrets (server). With neither configured, these are safe no-ops, so the
// funnel works before Meta is wired up.

import { supabase } from './supabase';

const PIXEL_ID: string | undefined = import.meta.env.VITE_META_PIXEL_ID;

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[];
  push?: unknown;
  loaded?: boolean;
  version?: string;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

let initialized = false;

/** Inject the Meta Pixel base code once and fire PageView. */
export const initMetaPixel = (): void => {
  if (!PIXEL_ID || initialized || typeof window === 'undefined' || window.fbq) return;
  initialized = true;

  const n = function (...args: unknown[]) {
    n.callMethod ? n.callMethod(...args) : n.queue!.push(args);
  } as Fbq;
  n.queue = [];
  n.loaded = true;
  n.version = '2.0';
  n.push = n;
  window.fbq = n;
  window._fbq = window._fbq ?? n;

  const t = document.createElement('script');
  t.async = true;
  t.src = 'https://connect.facebook.net/en_US/fbevents.js';
  const s = document.getElementsByTagName('script')[0];
  s.parentNode?.insertBefore(t, s);

  window.fbq('init', PIXEL_ID);
  window.fbq('track', 'PageView');
};

const readCookie = (name: string): string | undefined => {
  if (typeof document === 'undefined') return undefined;
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : undefined;
};

export type LeadData = {
  email: string;
  phone: string;
  name?: string;
  preferredDay?: string;
};

/**
 * Fire a deduplicated Lead. Browser Pixel + server Conversions API share one
 * event_id. Tracking must NEVER block or break registration, so the CAPI call
 * is best-effort and all failures are swallowed.
 */
export const trackLead = async (data: LeadData): Promise<void> => {
  const eventId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `lead_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const [firstName, ...rest] = (data.name ?? '').trim().split(/\s+/);
  const lastName = rest.join(' ');

  // 1) Browser Pixel
  if (PIXEL_ID && window.fbq) {
    window.fbq(
      'track',
      'Lead',
      { content_name: 'FIAD Season 2 RSVP', content_category: 'event_registration' },
      { eventID: eventId },
    );
  }

  // 2) Server-side Conversions API (best-effort)
  try {
    await supabase.functions.invoke('meta-capi', {
      body: {
        event_id: eventId,
        event_source_url: window.location.href,
        email: data.email,
        phone: data.phone,
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        fbp: readCookie('_fbp'),
        fbc: readCookie('_fbc'),
        custom: { content_name: 'FIAD Season 2 RSVP', preferred_day: data.preferredDay },
      },
    });
  } catch {
    /* never let tracking break the funnel */
  }
};
