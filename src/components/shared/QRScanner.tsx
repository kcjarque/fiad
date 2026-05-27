import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Camera, Keyboard, AlertTriangle } from 'lucide-react';

type Props = {
  onResult: (text: string) => void;
  onClose?: () => void;
  hint?: string;
};

type Mode = 'camera' | 'manual';

export function QRScanner({ onResult, onClose, hint }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
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

    const stop = () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      const s = streamRef.current;
      streamRef.current = null;
      if (s) s.getTracks().forEach((t) => t.stop());
    };

    const tick = () => {
      if (cancelled) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (w === 0 || h === 0) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      ctx.drawImage(video, 0, 0, w, h);
      const img = ctx.getImageData(0, 0, w, h);
      const code = jsQR(img.data, w, h, { inversionAttempts: 'dontInvert' });
      if (code && code.data) {
        cancelled = true;
        stop();
        onResultRef.current(code.data);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    const start = async () => {
      setStarting(true);
      setError(null);
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Camera not supported in this browser');
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');
        video.muted = true;
        await video.play().catch(() => { /* iOS may need user gesture; tick will retry */ });
        if (cancelled) {
          stop();
          return;
        }
        setStarting(false);
        rafRef.current = requestAnimationFrame(tick);
      } catch (e) {
        const err = e as Error;
        const isDenied = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
        const msg = isDenied
          ? 'Camera permission denied'
          : err.name === 'NotFoundError'
            ? 'No camera found on this device'
            : err.message || 'Camera unavailable';
        setStarting(false);
        setError(msg);
        setMode('manual');
        try { localStorage.removeItem('fiad.cameraConsent'); } catch { /* ignore */ }
      }
    };

    start();
    return () => {
      cancelled = true;
      stop();
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
          <div className="relative w-full aspect-square max-w-sm mx-auto rounded-2xl overflow-hidden bg-plum/5">
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              playsInline
              muted
            />
            <canvas ref={canvasRef} className="hidden" />
            {starting && (
              <div className="absolute inset-0 flex items-center justify-center text-plum/60 text-sm bg-plum/5">
                Starting camera…
              </div>
            )}
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
          <label className="label">Code</label>
          <input
            autoFocus
            className="input"
            placeholder="Paste or type the code"
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
            Use this if your camera doesn't open.
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
