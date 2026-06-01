import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../stores/authStore';
import { QRScanner } from '../../components/shared/QRScanner';
import { PageShell } from '../../components/shared/PageShell';
import { Card } from '../../components/shared/Card';
import { getStoreByQr } from '../../services/storeService';
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
    // Booth QRs now encode `${origin}/s/${qrToken}`. Accept either the URL
    // form (when the user scans a printed sticker via the in-app camera)
    // or a bare token (for any older stickers still in circulation).
    let token = text.trim();
    const m = token.match(/\/s\/([^?#/]+)/);
    if (m) token = decodeURIComponent(m[1]);
    try {
      const store = await getStoreByQr(token);
      if (!store) {
        toast.error('Not a valid booth QR.');
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
      toast.error(`Scan failed: ${(err as Error).message}`);
    }
  };

  return (
    <PageShell title="Stamp my Passport" subtitle="Scan a booth's static QR">
      {scanning ? (
        <Card>
          <QRScanner onResult={handleResult} hint="Scan a booth's static QR code to stamp your passport." />
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
