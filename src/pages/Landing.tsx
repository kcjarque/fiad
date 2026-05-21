import { Link } from 'react-router-dom';
import { ArrowRight, KeyRound, UserPlus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getActiveEvent } from '../services/eventService';

export function Landing() {
  const { data: event } = useQuery({ queryKey: ['activeEvent'], queryFn: getActiveEvent });
  const eventChip = event ? (event.name.split('—')[1]?.trim() ?? event.name) : '…';

  return (
    <div className="min-h-[100svh] bg-gradient-to-b from-cream to-rose/30 flex flex-col">
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
          <div className="mt-4 chip">{eventChip}</div>
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
