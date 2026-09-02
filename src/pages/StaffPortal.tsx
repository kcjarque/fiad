import { useEffect, useMemo, useState } from 'react';
import { Search, LogOut, Download, Lock, Mail, Phone, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from '../stores/toastStore';

type Contact = { name: string; email: string; mobile: string; venue: string };
const TOKEN_KEY = 'fiad.staff.token';
const NAME_KEY = 'fiad.staff.name';

/**
 * Gated supplier portal (/staff). A supplier signs in with a username +
 * password and sees ONLY their scoped registrant contacts — no admin, no other
 * data. All access flows through the `staff` edge function (service role); this
 * page never reads the guests table directly.
 */
export function StaffPortal() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [businessName, setBusinessName] = useState<string>(() => localStorage.getItem(NAME_KEY) || '');
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [creds, setCreds] = useState({ username: '', password: '' });
  const [query, setQuery] = useState('');

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(NAME_KEY);
    setToken(null);
    setContacts(null);
    setBusinessName('');
  };

  const loadContacts = async (t: string) => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('staff', {
      body: { mode: 'contacts', token: t },
    });
    setLoading(false);
    if (error || !data?.ok) {
      logout();
      toast.error(data?.error || 'Your session expired — please sign in again.');
      return;
    }
    setContacts(data.contacts as Contact[]);
    setBusinessName(data.businessName);
    localStorage.setItem(NAME_KEY, data.businessName);
  };

  useEffect(() => {
    if (token) loadContacts(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('staff', {
      body: { mode: 'login', username: creds.username, password: creds.password },
    });
    setLoading(false);
    if (error || !data?.ok) {
      toast.error(data?.error || 'Sign-in failed. Please try again.');
      return;
    }
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(NAME_KEY, data.businessName);
    setToken(data.token);
    setBusinessName(data.businessName);
    void loadContacts(data.token);
  };

  const filtered = useMemo(() => {
    if (!contacts) return [];
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.mobile.toLowerCase().includes(q),
    );
  }, [contacts, query]);

  const exportCsv = () => {
    if (!contacts || contacts.length === 0) return;
    const rows = [
      ['Name', 'Email', 'Mobile', 'Venue'],
      ...contacts.map((c) => [c.name, c.email, c.mobile, c.venue]),
    ];
    const csv = rows
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${(businessName || 'contacts').replace(/[^a-z0-9]+/gi, '-')}-contacts.csv`;
    a.click();
  };

  // ── Login ──────────────────────────────────────────────────────────────────
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <img src="/logo.png" alt="Forever in a Day" className="h-10 mx-auto" />
            <div className="mt-4 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] text-coral">
              <Lock size={12} aria-hidden="true" /> Supplier portal
            </div>
            <h1 className="font-display text-2xl text-plum mt-1">Sign in to your contacts</h1>
          </div>
          <form onSubmit={login} className="card space-y-4">
            <div>
              <label className="label" htmlFor="staff-user">Username</label>
              <input
                id="staff-user"
                className="input"
                autoCapitalize="none"
                autoComplete="username"
                value={creds.username}
                onChange={(e) => setCreds((c) => ({ ...c, username: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="staff-pass">Password</label>
              <input
                id="staff-pass"
                type="password"
                className="input"
                autoComplete="current-password"
                value={creds.password}
                onChange={(e) => setCreds((c) => ({ ...c, password: e.target.value }))}
                required
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <p className="text-center text-xs text-plum/50 mt-4">
            Access is limited to your registrant contacts only.
          </p>
        </div>
      </div>
    );
  }

  // ── Contacts ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 bg-plum text-cream shadow-soft">
        <div className="max-w-4xl mx-auto px-5 h-16 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.2em] text-champagne">Supplier portal</div>
            <div className="font-medium truncate">{businessName}</div>
          </div>
          <button
            onClick={logout}
            className="text-cream/80 hover:text-cream text-sm inline-flex items-center gap-1.5 shrink-0"
          >
            <LogOut size={15} aria-hidden="true" /> Sign out
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-5 py-6">
        <div className="flex items-end justify-between gap-3 flex-wrap mb-4">
          <div>
            <h1 className="font-display text-2xl md:text-3xl text-plum">Your contacts</h1>
            <p className="text-sm text-plum/60 mt-1 inline-flex items-center gap-1.5">
              <Users size={14} aria-hidden="true" /> {contacts?.length ?? 0} registrants
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-plum/40" />
              <input
                className="input !pl-9 !py-2 w-48 sm:w-60"
                placeholder="Search name, email, mobile"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <button
              onClick={exportCsv}
              className="btn-secondary !py-2 inline-flex items-center gap-1.5 text-sm shrink-0"
            >
              <Download size={15} aria-hidden="true" /> CSV
            </button>
          </div>
        </div>

        {loading && !contacts ? (
          <div className="card text-center text-plum/60">Loading contacts…</div>
        ) : (
          <div className="card !p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-plum/60 border-b border-plum/10">
                  <th className="py-2.5 px-4">Name</th>
                  <th className="py-2.5 px-4">Email</th>
                  <th className="py-2.5 px-4">Mobile</th>
                  <th className="py-2.5 px-4">Venue</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={`${c.email}-${i}`} className="border-b border-plum/5 last:border-0">
                    <td className="py-2.5 px-4 font-medium text-plum whitespace-nowrap">{c.name}</td>
                    <td className="py-2.5 px-4">
                      <a href={`mailto:${c.email}`} className="text-plum/75 hover:text-coral inline-flex items-center gap-1.5">
                        <Mail size={13} className="text-plum/40 shrink-0" aria-hidden="true" /> {c.email}
                      </a>
                    </td>
                    <td className="py-2.5 px-4">
                      <a href={`tel:${c.mobile}`} className="text-plum/75 hover:text-coral inline-flex items-center gap-1.5 whitespace-nowrap">
                        <Phone size={13} className="text-plum/40 shrink-0" aria-hidden="true" /> {c.mobile}
                      </a>
                    </td>
                    <td className="py-2.5 px-4 text-plum/60 whitespace-nowrap">{c.venue}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-plum/50">No matches.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
