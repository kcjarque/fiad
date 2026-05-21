import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../stores/authStore';
import { QRScanner } from '../../components/shared/QRScanner';
import { PageShell } from '../../components/shared/PageShell';
import { Card } from '../../components/shared/Card';
import { Button } from '../../components/shared/Button';
import { getGuestByQr } from '../../services/guestService';
import { getTodaySpent, issueEntries } from '../../services/transactionService';
import { getActiveEvent } from '../../services/eventService';
import { toast } from '../../stores/toastStore';
import { peso } from '../../utils/id';
import type { Guest } from '../../types';
import { Camera, Sparkles } from 'lucide-react';

type Step = 'scan' | 'form' | 'done';

export function StoreScan() {
  const session = useAuth((s) => s.session);
  if (session.role !== 'store') return <Navigate to="/store/login" replace />;
  const storeId = session.storeId;
  const queryClient = useQueryClient();

  const { data: event } = useQuery({ queryKey: ['activeEvent'], queryFn: getActiveEvent });

  const [step, setStep] = useState<Step>('scan');
  const [guest, setGuest] = useState<Guest | null>(null);
  const [amount, setAmount] = useState('');
  const [photo, setPhoto] = useState<string>('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string>('');

  const { data: alreadySpent = 0 } = useQuery({
    queryKey: ['todaySpent', guest?.id, storeId],
    queryFn: () => getTodaySpent(guest!.id, storeId),
    enabled: !!guest,
  });

  const onQr = async (token: string) => {
    try {
      const g = await getGuestByQr(token);
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

  const onPhoto = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    if (busy) return;
    if (!guest) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      toast.error('Enter a valid amount.');
      return;
    }
    if (!photo) {
      toast.error('Please upload a receipt photo.');
      return;
    }
    setBusy(true);
    try {
      const r = await issueEntries({
        storeId,
        guestId: guest.id,
        amount: amt,
        receiptPhotoUrl: photo,
        overrideNote: note || undefined,
      });
      if (r.kind === 'approved') {
        setResult(`${r.entries} ${r.entries === 1 ? 'entry' : 'entries'} issued to ${guest.name}`);
        toast.success(`Issued ${r.entries} entries to ${guest.name}`);
      } else {
        setResult(`Override requested for ${guest.name}. Admin will review.`);
        toast.info('Override requested. Awaiting admin approval.');
      }
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['raffle'] });
      queryClient.invalidateQueries({ queryKey: ['todaySpent'] });
      setStep('done');
    } catch (err) {
      toast.error(`Issuance failed: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setGuest(null);
    setAmount('');
    setPhoto('');
    setNote('');
    setResult('');
    setStep('scan');
  };

  const cap = event?.dailyCapPerGuestPerStore ?? 5000;
  const raffleRate = event?.raffleRate ?? 100;
  const remaining = Math.max(cap - alreadySpent, 0);
  const willExceed = !!guest && Number(amount) > remaining;

  return (
    <PageShell title="Issue Raffle Entries" subtitle={`₱${raffleRate} = 1 entry · Cap ${peso(cap)}/day/guest`}>
      {step === 'scan' && (
        <Card>
          <QRScanner onResult={onQr} />
        </Card>
      )}

      {step === 'form' && guest && (
        <>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-display text-lg">{guest.name}</div>
                <div className="text-plum/60 text-sm">{guest.email}</div>
              </div>
              <button onClick={reset} className="text-xs text-plum/50">Change</button>
            </div>
            <div className="mt-3 text-xs text-plum/60">
              Spent today at this store: {peso(alreadySpent)} · Remaining: {peso(remaining)}
            </div>
          </Card>

          <Card>
            <label className="label">Purchase amount (₱)</label>
            <input
              type="number"
              className="input"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 1500"
            />
            {willExceed && (
              <div className="mt-2 text-xs text-amber-700 bg-amber-50 rounded-lg p-3">
                This amount exceeds the daily cap. Submission will create an override request for admin approval.
              </div>
            )}

            <label className="label mt-4">Receipt photo</label>
            <label className="block cursor-pointer">
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
              <div className="border-2 border-dashed border-plum/20 rounded-xl p-4 text-center text-plum/60 text-sm">
                {photo ? (
                  <img src={photo} alt="receipt" className="mx-auto max-h-44 rounded-lg" />
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <Camera size={18} /> Tap to take / upload receipt
                  </span>
                )}
              </div>
            </label>

            {willExceed && (
              <>
                <label className="label mt-4">Override note (for admin)</label>
                <textarea
                  className="input"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Guest bought full package, etc."
                  rows={3}
                />
              </>
            )}

            <div className="flex gap-2 mt-4">
              <Button variant="ghost" onClick={reset} className="flex-1">Cancel</Button>
              <Button onClick={submit} disabled={busy} className="flex-1">
                {willExceed ? 'Request override' : 'Issue entries'}
              </Button>
            </div>
          </Card>
        </>
      )}

      {step === 'done' && (
        <Card className="text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-champagne/40 text-plum">
            <Sparkles size={24} />
          </div>
          <div className="font-display text-xl mt-2">{result}</div>
          <Button className="mt-4" onClick={reset}>Scan next guest</Button>
        </Card>
      )}
    </PageShell>
  );
}
