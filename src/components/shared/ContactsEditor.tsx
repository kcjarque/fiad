import { Plus, Trash2 } from 'lucide-react';
import type { ContactEntry } from '../../types';

// Repeatable contact list — one entry per brand sharing the booth
// (e.g. BossLabs AI + Conex). The parent seeds at least one entry.
export function ContactsEditor({
  value,
  onChange,
}: {
  value: ContactEntry[];
  onChange: (v: ContactEntry[]) => void;
}) {
  const rows = value.length ? value : [{ label: '', phone: '', email: '', social: '' }];
  const update = (i: number, patch: Partial<ContactEntry>) =>
    onChange(rows.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const add = () => onChange([...rows, { label: '', phone: '', email: '', social: '' }]);
  const remove = (i: number) => onChange(rows.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      {rows.map((c, i) => (
        <div key={i} className="rounded-xl border border-plum/10 bg-plum/[0.02] p-3 space-y-2">
          <div className="flex items-center gap-2">
            <input
              className="input !py-2 text-sm font-medium flex-1"
              value={c.label ?? ''}
              onChange={(e) => update(i, { label: e.target.value })}
              placeholder={`Brand / label${rows.length > 1 || i > 0 ? '' : ' (e.g. Conex)'}`}
            />
            {rows.length > 1 && (
              <button type="button" onClick={() => remove(i)} className="text-plum/40 hover:text-red-600 shrink-0" aria-label="Remove this contact">
                <Trash2 size={16} />
              </button>
            )}
          </div>
          <input className="input !py-2 text-sm" value={c.phone ?? ''} onChange={(e) => update(i, { phone: e.target.value })} placeholder="Phone — 0917 000 0000" />
          <input className="input !py-2 text-sm" value={c.email ?? ''} onChange={(e) => update(i, { email: e.target.value })} placeholder="Email — you@email.com" />
          <input className="input !py-2 text-sm" value={c.social ?? ''} onChange={(e) => update(i, { social: e.target.value })} placeholder="Facebook / Instagram link" />
        </div>
      ))}
      <button type="button" onClick={add} className="inline-flex items-center gap-1.5 text-sm text-coral font-medium">
        <Plus size={15} /> Add another contact
      </button>
    </div>
  );
}

// Seed the editor from a store's saved contacts, falling back to the legacy
// single phone/email/social so existing vendors don't start blank.
export function seedContacts(store: {
  contacts?: ContactEntry[];
  contact?: string;
  email?: string;
  socialMedia?: string;
}): ContactEntry[] {
  if (store.contacts && store.contacts.length) return store.contacts;
  if (store.contact || store.email || store.socialMedia) {
    return [{ label: '', phone: store.contact ?? '', email: store.email ?? '', social: store.socialMedia ?? '' }];
  }
  return [{ label: '', phone: '', email: '', social: '' }];
}

// Drop fully-empty rows before saving.
export const cleanContacts = (v: ContactEntry[]): ContactEntry[] =>
  v.map((c) => ({
    label: (c.label ?? '').trim(),
    phone: (c.phone ?? '').trim(),
    email: (c.email ?? '').trim(),
    social: (c.social ?? '').trim(),
  })).filter((c) => c.phone || c.email || c.social || c.label);
