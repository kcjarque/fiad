import { useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { QRCodeCanvas } from 'qrcode.react';
import { Printer, Download, ExternalLink } from 'lucide-react';
import { useAuth } from '../../stores/authStore';
import { getStore } from '../../services/storeService';
import { PageShell } from '../../components/shared/PageShell';
import { Card } from '../../components/shared/Card';

// Supplier-facing view of their QR calling card. Suppliers print this QR and
// display it — guests scan it to open the supplier's public card at /card/:token
// (logo, contact, socials, packages). This QR encodes the full URL (not the bare
// token like the booth passport QR) so any phone camera opens it directly.
export function StoreCard() {
  const session = useAuth((s) => s.session);
  if (session.role !== 'store') return <Navigate to="/store/login" replace />;
  const storeId = session.storeId;
  const { data: store } = useQuery({ queryKey: ['store', storeId], queryFn: () => getStore(storeId) });
  const wrap = useRef<HTMLDivElement>(null);
  if (!store) return null;

  const cardUrl = `https://www.fiad.app/card/${store.qrToken}`;

  const downloadPng = () => {
    const src = wrap.current?.querySelector('canvas');
    if (!src) return;
    const pad = 28;
    const out = document.createElement('canvas');
    out.width = src.width + pad * 2;
    out.height = src.height + pad * 2;
    const ctx = out.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(src, pad, pad);
    const a = document.createElement('a');
    a.href = out.toDataURL('image/png');
    a.download = `FIAD-${store.boothNumber}-calling-card-QR.png`;
    a.click();
  };

  return (
    <PageShell title="Your QR Calling Card" subtitle="Print this — guests scan it for your contact, socials & packages">
      <style>{`@media print { body * { visibility: hidden !important; } #store-card-print, #store-card-print * { visibility: visible !important; } #store-card-print { position: absolute; inset: 0 auto auto 0; width: 100%; } }`}</style>
      <Card className="text-center">
        <div id="store-card-print" className="flex flex-col items-center">
          <div className="text-[10px] uppercase tracking-[0.3em] text-champagne">Forever in a Day · Season 2</div>
          <div className="font-display text-2xl text-plum mt-1">{store.name}</div>
          <div className="text-plum/60 text-sm">Booth {store.boothNumber} · {store.category}</div>
          <div ref={wrap} className="my-5 bg-white p-4 rounded-2xl shadow-soft border border-champagne/30">
            <QRCodeCanvas value={cardUrl} size={260} level="M" bgColor="#ffffff" fgColor="#3E2A3E" />
          </div>
          <div className="text-sm text-plum/70 font-medium">Scan for contact, socials &amp; packages</div>
        </div>

        <div className="flex gap-2 justify-center mt-6">
          <button onClick={() => window.print()} className="btn-primary inline-flex items-center gap-2">
            <Printer size={16} /> Print
          </button>
          <button onClick={downloadPng} className="btn-ghost border border-plum/15 text-plum inline-flex items-center gap-2">
            <Download size={16} /> Download PNG
          </button>
        </div>

        <a
          href={`/card/${store.qrToken}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 text-sm text-coral"
        >
          <ExternalLink size={14} /> Preview your card
        </a>
      </Card>
    </PageShell>
  );
}
