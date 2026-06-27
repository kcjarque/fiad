import { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, QrCode } from 'lucide-react';
import { AdminShell } from '../../components/admin/AdminShell';

/**
 * Generic QR generator for the team — paste a link (catalog/flyer), supplier
 * contact details, or any text and download a scannable PNG (for Canva,
 * banners, print). Renders client-side via qrcode.react; the download draws
 * the canvas onto a padded white canvas so the QR keeps a scannable quiet zone.
 */
export function AdminQrGenerator() {
  const [text, setText] = useState('');
  const [active, setActive] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);

  const download = () => {
    const src = wrapRef.current?.querySelector('canvas');
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
    a.download = `qr-${active.slice(0, 24).replace(/[^a-z0-9]+/gi, '_') || 'code'}.png`;
    a.click();
  };

  return (
    <AdminShell>
      <h1 className="font-display text-2xl md:text-3xl mb-2">QR Generator</h1>
      <p className="text-sm text-plum/60 mb-5 max-w-xl">
        Paste a link (catalog / flyer), a supplier's contact details, or any text — generate a
        scannable QR and download it as a PNG for Canva, banners, or print.
      </p>

      <div className="card max-w-xl">
        <label htmlFor="qr-content" className="label">Content (URL or text)</label>
        <textarea
          id="qr-content"
          className="input min-h-[96px]"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'https://drive.google.com/your-catalog\n— or —\nPeridot Studios · 0917 000 0000 · @peridotstudios'}
        />
        <button
          className="btn-primary mt-3 inline-flex items-center gap-2"
          onClick={() => setActive(text.trim())}
          disabled={!text.trim()}
        >
          <QrCode size={16} /> Generate QR
        </button>
      </div>

      {active && (
        <div className="card max-w-xl mt-5 text-center">
          <div ref={wrapRef} className="inline-block bg-white p-4 rounded-2xl border border-champagne/30">
            <QRCodeCanvas value={active} size={300} level="M" bgColor="#ffffff" fgColor="#3E2A3E" />
          </div>
          <div className="text-xs text-plum/50 mt-3 break-all max-w-md mx-auto">{active}</div>
          <button onClick={download} className="btn-primary mt-4 inline-flex items-center gap-2">
            <Download size={16} /> Download PNG
          </button>
        </div>
      )}
    </AdminShell>
  );
}
