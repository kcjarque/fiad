import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Loader2, BookHeart, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../stores/authStore';
import { getStoreByQr } from '../../services/storeService';
import { stampPassport } from '../../services/passportService';
import { toast } from '../../stores/toastStore';

/**
 * Deep-link target for the printed booth QR codes.
 *
 * Booth QRs encode `${origin}/s/${qrToken}`, so the phone's native camera
 * opens this page directly. We resolve the store, stamp the guest's
 * passport, then drop them on the Passport page.
 *
 * If the visitor isn't signed in as a guest yet, we park the token in
 * sessionStorage and bounce them to the guest login. After they sign in,
 * GuestLogin reads that token back and resumes the stamp flow here.
 */
const PENDING_KEY = 'fiad.pendingStampToken';

export function StampLink() {
  const { token } = useParams<{ token: string }>();
  const session = useAuth((s) => s.session);
  const navigate = useNavigate();
  const ran = useRef(false);
  const [error, setError] = useState<string | null>(null);

  if (!token) return <Navigate to="/" replace />;

  useEffect(() => {
    if (ran.current) return;
    if (session.role !== 'guest') {
      try { sessionStorage.setItem(PENDING_KEY, token); } catch { /* ignore */ }
      navigate('/app/login', { replace: true });
      return;
    }
    ran.current = true;

    (async () => {
      try {
        const store = await getStoreByQr(token);
        if (!store) {
          setError("That booth QR wasn't recognised. Ask the booth to check their code.");
          return;
        }
        const result = await stampPassport(session.guestId, store.id);
        if ('alreadyStamped' in result) {
          toast.info(`Already stamped ${store.name}.`);
        } else {
          toast.success(`Stamped ${store.name}!`);
        }
        try { sessionStorage.removeItem(PENDING_KEY); } catch { /* ignore */ }
        navigate('/app/passport', { replace: true });
      } catch (e) {
        setError(`Stamp failed: ${(e as Error).message}`);
      }
    })();
  }, [token, session, navigate]);

  return (
    <div className="min-h-[100svh] flex items-center justify-center px-6 bg-cream">
      <div className="max-w-sm w-full bg-white rounded-2xl shadow-card p-8 text-center">
        {error ? (
          <>
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-700 mb-3">
              <AlertTriangle size={24} />
            </div>
            <div className="font-display text-lg text-plum">Couldn't stamp</div>
            <div className="text-sm text-plum/65 mt-2">{error}</div>
            <button className="btn-primary mt-5 w-full" onClick={() => navigate('/app/passport')}>
              Back to passport
            </button>
          </>
        ) : (
          <>
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-champagne/30 text-plum mb-3">
              <Loader2 size={24} className="animate-spin" />
            </div>
            <div className="font-display text-lg text-plum">Stamping your passport…</div>
            <div className="text-sm text-plum/65 mt-2 inline-flex items-center gap-1">
              <BookHeart size={14} /> One moment
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export { PENDING_KEY };
