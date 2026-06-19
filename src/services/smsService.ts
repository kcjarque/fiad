import { supabase } from '../lib/supabase';

// Cost per billable 160-char SMS segment, in pesos. Used to compute the total
// only — intentionally not surfaced in the UI.
const SMS_RATE_PHP = 0.7;

export type SmsUsage = { texts: number; costPhp: number };

/**
 * Total texts sent and their cost across all events. "texts" counts billable
 * 160-char segments (a long message bills as several), summed over rows the
 * `notify` edge function recorded as actually sent. Returns zeros if the
 * sms_log table doesn't exist yet (migration 0055 not run).
 */
export const getSmsUsage = async (): Promise<SmsUsage> => {
  const { data, error } = await supabase
    .from('sms_log')
    .select('segments')
    .eq('status', 'sent');
  if (error) return { texts: 0, costPhp: 0 };
  const texts = (data ?? []).reduce((sum, r) => sum + (r.segments ?? 1), 0);
  return { texts, costPhp: texts * SMS_RATE_PHP };
};
