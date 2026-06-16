import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Mail, Phone } from 'lucide-react';
import { AdminShell } from '../../components/admin/AdminShell';
import { listInquiries } from '../../services/inquiryService';
import { formatDate } from '../../utils/id';

export function AdminInquiries() {
  const { data: inquiries = [] } = useQuery({ queryKey: ['inquiries'], queryFn: listInquiries });
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return inquiries;
    return inquiries.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.email.toLowerCase().includes(q) ||
        i.phone.toLowerCase().includes(q) ||
        (i.eventType ?? '').toLowerCase().includes(q) ||
        (i.message ?? '').toLowerCase().includes(q),
    );
  }, [inquiries, query]);

  return (
    <AdminShell>
      <div className="flex items-end justify-between mb-4 md:mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl md:text-3xl">Inquiries</h1>
          <p className="text-sm text-plum/60 mt-1">
            {inquiries.length} {inquiries.length === 1 ? 'lead' : 'leads'} from the
            “Need help organizing your event?” form
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-plum/40" />
          <input
            type="text"
            className="input !pl-9"
            placeholder="Search name, email, message"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center max-w-2xl">
          <div className="font-display text-xl text-plum">
            {inquiries.length === 0 ? 'No inquiries yet' : 'No matches'}
          </div>
          <p className="text-sm text-plum/60 mt-1">
            {inquiries.length === 0
              ? 'Leads appear here when someone taps “Need help organizing your event?” on the registration thank-you page.'
              : 'Try a different search term.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-w-3xl">
          {filtered.map((i) => (
            <div key={i.id} className="card !p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="font-medium text-plum">{i.name}</div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-plum/70">
                    <a href={`mailto:${i.email}`} className="inline-flex items-center gap-1.5 hover:text-coral">
                      <Mail size={13} className="text-plum/40" /> {i.email}
                    </a>
                    <a href={`tel:${i.phone}`} className="inline-flex items-center gap-1.5 hover:text-coral">
                      <Phone size={13} className="text-plum/40" /> {i.phone}
                    </a>
                  </div>
                </div>
                <div className="text-xs text-plum/50 shrink-0">{formatDate(i.createdAt)}</div>
              </div>
              {i.eventType && (
                <div className="mt-2">
                  <span className="chip">{i.eventType}</span>
                </div>
              )}
              {i.message && (
                <p className="text-sm text-plum/80 mt-2 whitespace-pre-wrap border-l-2 border-champagne pl-3">
                  {i.message}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
