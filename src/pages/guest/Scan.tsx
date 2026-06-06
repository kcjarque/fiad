import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../stores/authStore';
import { QRScanner } from '../../components/shared/QRScanner';
import { PageShell } from '../../components/shared/PageShell';
import { Card } from '../../components/shared/Card';
import { getStoreByQr, getStoreByBoothNumber } from '../../services/storeService';
import { stampPassport } from '../../services/passportService';
import { toast } from '../../stores/toastStore';
import { BookHeart } from 'lucide-react';

export function Scan() {
  const session = useAuth((s) => s.session);
  if (session.role !== 'guest') return <Navigate to="/app/register" replace />;
  const guestId = session.guestId;

  const [lastResult, setLastResult] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);

  const handleResult = async (text: string) => {
    const raw = text.trim();
    if (!raw) return;

    // ── Resolve what the guest gave us, in order of how easy it was to type:
    //
    //   1. Bare booth number (e.g. "BA22", "H1-01", "ba22", "Concierge").
    //      This is the manual-fallback case Sir asked for — staff at the
    //      booth tells the guest "type BA22" and it works without anyone
    //      typing a 22-char QR token.
    //   2. Full URL the camera decoded (e.g. "https://www.fiad.app/s/store-qr-…").
    //      Strip down to the bare token.
    //   3. Bare qr_token (e.g. "store-qr-peridot-photoman").
    //
    // Order matters: BA22 doesn't contain "/s/" or "store-qr-" so it's
    // unambiguous; we try it first because the worst case is one wasted
    // lookup, and it makes manual entry massively friendlier.
    try {
      let store = undefined;

      // 1. Booth-number attempt (only if it doesn't look like a URL or a token).
      const looksLikeUrl = /\/s\//.test(raw) || /^https?:/i.test(raw);
      const looksLikeToken = /^store-qr-/i.test(raw);
      if (!looksLikeUrl && !looksLikeToken) {
        store = await getStoreByBoothNumber(raw);
      }

      // 2/3. Fall back to URL/token resolution.
      if (!store) {
        let token = raw;
        const m = token.match(/\/s\/([^?#/]+)/);
        if (m) token = decodeURIComponent(m[1]);
        store = await getStoreByQr(token);
      }

      if (!store) {
        toast.error('Not a valid booth code.');
        setScanning(false);
        return;
      }
      const result = await stampPassport(guestId, store.id);
      if ('alreadyStamped' in result) {
        toast.info(`You already stamped ${store.name}.`);
      } else {
        toast.success(`Stamped ${store.name}!`);
      }
      setLastResult(store.name);
      setScanning(false);
    } catch (err) {
      // On transient network failure, re-arm the scanner so the guest can
      // try again without tapping anything. Their camera is already on.
      toast.error(`Scan failed: ${(err as Error).message}`);
      setScanning(true);
    }
  };

  return (
    <PageShell title="Stamp my Passport" subtitle="Scan a booth's static QR">
      {scanning ? (
        <Card>
          <QRScanner
            onResult={handleResult}
            hint="Scan a booth's QR — or tap 'Enter code' and type the booth number (e.g. BA22)."
          />
        </Card>
      ) : (
        <Card className="text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-champagne/40 text-plum mb-2">
            <BookHeart size={24} />
          </div>
          <div className="font-display text-xl">{lastResult}</div>
          <button className="btn-primary mt-4" onClick={() => setScanning(true)}>
            Scan another
          </button>
        </Card>
      )}
    </PageShell>
  );
}
