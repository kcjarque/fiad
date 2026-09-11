import { useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, ArrowLeft } from 'lucide-react';
import { listStoresForLogin } from '../../services/authService';
import { S2_VENUES } from '../../stores/eventStore';
import type { Store } from '../../types';

const ORIGIN = 'https://www.fiad.app';
const venueLabel = (eventId: string) => S2_VENUES.find((v) => v.id === eventId)?.label ?? 'Forever in a Day';

function QrCardPage({ store }: { store: Store }) {
  const booth = store.boothNumber.split(/\s+/).join(' ');
  return (
    <div className="qr-page">
      <div className="qr-frame">
        <div className="qr-brand font-script">Forever in a Day</div>
        <div className="qr-eyebrow">Season 2 · Supplier Booth</div>
        <div className="qr-logowrap">
          {store.logoUrl
            ? <img src={store.logoUrl} alt="" className="qr-logo" />
            : <span className="qr-logo-mono font-cormorant">{store.name.trim().slice(0, 1) || 'F'}</span>}
        </div>
        <div className="qr-name font-cormorant">{store.name}</div>
        <div className="qr-booth">Booth {booth} · {venueLabel(store.eventId)}</div>
        <div className="qr-cols">
          <div className="qr-col">
            <div className="qr-pill passport">PASSPORT</div>
            <div className="qr-box"><QRCodeSVG value={`${ORIGIN}/s/${store.qrToken}`} size={200} level="M" fgColor="#3E2A3E" /></div>
            <div className="qr-cap">Guests scan to<br />stamp their passport</div>
          </div>
          <div className="qr-col">
            <div className="qr-pill card">CALLING CARD</div>
            <div className="qr-box"><QRCodeSVG value={`${ORIGIN}/card/${store.qrToken}`} size={200} level="M" fgColor="#3E2A3E" /></div>
            <div className="qr-cap">Scan for contact,<br />socials &amp; promos</div>
          </div>
        </div>
        <div className="qr-foot">fiad.app</div>
      </div>
    </div>
  );
}

export function AdminQrCards() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const storeId = params.get('store');

  const { data: all = [], isLoading } = useQuery({ queryKey: ['storesForLogin'], queryFn: listStoresForLogin });
  const stores = useMemo(() => {
    const s2 = all.filter((s) => s.boothNumber !== 'DEMO');
    if (storeId) return s2.filter((s) => s.id === storeId);
    return s2;
  }, [all, storeId]);

  return (
    <div className="qr-print-root">
      <style>{`
        .qr-print-root{background:#f1eef0;min-height:100vh;padding:16px}
        .qr-bar{display:flex;align-items:center;gap:12px;max-width:210mm;margin:0 auto 16px}
        .qr-bar h1{font-size:18px;color:#3E2A3E;margin:0;flex:1}
        .qr-page{width:210mm;min-height:auto;margin:0 auto 16px;background:#FCF7F5;display:flex;align-items:center;justify-content:center;padding:12mm}
        .qr-frame{width:100%;border:2px solid #D4AF7A;border-radius:9mm;display:flex;flex-direction:column;align-items:center;text-align:center;padding:14mm 10mm}
        .qr-brand{color:#E63F75;font-size:46px;line-height:1}
        .qr-eyebrow{letter-spacing:.34em;text-transform:uppercase;font-size:12px;color:rgba(62,42,62,.5);margin-top:5px}
        .qr-logowrap{width:34mm;height:34mm;margin:8mm 0 0;background:#fff;border-radius:5mm;box-shadow:0 2px 10px rgba(62,42,62,.09);display:flex;align-items:center;justify-content:center;padding:5mm}
        .qr-logo{max-width:100%;max-height:100%;object-fit:contain}
        .qr-logo-mono{font-size:46px;color:rgba(62,42,62,.3)}
        .qr-name{font-weight:700;color:#3E2A3E;font-size:32px;line-height:1.1;margin-top:6mm;max-width:160mm}
        .qr-booth{font-size:15px;color:rgba(62,42,62,.62);margin-top:3mm}
        .qr-cols{display:flex;gap:12mm;margin-top:10mm}
        .qr-col{display:flex;flex-direction:column;align-items:center;width:70mm}
        .qr-pill{font-weight:700;font-size:13px;letter-spacing:.12em;padding:4px 14px;border-radius:999px;margin-bottom:5mm}
        .qr-pill.passport{background:#F4A0B5;color:#5A1330}
        .qr-pill.card{background:#3E2A3E;color:#FCE9F0}
        .qr-box{background:#fff;padding:10px;border-radius:8px;line-height:0}
        .qr-cap{font-size:13px;color:rgba(62,42,62,.7);margin-top:4mm;line-height:1.35}
        .qr-foot{font-size:11px;letter-spacing:.4em;text-transform:uppercase;color:#D4AF7A;margin-top:8mm}
        @media print{
          @page{size:A4;margin:0}
          .qr-print-root{background:#fff;padding:0}
          .no-print{display:none!important}
          .qr-page{margin:0;height:297mm;page-break-after:always}
        }
      `}</style>

      <div className="qr-bar no-print">
        <button onClick={() => navigate('/admin/stores')} className="btn-ghost !p-2 border border-plum/15" aria-label="Back to vendors"><ArrowLeft size={18} /></button>
        <h1>{storeId ? (stores[0] ? `QR Card — ${stores[0].name}` : 'QR Card') : `QR Cards — ${stores.length} suppliers`}</h1>
        <button onClick={() => window.print()} className="btn-primary inline-flex items-center gap-2"><Printer size={16} /> Print / Save as PDF</button>
      </div>

      {isLoading ? (
        <div className="text-center text-plum/50 py-10">Loading…</div>
      ) : stores.length === 0 ? (
        <div className="text-center text-plum/50 py-10">No supplier found.</div>
      ) : (
        stores.map((s) => <QrCardPage key={s.id} store={s} />)
      )}
    </div>
  );
}
