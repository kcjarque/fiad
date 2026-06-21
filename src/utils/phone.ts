/**
 * Normalize any PH mobile input to +63 E.164 form (`+639XXXXXXXXX`).
 * Accepts `09…`, `9…`, `63…`, or `+63…` and returns `''` when there are no
 * digits yet, so the registration field always displays a `+63`-prefixed
 * number as the user types.
 */
export function toPhE164(raw: string): string {
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('63')) d = d.slice(2);
  if (d.startsWith('0')) d = d.slice(1);
  d = d.slice(0, 10); // 9XXXXXXXXX
  return d ? `+63${d}` : '';
}

/** Digits shown after the fixed "+63" prefix in the registration input. */
export const phLocal = (e164: string): string => e164.replace(/^\+63/, '');
