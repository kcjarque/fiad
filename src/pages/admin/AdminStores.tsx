import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy } from 'lucide-react';
import { AdminShell } from '../../components/admin/AdminShell';
import { createStore, deleteStore, listStores, updateStore, uploadStoreLogo, uploadStorePackages } from '../../services/storeService';
import { Modal } from '../../components/shared/Modal';
import { toast } from '../../stores/toastStore';
import type { Store, ContactEntry } from '../../types';
import { useEventStore } from '../../stores/eventStore';
import { ContactsEditor, seedContacts, cleanContacts } from '../../components/shared/ContactsEditor';

const empty = { name: '', category: '', description: '', logoUrl: '', boothNumber: '', passcode: '', packagesUrl: '', contacts: [] as ContactEntry[] };
const isPdf = (u?: string) => !!u && /\.pdf(\?|$)/i.test(u);

// 6-char no-confusion alphabet (skips 0/O/1/I/L).
const generatePasscode = (): string => {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < bytes.length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
};

const copyToClipboard = async (text: string, label: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  } catch {
    toast.error('Could not copy — long-press to copy manually');
  }
};

export function AdminStores() {
  const queryClient = useQueryClient();
  const selectedEventId = useEventStore((s) => s.selectedEventId);
  const { data: stores = [] } = useQuery({ queryKey: ['stores', selectedEventId], queryFn: listStores });
  const [editing, setEditing] = useState<Store | null>(null);
  const [draft, setDraft] = useState(empty);
  const [addOpen, setAddOpen] = useState(false);
  // After a new store is created, show its credentials so the admin can share them.
  const [justCreated, setJustCreated] = useState<Store | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Snapshot the File synchronously (before clearing the input) — clearing the
  // input first would empty the live FileList and drop the file on some browsers.
  const onLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingLogo(true);
    try {
      const url = await uploadStoreLogo(file);
      setDraft((d) => ({ ...d, logoUrl: url }));
      toast.success('Logo uploaded');
    } catch (err) {
      toast.error(`Logo upload failed: ${(err as Error).message}`);
    } finally {
      setUploadingLogo(false);
    }
  };

  const [uploadingPkg, setUploadingPkg] = useState(false);
  const onPkgFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingPkg(true);
    try {
      const url = await uploadStorePackages(file);
      setDraft((d) => ({ ...d, packagesUrl: url }));
      toast.success('Packages file uploaded');
    } catch (err) {
      toast.error(`Upload failed: ${(err as Error).message}`);
    } finally {
      setUploadingPkg(false);
    }
  };

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['stores'] });
    queryClient.invalidateQueries({ queryKey: ['storesForLogin'] });
  };

  const save = async () => {
    if (!draft.name.trim()) return toast.error('Name is required.');
    if (!draft.category.trim()) return toast.error('Category is required.');
    if (!draft.boothNumber.trim()) return toast.error('Booth number is required.');
    try {
      if (editing) {
        const updated = await updateStore(editing.id, { ...draft, contacts: cleanContacts(draft.contacts) });
        toast.success('Vendor updated');
        setEditing(null);
        setDraft(empty);
        refresh();
        return updated;
      }
      const passcode = generatePasscode();
      const logoUrl =
        draft.logoUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(draft.name)}`;
      const created = await createStore({ ...draft, passcode, logoUrl, contacts: cleanContacts(draft.contacts) });
      setAddOpen(false);
      setDraft(empty);
      setJustCreated(created);
      refresh();
    } catch (err) {
      toast.error(`Save failed: ${(err as Error).message}`);
    }
  };

  const regeneratePasscode = () => {
    setDraft((d) => ({ ...d, passcode: generatePasscode() }));
  };

  const remove = async (s: Store) => {
    if (!confirm(`Delete ${s.name}? This will also remove all of their transactions.`)) return;
    try {
      await deleteStore(s.id);
      refresh();
    } catch (err) {
      toast.error(`Delete failed: ${(err as Error).message}`);
    }
  };

  const beginEdit = (s: Store) => {
    setEditing(s);
    setDraft({
      name: s.name,
      category: s.category,
      description: s.description,
      logoUrl: s.logoUrl,
      boothNumber: s.boothNumber,
      passcode: s.passcode,
      packagesUrl: s.packagesUrl ?? '',
      contacts: seedContacts(s),
    });
  };

  return (
    <AdminShell>
      <div className="flex items-center justify-between mb-4 md:mb-6 gap-3">
        <h1 className="font-display text-2xl md:text-3xl">Vendors</h1>
        <button
          className="btn-primary !px-4 !py-2 text-sm md:text-base md:!px-5 md:!py-3"
          onClick={() => { setDraft(empty); setAddOpen(true); }}
        >
          + Add vendor
        </button>
      </div>

      {stores.length === 0 ? (
        <div className="card text-center max-w-2xl">
          <div className="font-display text-xl text-plum">No vendors yet</div>
          <p className="text-sm text-plum/60 mt-1">
            Add your first vendor to get them a passcode and a booth QR they can print and display.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stores.map((s) => (
            <div key={s.id} className="card">
              <div className="flex items-center gap-3">
                <img src={s.logoUrl} alt="" className="w-14 h-14 rounded-xl" />
                <div className="flex-1 min-w-0">
                  <div className="font-display text-lg truncate">{s.name}</div>
                  <div className="text-xs text-plum/60">{s.category} · Booth {s.boothNumber}</div>
                </div>
              </div>
              <p className="mt-3 text-sm text-plum/70 line-clamp-3">{s.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button className="btn-ghost text-sm text-coral" onClick={() => window.open(`/admin/qr-cards?store=${s.id}`, '_blank')}>Export QR</button>
                <button className="btn-ghost text-sm" onClick={() => beginEdit(s)}>Edit</button>
                <button className="btn-ghost text-sm text-red-600" onClick={() => remove(s)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={addOpen || !!editing}
        onClose={() => { setAddOpen(false); setEditing(null); setDraft(empty); }}
        title={editing ? 'Edit vendor' : 'Add vendor'}
      >
        <div className="space-y-3">
          <div>
            <label className="label">Name</label>
            <input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Sweet Serenity Cakes" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Category</label>
              <input className="input" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder="e.g. Cake" />
            </div>
            <div>
              <label className="label">Booth #</label>
              <input className="input" value={draft.boothNumber} onChange={(e) => setDraft({ ...draft, boothNumber: e.target.value })} placeholder="e.g. A1" />
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={3} placeholder="Short blurb shown to guests" />
          </div>
          <div>
            <label className="label">Logo</label>
            <div className="flex items-center gap-3">
              {draft.logoUrl ? (
                <img src={draft.logoUrl} alt="" className="w-16 h-16 rounded-xl object-contain bg-white border border-plum/10 shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-plum/5 border border-plum/10 flex items-center justify-center text-[10px] text-plum/40 shrink-0">no logo</div>
              )}
              <div className="flex-1">
                <label className={`inline-flex items-center gap-2 rounded-lg border border-plum/15 px-3 py-2 text-sm cursor-pointer ${uploadingLogo ? 'opacity-60' : 'hover:border-coral hover:text-coral'} text-plum`}>
                  {uploadingLogo ? 'Uploading…' : 'Upload image'}
                  <input type="file" accept="image/*" className="hidden" disabled={uploadingLogo} onChange={onLogoFile} />
                </label>
                {draft.logoUrl && (
                  <button type="button" className="ml-2 text-xs text-plum/50 hover:text-plum" onClick={() => setDraft({ ...draft, logoUrl: '' })}>
                    Remove
                  </button>
                )}
              </div>
            </div>
            <input className="input mt-2 text-xs" value={draft.logoUrl} onChange={(e) => setDraft({ ...draft, logoUrl: e.target.value })} placeholder="…or paste an image URL" />
          </div>
          <div>
            <label className="label">Contacts</label>
            <p className="text-xs text-plum/50 mb-2 -mt-1">One per brand sharing the booth (e.g. BossLabs AI + Conex).</p>
            <ContactsEditor value={draft.contacts} onChange={(contacts) => setDraft({ ...draft, contacts })} />
          </div>
          <div>
            <label className="label">Promos &amp; packages (image or PDF)</label>
            <div className="flex items-center gap-3">
              {draft.packagesUrl
                ? (isPdf(draft.packagesUrl)
                    ? <div className="w-14 h-14 rounded-lg bg-coral/10 text-coral flex items-center justify-center shrink-0">PDF</div>
                    : <img src={draft.packagesUrl} alt="" className="w-14 h-14 rounded-lg object-cover bg-white border border-plum/10 shrink-0" />)
                : <div className="w-14 h-14 rounded-lg bg-plum/5 border border-plum/10 flex items-center justify-center text-[10px] text-plum/40 shrink-0">none</div>}
              <div className="flex-1">
                <label className={`inline-flex items-center gap-2 rounded-lg border border-plum/15 px-3 py-2 text-sm cursor-pointer ${uploadingPkg ? 'opacity-60' : 'hover:border-coral hover:text-coral'} text-plum`}>
                  {uploadingPkg ? 'Uploading…' : 'Upload image / PDF'}
                  <input type="file" accept="image/*,application/pdf" className="hidden" disabled={uploadingPkg} onChange={onPkgFile} />
                </label>
                {draft.packagesUrl && (
                  <button type="button" className="ml-2 text-xs text-plum/50 hover:text-plum" onClick={() => setDraft({ ...draft, packagesUrl: '' })}>Remove</button>
                )}
              </div>
            </div>
          </div>

          {editing && (
            <div>
              <label className="label flex items-center justify-between">
                <span>Passcode</span>
                <button type="button" className="text-xs text-coral font-medium" onClick={regeneratePasscode}>
                  Regenerate
                </button>
              </label>
              <div className="flex gap-2 items-center">
                <input className="input font-mono tracking-widest" value={draft.passcode} readOnly />
                <button
                  type="button"
                  className="btn-ghost !p-2"
                  onClick={() => copyToClipboard(draft.passcode, 'Passcode')}
                  aria-label="Copy passcode"
                >
                  <Copy size={16} />
                </button>
              </div>
              <div className="text-xs text-plum/50 mt-1">Share this with the vendor — they use it to sign in at /store/login.</div>
            </div>
          )}

          {!editing && (
            <div className="text-xs text-plum/50 bg-plum/5 rounded-lg p-3">
              A unique 6-character passcode will be generated automatically on save.
            </div>
          )}

          <button className="btn-primary w-full" onClick={save}>Save</button>
        </div>
      </Modal>

      <Modal
        open={!!justCreated}
        onClose={() => setJustCreated(null)}
        title="Vendor added"
      >
        {justCreated && (
          <div className="space-y-4">
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
              <div className="text-sm font-medium text-emerald-900">
                {justCreated.name} · Booth {justCreated.boothNumber}
              </div>
              <div className="text-xs text-emerald-800/80 mt-0.5">{justCreated.category}</div>
            </div>

            <div>
              <div className="label">Vendor sign-in passcode</div>
              <div className="flex gap-2 items-center mt-1">
                <div className="flex-1 input font-mono text-2xl text-center tracking-[0.5em] !py-3 bg-cream/60">
                  {justCreated.passcode}
                </div>
                <button
                  type="button"
                  className="btn-ghost !p-3"
                  onClick={() => copyToClipboard(justCreated.passcode, 'Passcode')}
                  aria-label="Copy passcode"
                >
                  <Copy size={18} />
                </button>
              </div>
              <div className="text-xs text-plum/60 mt-2">
                Share this with the vendor — they enter it at <span className="font-mono">/store/login</span>.
                Use "Export QR" to print their passport + calling-card QRs.
              </div>
            </div>

            <div className="flex gap-2">
              <button
                className="btn-ghost flex-1"
                onClick={() => { window.open(`/admin/qr-cards?store=${justCreated.id}`, '_blank'); setJustCreated(null); }}
              >
                Export QR card
              </button>
              <button className="btn-primary flex-1" onClick={() => setJustCreated(null)}>
                Done
              </button>
            </div>
          </div>
        )}
      </Modal>
    </AdminShell>
  );
}
