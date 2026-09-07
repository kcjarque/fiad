import { Link } from 'react-router-dom';
import { ArrowRight, KeyRound, UserPlus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { listEvents } from '../services/eventService';
import { S2_VENUES } from '../stores/eventStore';
import type { EventInfo } from '../types';

export function Landing() {
  // Show both Season 2 venues (in S2_VENUES order) with their dates.
  const { data: venues = [] } = useQuery({
    queryKey: ['landingSeason2Events'],
    queryFn: async (): Promise<EventInfo[]> => {
      const all = await listEvents();
      const byId = new Map(all.map((e) => [e.id, e]));
      return S2_VENUES.map((v) => byId.get(v.id)).filter((e): e is EventInfo => !!e);
    },
  });

  // Each event's date is Day 1; the fair runs that day + the next.
  const dayRange = (iso: string) => {
    const d1 = new Date(`${iso}T00:00:00`);
    const d2 = new Date(d1);
    d2.setDate(d2.getDate() + 1);
    const mo = (d: Date) => d.toLocaleDateString('en-PH', { month: 'short' });
    return d1.getMonth() === d2.getMonth()
      ? `${mo(d1)} ${d1.getDate()}–${d2.getDate()}, ${d1.getFullYear()}`
      : `${mo(d1)} ${d1.getDate()} – ${mo(d2)} ${d2.getDate()}, ${d1.getFullYear()}`;
  };

  return (
    <div className="min-h-[100svh] bg-gradient-to-b from-cream via-rose/20 to-rose/40 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 max-w-md mx-auto w-full">
        <div className="text-center">
          <img
            src="/logo.png"
            alt="Forever in a Day"
            className="mx-auto w-full max-w-[280px] sm:max-w-xs h-auto"
          />
          <p className="text-plum/70 mt-3">
            The wedding &amp; debut bazaar — raffles, passport stamps, and curated suppliers under one roof.
          </p>
          <div className="mt-4 flex flex-col items-center gap-2">
            <div className="text-[11px] uppercase tracking-[0.25em] text-plum/50">
              FIAD Season 2
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {venues.length === 0 ? (
                <div className="chip text-plum/50">…</div>
              ) : (
                venues.map((v) => (
                  <div key={v.id} className="chip">
                    {v.venue} · {dayRange(v.date)}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Guest-only entry */}
        <div className="mt-10 w-full space-y-3">
          <Link
            to="/app/login"
            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white shadow-card hover:shadow-soft transition"
          >
            <div className="h-11 w-11 rounded-full bg-coral text-white flex items-center justify-center shrink-0">
              <KeyRound size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-plum leading-tight">Sign in</div>
              <div className="text-xs text-plum/60">
                Use the email + access code we sent you
              </div>
            </div>
            <ArrowRight size={18} className="text-plum/40 shrink-0" />
          </Link>

          <Link
            to="/app/register"
            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white shadow-card hover:shadow-soft transition"
          >
            <div className="h-11 w-11 rounded-full bg-champagne text-plum flex items-center justify-center shrink-0">
              <UserPlus size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-plum leading-tight">Register</div>
              <div className="text-xs text-plum/60">
                New here? Create your event ticket in 30 seconds
              </div>
            </div>
            <ArrowRight size={18} className="text-plum/40 shrink-0" />
          </Link>
        </div>
      </div>

      {/* Operator entry — quiet footer link */}
      <footer className="text-center pb-8 px-6">
        <div className="text-[11px] text-plum/40 uppercase tracking-wider">
          Operators
        </div>
        <div className="flex gap-3 justify-center mt-1">
          <Link to="/store/login" className="text-xs text-plum/60 hover:text-plum underline-offset-2 hover:underline">
            Store login
          </Link>
          <span className="text-plum/30">·</span>
          <Link to="/admin/login" className="text-xs text-plum/60 hover:text-plum underline-offset-2 hover:underline">
            Admin login
          </Link>
        </div>
        <div className="text-[10px] text-plum/40 mt-4">
          Forever in a Day © 2026
        </div>
      </footer>
    </div>
  );
}
