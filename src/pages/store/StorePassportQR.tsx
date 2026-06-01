import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../stores/authStore';
import { getStore } from '../../services/storeService';
import { QRDisplay } from '../../components/shared/QRDisplay';
import { PageShell } from '../../components/shared/PageShell';
import { Card } from '../../components/shared/Card';

export function StorePassportQR() {
  const session = useAuth((s) => s.session);
  if (session.role !== 'store') return <Navigate to="/store/login" replace />;
  const storeId = session.storeId;
  const { data: store } = useQuery({ queryKey: ['store', storeId], queryFn: () => getStore(storeId) });
  if (!store) return null;
  return (
    <PageShell title="Your Booth QR" subtitle="Guests scan this to stamp their passport">
      <Card className="text-center">
        <div className="font-display text-2xl text-plum">{store.name}</div>
        <div className="text-plum/60 text-sm">Booth {store.boothNumber} · {store.category}</div>
        <div className="my-5 flex justify-center">
          <QRDisplay value={`${window.location.origin}/s/${store.qrToken}`} size={260} />
        </div>
        <div className="text-xs text-plum/60">Print this QR and display it at your booth.</div>
      </Card>
    </PageShell>
  );
}
