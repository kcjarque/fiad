import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, Keyboard, AlertTriangle } from 'lucide-react';

type Props = {
  onResult: (text: string) => void;
  onClose?: () => void;
  hint?: string;
};

type Mode = 'camera' | 'manual';

export function QRScanner({ onResult, onClose, hint }: Props) {
  const elId = useRef(`qr-scanner-${Math.random().toString(36).slice(2, 8)}`);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  // Hold onResult in a ref so the camera effect doesn't re-run on parent re-renders.
  const onResultRef = useRef(onResult);
  useEffect(() => { onResultRef.current = onResult; }, [onResult]);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState('');
  const [mode, setMode] = useState<Mode>('camera');
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    if (mode !== 'camera') return;
    let cancelled = false;
    const start = async () => {
      setStarting(true);
      setError(null);
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Camera not supported in this browser');
        }
        await new Promise((r) => setTimeout(r, 0));
        if (cancelled) return;
        const scanner = new Html5Qrcode(elId.current, { verbose: false });
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => {
            if (cancelled) return;
            cancelled = true;
            scanner.stop().then(() => scanner.clear()).catch(() => {});
            onResultRef.current(decodedText);
          },
          () => {},
        );
        if (cancelled) {
          // Effect tore down while we were starting — stop the scanner we just opened.
          scanner.stop().then(() => scanner.clear()).catch(() => {});
          return;
        }
        setStarting(false);
      } catch (e) {
        setStarting(false);
        const msg = e instanceof Error ? e.message : 'Camera unavailable';
        setError(msg);
        setMode('manual');
      }
    };
    start().catch(() => {});
    return () => {
      cancelled = true;
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s) {
        try {
          s.stop().then(() => {
            try { s.clear(); } catch { /* ignore */ }
          }).catch(() => {});
        } catch { /* ignore */ }
      }
    };
  }, [mode]);

  return (
    <div className="flex flex-col gap-4">
      {/* Mode toggle */}
      <div className="flex bg-plum/5 rounded-full p-1 text-sm">
        <button
          type="button"
          onClick={() => setMode('camera')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-full transition ${
            mode === 'camera' ? 'bg-white shadow text-plum' : 'text-plum/60'
          }`}
        >
          <Camera size={16} /> Camera
        </button>
        <button
          type="button"
          onClick={() => setMode('manual')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-full transition ${
            mode === 'manual' ? 'bg-white shadow text-plum' : 'text-plum/60'
          }`}
        >
          <Keyboard size={16} /> Enter code
        </button>
      </div>

      {hint && <div className="text-sm text-plum/60 text-center">{hint}</div>}

      {mode === 'camera' && (
        <>
          <div
            id={elId.current}
            className="w-full aspect-square max-w-sm mx-auto rounded-2xl overflow-hidden bg-plum/5 flex items-center justify-center"
          >
            {starting && <div className="text-plum/50 text-sm">Starting camera…</div>}
          </div>
          {error && (
            <div className="text-sm text-amber-700 bg-amber-50 rounded-xl p-3 flex gap-2 items-start">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <div>
                <div className="font-medium">Camera unavailable</div>
                <div className="text-xs mt-1 text-plum/70">{error}. Use "Enter code" above instead.</div>
              </div>
            </div>
          )}
        </>
      )}

      {mode === 'manual' && (
        <div className="space-y-3">
          <label className="label">QR token</label>
          <input
            autoFocus
            className="input"
            placeholder="Paste or type the QR token"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && manual.trim() && onResult(manual.trim())}
          />
          <button
            type="button"
            className="btn-primary w-full"
            onClick={() => manual.trim() && onResult(manual.trim())}
            disabled={!manual.trim()}
          >
            Submit
          </button>
          <div className="text-xs text-plum/50 text-center">
            Tip: on the admin or store pages you can open a booth's QR to see the token.
          </div>
        </div>
      )}

      {onClose && (
        <button type="button" className="btn-ghost" onClick={onClose}>
          Cancel
        </button>
      )}
    </div>
  );
}
