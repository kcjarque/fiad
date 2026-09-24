import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Mail, Phone, Store, Globe, FileText } from 'lucide-react';
import { AdminShell } from '../../components/admin/AdminShell';
import { listSupplierSignups } from '../../services/supplierService';
import { formatDate } from '../../utils/id';
import { CURRENT_INTAKE_SEASON } from '../../constants/season';

export function AdminSupplierSignups() {
  const { data: signups = [] } = useQuery({ queryKey: ['supplier-signups'], queryFn: listSupplierSignups });
  const [query, setQuery] = useState('');
  // Default to the season currently taking applications, so the page opens on
  // the intake being worked rather than on every application ever received.
  const [season, setSeason] = useState<string>(CURRENT_INTAKE_SEASON);

  // Built from the data, so a season appears here as soon as it has one
  // application — including any this page has never heard of.
  const seasons = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of signups) counts.set(s.season, (counts.get(s.season) ?? 0) + 1);
    if (!counts.has(CURRENT_INTAKE_SEASON)) counts.set(CURRENT_INTAKE_SEASON, 0);
    return [...counts.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [signups]);

  const filtered = useMemo(() => {
    const bySeason = season === 'all' ? signups : signups.filter((s) => s.season === season);
    const q = query.trim().toLowerCase();
    if (!q) return bySeason;
    return bySeason.filter(
      (s) =>
        s.businessName.toLowerCase().includes(q) ||
        s.contactPerson.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.mobile.toLowerCase().includes(q) ||
        (s.category ?? '').toLowerCase().includes(q) ||
        (s.products ?? '').toLowerCase().includes(q) ||
        (s.message ?? '').toLowerCase().includes(q),
    );
  }, [signups, query, season]);

  return (
    <AdminShell>
      <div className="flex items-end justify-between mb-4 md:mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl md:text-3xl">Supplier sign-ups</h1>
          <p className="text-sm text-plum/60 mt-1">
            {filtered.length} {filtered.length === 1 ? 'application' : 'applications'}
            {season === 'all' ? ' across all seasons' : ` for ${season}`} from the /suppliers page
          </p>
          <div className="flex items-center gap-1.5 mt-3 flex-wrap text-xs">
            <button
              onClick={() => setSeason('all')}
              className={`px-3 py-1 rounded-full border transition ${
                season === 'all'
                  ? 'bg-plum text-cream border-plum'
                  : 'border-plum/15 text-plum/70 hover:border-plum/30'
              }`}
            >
              All {signups.length}
            </button>
            {seasons.map(([name, count]) => (
              <button
                key={name}
                onClick={() => setSeason(name)}
                className={`px-3 py-1 rounded-full border transition ${
                  season === name
                    ? 'bg-plum text-cream border-plum'
                    : 'border-plum/15 text-plum/70 hover:border-plum/30'
                }`}
              >
                {name} {count}
                {name === CURRENT_INTAKE_SEASON ? ' · open' : ''}
              </button>
            ))}
          </div>
        </div>
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-plum/40" />
          <input
            type="text"
            className="input !pl-9"
            placeholder="Search business, contact, category"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center max-w-2xl">
          <div className="font-display text-xl text-plum">
            {signups.length === 0 ? 'No supplier sign-ups yet' : 'No matches'}
          </div>
          <p className="text-sm text-plum/60 mt-1">
            {signups.length === 0
              ? 'Applications appear here when a supplier submits the form at /suppliers.'
              : 'Try a different search term.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-w-3xl">
          {filtered.map((s) => (
            <div key={s.id} className="card !p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="font-medium text-plum inline-flex items-center gap-1.5">
                    <Store size={15} className="text-coral shrink-0" /> {s.businessName}
                  </div>
                  <div className="text-sm text-plum/70 mt-0.5">{s.contactPerson}</div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-plum/70">
                    <a href={`mailto:${s.email}`} className="inline-flex items-center gap-1.5 hover:text-coral">
                      <Mail size={13} className="text-plum/40" /> {s.email}
                    </a>
                    <a href={`tel:${s.mobile}`} className="inline-flex items-center gap-1.5 hover:text-coral">
                      <Phone size={13} className="text-plum/40" /> {s.mobile}
                    </a>
                    {s.social && (
                      <span className="inline-flex items-center gap-1.5 break-all">
                        <Globe size={13} className="text-plum/40" /> {s.social}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-xs text-plum/50 shrink-0">{formatDate(s.createdAt)}</div>
              </div>
              {s.category && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {s.category.split(', ').map((c) => (
                    <span key={c} className="chip">{c}</span>
                  ))}
                </div>
              )}
              {s.documentUrls && s.documentUrls.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {s.documentUrls.map((url, i) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs bg-plum/5 hover:bg-plum/10 text-plum px-2.5 py-1.5 rounded-lg transition"
                    >
                      <FileText size={13} className="text-coral" /> DTI doc {i + 1}
                    </a>
                  ))}
                </div>
              )}
              {s.products && (
                <p className="text-sm text-plum/80 mt-2 whitespace-pre-wrap border-l-2 border-champagne pl-3">
                  {s.products}
                </p>
              )}
              {s.message && (
                <p className="text-sm text-plum/70 mt-2 whitespace-pre-wrap border-l-2 border-plum/15 pl-3">
                  {s.message}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
