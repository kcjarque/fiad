import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { QRCodeCanvas } from 'qrcode.react';
import { Printer, Download, ExternalLink, FileText } from 'lucide-react';
import { useAuth } from '../../stores/authStore';
import { getStore, updateStore, uploadStoreLogo, uploadStorePackages } from '../../services/storeService';
import { PageShell } from '../../components/shared/PageShell';
import { Card } from '../../components/shared/Card';
import { ContactsEditor, seedContacts, cleanContacts } from '../../components/shared/ContactsEditor';
import type { ContactEntry } from '../../types';
import { toast } from '../../stores/toastStore';

const isPdf = (u?: string) => !!u && /\.pdf(\?|$)/i.test(u);

// Supplier-facing: view + PRINT the QR calling card, and edit the card's own
// info (contact, email, socials, logo, promos/packages — image or PDF).
export function StoreCard() {
  const session = useAuth((s) => s.session);
  if (session.role !== 'store') return <Navigate to="/store/login" replace />;
  const storeId = session.storeId;
  const { data: store, refetch } = useQuery({ queryKey: ['store', storeId], queryFn: () => getStore(storeId) });
  const wrap = useRef<HTMLDivElement>(null);

  const [draft, setDraft] = useState<{ logoUrl: string; packagesUrl: string; contacts: ContactEntry[] }>({ logoUrl: '', packagesUrl: '', contacts: [] });
  const [savedSnapshot, setSavedSnapshot] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingPkg, setUploadingPkg] = useState(false);

  useEffect(() => {
    if (!store) return;
    const d = { logoUrl: store.logoUrl ?? '', packagesUrl: store.packagesUrl ?? '', contacts: seedContacts(store) };
    setDraft(d);
    setSavedSnapshot(JSON.stringify(d));
  }, [store]);

  if (!store) return null;
  const cardUrl = `https://www.fiad.app/card/${store.qrToken}`;
  const dirty = JSON.stringify(draft) !== savedSnapshot;

  const downloadPng = () => {
    const src = wrap.current?.querySelector('canvas');
    if (!src) return;
    const pad = 28;
    const out = document.createElement('canvas');
    out.width = src.width + pad * 2; out.height = src.height + pad * 2;
    const ctx = out.getContext('2d'); if (!ctx) return;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(src, pad, pad);
    const a = document.createElement('a');
    a.href = out.toDataURL('image/png'); a.download = `FIAD-${store.boothNumber}-calling-card-QR.png`; a.click();
  };

  const uploadFile = async (
    e: React.ChangeEvent<HTMLInputElement>,
    fn: (f: File) => Promise<string>,
    key: 'logoUrl' | 'packagesUrl',
    setBusy: (b: boolean) => void,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const url = await fn(file);
      setDraft((d) => ({ ...d, [key]: url }));
      toast.success('Uploaded');
    } catch (err) {
      toast.error(`Upload failed: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateStore(storeId, { ...draft, contacts: cleanContacts(draft.contacts) });
      toast.success('Your calling card is updated');
      await refetch();
    } catch (err) {
      toast.error(`Save failed: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell title="Your QR Calling Card" subtitle="Print your QR, and edit the info guests see when they scan it">
      <style>{`@media print { body * { visibility: hidden !important; } #store-card-print, #store-card-print * { visibility: visible !important; } #store-card-print { position: absolute; inset: 0 auto auto 0; width: 100%; } }`}</style>

      <Card className="text-center">
        <div id="store-card-print" className="flex flex-col items-center">
          <div className="text-[10px] uppercase tracking-[0.3em] text-champagne">Forever in a Day · Season 2</div>
          <div className="font-display text-2xl text-plum mt-1">{store.name}</div>
          <div className="text-plum/60 text-sm">Booth {store.boothNumber} · {store.category}</div>
          <div ref={wrap} className="my-5 bg-white p-4 rounded-2xl shadow-soft border border-champagne/30">
            <QRCodeCanvas value={cardUrl} size={240} level="M" bgColor="#ffffff" fgColor="#3E2A3E" />
          </div>
          <div className="text-sm text-plum/70 font-medium">Scan for contact, socials &amp; packages</div>
        </div>
        <div className="flex gap-2 justify-center mt-6">
          <button onClick={() => window.print()} className="btn-primary inline-flex items-center gap-2"><Printer size={16} /> Print</button>
          <button onClick={downloadPng} className="btn-ghost border border-plum/15 text-plum inline-flex items-center gap-2"><Download size={16} /> Download PNG</button>
        </div>
        <a href={`/card/${store.qrToken}`} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm text-coral"><ExternalLink size={14} /> Preview your card</a>
      </Card>

      <Card className="mt-4">
        <div className="font-display text-lg text-plum mb-1">Edit your info</div>
        <div className="text-xs text-plum/55 mb-4">This is what guests see when they scan your calling card. Your name and booth are set by the organizers.</div>

        <label className="label">Logo</label>
        <div className="flex items-center gap-3 mb-4">
          {draft.logoUrl
            ? <img src={draft.logoUrl} alt="" className="w-16 h-16 rounded-xl object-contain bg-white border border-plum/10 shrink-0" />
            : <div className="w-16 h-16 rounded-xl bg-plum/5 border border-plum/10 flex items-center justify-center text-[10px] text-plum/40 shrink-0">no logo</div>}
          <label className={`inline-flex items-center gap-2 rounded-lg border border-plum/15 px-3 py-2 text-sm cursor-pointer ${uploadingLogo ? 'opacity-60' : 'hover:border-coral hover:text-coral'} text-plum`}>
            {uploadingLogo ? 'Uploading…' : 'Upload logo'}
            <input type="file" accept="image/*" className="hidden" disabled={uploadingLogo} onChange={(e) => uploadFile(e, uploadStoreLogo, 'logoUrl', setUploadingLogo)} />
          </label>
        </div>

        <label className="label">Contacts</label>
        <p className="text-xs text-plum/55 mb-2 -mt-1">Add one per brand sharing your booth (e.g. BossLabs AI + Conex).</p>
        <div className="mb-4">
          <ContactsEditor value={draft.contacts} onChange={(contacts) => setDraft({ ...draft, contacts })} />
        </div>

        <label className="label">Promos &amp; packages (image or PDF)</label>
        <div className="flex items-center gap-3 mb-1">
          {draft.packagesUrl
            ? (isPdf(draft.packagesUrl)
                ? <div className="w-14 h-14 rounded-lg bg-coral/10 text-coral flex items-center justify-center shrink-0"><FileText size={22} /></div>
                : <img src={draft.packagesUrl} alt="" className="w-14 h-14 rounded-lg object-cover bg-white border border-plum/10 shrink-0" />)
            : <div className="w-14 h-14 rounded-lg bg-plum/5 border border-plum/10 flex items-center justify-center text-[10px] text-plum/40 shrink-0">none</div>}
          <div className="flex-1">
            <label className={`inline-flex items-center gap-2 rounded-lg border border-plum/15 px-3 py-2 text-sm cursor-pointer ${uploadingPkg ? 'opacity-60' : 'hover:border-coral hover:text-coral'} text-plum`}>
              {uploadingPkg ? 'Uploading…' : 'Upload image / PDF'}
              <input type="file" accept="image/*,application/pdf" className="hidden" disabled={uploadingPkg} onChange={(e) => uploadFile(e, uploadStorePackages, 'packagesUrl', setUploadingPkg)} />
            </label>
            {draft.packagesUrl && (
              <button type="button" className="ml-2 text-xs text-plum/50 hover:text-plum" onClick={() => setDraft({ ...draft, packagesUrl: '' })}>Remove</button>
            )}
          </div>
        </div>

        <button onClick={save} disabled={saving || !dirty} className="btn-primary w-full mt-5">
          {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
        </button>
      </Card>
    </PageShell>
  );
}
