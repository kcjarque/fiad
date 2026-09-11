import { useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, ScanLine, Sparkles, RotateCcw } from 'lucide-react';
import { AdminShell } from '../../components/admin/AdminShell';
import { QRScanner } from '../../components/shared/QRScanner';
import { getGuestByQr } from '../../services/guestService';
import { listStoresForLogin } from '../../services/authService';
import { issueEntries } from '../../services/transactionService';
import { getActiveEvent } from '../../services/eventService';
import { toast } from '../../stores/toastStore';
import type { Guest } from '../../types';

type Step = 'scan' | 'form' | 'done';

// Pull the bare guest token out of whatever the camera decoded (a raw
// `guest-qr-…`, or a URL that embeds it).
const cleanToken = (raw: string) => {
  const t = raw.trim();
  const m = t.match(/guest-qr-[A-Za-z0-9]+/);
  return m ? m[0] : t;
};

export function AdminRaffleScanner() {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>('scan');
  const [guest, setGuest] = useState<Guest | null>(null);
  const [storeId, setStoreId] = useState('');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('');
  const idempotencyKey = useRef(crypto.randomUUID());

  const { data: event } = useQuery({ queryKey: ['activeEvent'], queryFn: getActiveEvent });
  const { data: stores = [] } = useQuery({ queryKey: ['storesForLogin'], queryFn: listStoresForLogin });
  const suppliers = useMemo(() => stores.filter((s) => s.boothNumber !== 'DEMO'), [stores]);
  const raffleRate = event?.raffleRate ?? 100;

  const onQr = async (raw: string) => {
    if (busy) return;
    try {
      const g = await getGuestByQr(cleanToken(raw));
      if (!g) {
        toast.error('Not a valid guest QR.');
        return;
      }
      setGuest(g);
      setStep('form');
    } catch (err) {
      toast.error(`Lookup failed: ${(err as Error).message}`);
    }
  };

  const submit = async () => {
    if (busy || !guest) return;
    if (!storeId) {
      toast.error('Choose the supplier/booth.');
      return;
    }
    const amt = Number(amount.replace(/[^0-9.]/g, ''));
    if (!amt || amt <= 0) {
      toast.error('Enter a valid amount.');
      return;
    }
    setBusy(true);
    try {
      const r = await issueEntries({
        idempotencyKey: idempotencyKey.current,
        storeId,
        guestId: guest.id,
        amount: amt,
        receiptPhotoUrl: 'admin-booth', // physical receipt kept at the admin booth
      });
      if (r.kind === 'approved') {
        setResult(`${r.entries} ${r.entries === 1 ? 'entry' : 'entries'} issued to ${guest.name}`);
        toast.success(`Issued ${r.entries} entries to ${guest.name}`);
      } else {
        setResult(`Over the daily cap — override request created for ${guest.name}. Approve under Overrides.`);
        toast.info('Cap exceeded — override request created.');
      }
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['raffle'] });
      setStep('done');
    } catch (err) {
      toast.error(`Issuance failed: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    idempotencyKey.current = crypto.randomUUID();
    setGuest(null);
    setStoreId('');
    setAmount('');
    setResult('');
    setStep('scan');
  };

  const selectedStore = suppliers.find((s) => s.id === storeId);

  return (
    <AdminShell>
      <h1 className="font-display text-2xl md:text-3xl mb-1">Raffle Scanner</h1>
      <p className="text-sm text-plum/60 mb-5 max-w-md">
        Admin booth: scan the guest's QR, pick the supplier from the receipt, and enter the amount.
        ₱{raffleRate} spent = 1 raffle entry.
      </p>

      {step === 'scan' && (
        <div className="card max-w-md">
          <QRScanner onResult={onQr} hint="Scan the guest's ticket / email QR." />
        </div>
      )}

      {step === 'form' && guest && (
        <div className="max-w-md space-y-4">
          <div className="card">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-display text-lg text-plum">{guest.name}</div>
                <div className="text-plum/60 text-sm">{guest.email}</div>
              </div>
              <button onClick={reset} className="text-xs text-plum/50">Change guest</button>
            </div>
          </div>

          <div className="card space-y-4">
            <div>
              <label className="label">Supplier / booth (from the receipt)</label>
              <select className="input" value={storeId} onChange={(e) => setStoreId(e.target.value)}>
                <option value="">Select supplier…</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>Booth {s.boothNumber} — {s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Purchase amount (₱)</label>
              <input
                type="text"
                inputMode="decimal"
                className="input"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 1500"
              />
              {selectedStore && amount && (
                <div className="mt-2 text-xs text-plum/60">
                  ≈ {Math.floor(Number(amount.replace(/[^0-9.]/g, '')) / raffleRate)} entries for {selectedStore.name}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button onClick={reset} className="btn-ghost flex-1 border border-plum/15 text-plum">Cancel</button>
              <button onClick={submit} disabled={busy} className="btn-primary flex-1">
                {busy ? 'Issuing…' : 'Issue entries'}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="card max-w-md text-center py-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 mb-3">
            <Sparkles size={28} />
          </div>
          <div className="font-display text-xl text-plum">{result}</div>
          <button className="btn-primary mt-5 inline-flex items-center gap-2" onClick={reset}>
            <ScanLine size={16} /> Scan next guest
          </button>
        </div>
      )}

      {step !== 'scan' && step !== 'done' && (
        <button onClick={reset} className="mt-4 inline-flex items-center gap-1.5 text-sm text-plum/60">
          <RotateCcw size={14} /> Start over
        </button>
      )}
      {step === 'form' && (
        <button onClick={() => setStep('scan')} className="mt-4 ml-1 inline-flex items-center gap-1.5 text-sm text-plum/60">
          <Camera size={14} /> Re-scan
        </button>
      )}
    </AdminShell>
  );
}
