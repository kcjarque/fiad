import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../stores/authStore';
import { QRScanner } from '../../components/shared/QRScanner';
import { PageShell } from '../../components/shared/PageShell';
import { Card } from '../../components/shared/Card';
import { toast } from '../../stores/toastStore';

// Pull a booth's store token out of a scanned calling-card QR (a
// `/card/<token>` URL), a `/s/<token>` passport URL, or a bare token.
const extractToken = (raw: string): string => {
  const t = raw.trim();
  const bare = t.match(/store-qr-[A-Za-z0-9]+/);
  if (bare) return bare[0];
  const path = t.match(/\/(?:card|s)\/([^?#/]+)/);
  return path ? decodeURIComponent(path[1]) : t;
};

export function CardScan() {
  const session = useAuth((s) => s.session);
  if (session.role !== 'guest') return <Navigate to="/app/register" replace />;
  const navigate = useNavigate();

  const handle = (raw: string) => {
    const token = extractToken(raw);
    if (!/^store-qr-/.test(token)) {
      toast.error("That's not a supplier calling-card QR. Try the card QR at the booth.");
      return;
    }
    navigate(`/card/${token}`);
  };

  return (
    <PageShell title="Scan a Supplier Card" subtitle="Scan a booth's calling-card QR to see their contact & promos">
      <Card>
        <QRScanner onResult={handle} hint="Point at the booth's calling-card QR (the one that says 'Scan for contact & promos')." />
      </Card>
    </PageShell>
  );
}
