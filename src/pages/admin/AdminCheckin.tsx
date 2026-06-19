import { useState } from 'react';
import { Camera, ScanLine, CheckCircle2, AlertCircle } from 'lucide-react';
import { AdminShell } from '../../components/admin/AdminShell';
import { QRScanner } from '../../components/shared/QRScanner';
import { checkInGuestByQr } from '../../services/guestService';
import { toast } from '../../stores/toastStore';
import type { Guest } from '../../types';

type Result = { guest: Guest; alreadyCheckedIn: boolean } | 'notfound';

const dayLabel = (d?: string) => (d === 'day1' ? 'Day 1' : d === 'day2' ? 'Day 2' : d ?? '');
const fmtTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';

export function AdminCheckin() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  const onQr = async (token: string) => {
    if (busy) return;
    setBusy(true);
    setScanning(false);
    try {
      const r = await checkInGuestByQr(token);
      if (!r) {
        setResult('notfound');
      } else {
        setResult(r);
        if (!r.alreadyCheckedIn) toast.success(`${r.guest.name} checked in`);
      }
    } catch (err) {
      toast.error(`Check-in failed: ${(err as Error).message}`);
      setScanning(true);
    } finally {
      setBusy(false);
    }
  };

  const scanNext = () => {
    setResult(null);
    setScanning(true);
  };

  return (
    <AdminShell>
      <h1 className="font-display text-2xl md:text-3xl mb-2">Check-in</h1>
      <p className="text-sm text-plum/60 mb-5 max-w-md">
        Scan the QR in a guest's confirmation email or ticket to check them in at the door.
      </p>

      {!scanning && !result && (
        <div className="card max-w-md text-center py-9">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-coral/15 text-coral mb-4">
            <ScanLine size={28} aria-hidden="true" />
          </div>
          <div className="font-display text-xl text-plum">Ready to check guests in</div>
          <button className="btn-primary mt-5 inline-flex items-center gap-2" onClick={() => setScanning(true)}>
            <Camera size={16} /> Open scanner
          </button>
        </div>
      )}

      {scanning && (
        <div className="card max-w-md">
          <QRScanner onResult={onQr} />
          <button
            className="btn-ghost w-full mt-3 border border-plum/15 text-plum"
            onClick={() => setScanning(false)}
          >
            Cancel
          </button>
        </div>
      )}

      {result && result !== 'notfound' && (
        <div className="card max-w-md text-center py-8">
          <div
            className={`inline-flex h-16 w-16 items-center justify-center rounded-full mb-4 ${
              result.alreadyCheckedIn ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            <CheckCircle2 size={36} aria-hidden="true" />
          </div>
          <div className="font-display text-2xl text-plum">{result.guest.name}</div>
          <div className="text-sm text-plum/60 mt-0.5">
            {result.guest.email}
            {dayLabel(result.guest.preferredDay) ? ` · ${dayLabel(result.guest.preferredDay)}` : ''}
          </div>
          <div
            className={`mt-3 text-sm font-semibold ${
              result.alreadyCheckedIn ? 'text-amber-700' : 'text-emerald-700'
            }`}
          >
            {result.alreadyCheckedIn
              ? `Already checked in${result.guest.checkedInAt ? ` · ${fmtTime(result.guest.checkedInAt)}` : ''}`
              : 'Checked in ✓'}
          </div>
          <button className="btn-primary mt-5" onClick={scanNext}>
            Scan next guest
          </button>
        </div>
      )}

      {result === 'notfound' && (
        <div className="card max-w-md text-center py-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600 mb-4">
            <AlertCircle size={36} aria-hidden="true" />
          </div>
          <div className="font-display text-xl text-plum">QR not recognized</div>
          <p className="text-sm text-plum/60 mt-1">
            That code doesn't match a registered guest. Try again, or look them up under Guests.
          </p>
          <button className="btn-primary mt-5" onClick={scanNext}>
            Scan again
          </button>
        </div>
      )}
    </AdminShell>
  );
}
