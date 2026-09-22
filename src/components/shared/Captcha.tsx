import { useEffect, useRef, useState } from 'react';

/**
 * Cloudflare Turnstile widget.
 *
 * Renders nothing when VITE_TURNSTILE_SITE_KEY is unset, and reports an empty
 * token — so the app works identically before the keys exist. The server side
 * decides whether a missing token is acceptable; this component never makes
 * that call, because anything the browser decides a bot can simply skip.
 */

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;
const SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export const captchaEnabled = !!SITE_KEY;

let scriptPromise: Promise<void> | null = null;
const loadScript = (): Promise<void> => {
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Could not load the captcha'));
    document.head.appendChild(s);
  });
  return scriptPromise;
};

export function Captcha({
  onToken,
  className = '',
}: {
  /** Called with the solved token, or '' when it expires or fails. */
  onToken: (token: string) => void;
  className?: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<string | null>(null);
  const [failed, setFailed] = useState(false);
  // Keep the latest callback without re-rendering the widget, which would
  // reset a challenge the person has already solved. Assigned in an effect
  // rather than during render, which React forbids.
  const cb = useRef(onToken);
  useEffect(() => {
    cb.current = onToken;
  }, [onToken]);

  useEffect(() => {
    const el = boxRef.current;
    if (!SITE_KEY || !el) return;
    let cancelled = false;

    loadScript()
      .then(() => {
        if (cancelled || !window.turnstile) return;
        widgetRef.current = window.turnstile.render(el, {
          sitekey: SITE_KEY,
          theme: 'light',
          callback: (token: string) => cb.current(token),
          'expired-callback': () => cb.current(''),
          'error-callback': () => {
            cb.current('');
            setFailed(true);
          },
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      if (widgetRef.current && window.turnstile) {
        window.turnstile.remove(widgetRef.current);
        widgetRef.current = null;
      }
    };
  }, []);

  if (!SITE_KEY) return null;

  return (
    <div className={className}>
      <div ref={boxRef} />
      {failed && (
        <p className="text-xs text-red-600 mt-1">
          The verification box didn't load. Check your connection and refresh.
        </p>
      )}
    </div>
  );
}
