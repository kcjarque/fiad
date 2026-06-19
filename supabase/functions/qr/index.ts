// Public QR image endpoint. Renders a PNG QR for a token so transactional
// emails can embed a scannable check-in code (email clients can't run the
// in-app QRDisplay component, and reliably show only hosted PNG/JPG images).
//
// GET /functions/v1/qr?token=<guest qrToken>  ->  image/png
//
// Deploy WITHOUT jwt verification (an <img> in an email can't send the anon
// key):  supabase functions deploy qr --no-verify-jwt
import QRCode from 'npm:qrcode@1.5.4';

// deno-lint-ignore no-explicit-any
const Deno: any = (globalThis as any).Deno;

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  if (!token) return new Response('missing token', { status: 400 });

  try {
    const png: Uint8Array = await QRCode.toBuffer(token, {
      width: 320,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#3c1e32', light: '#ffffff' }, // FIAD plum on white
    });
    return new Response(png, {
      headers: {
        'content-type': 'image/png',
        // Cache hard — a guest's token QR never changes.
        'cache-control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (e) {
    return new Response(`qr error: ${String(e)}`, { status: 500 });
  }
});
