// Best-effort notification helper — calls the `notify` edge function.
// All errors are swallowed; notifications must never block the funnel.

import { supabase } from './supabase';

export const notifyRsvp = async (opts: {
  name: string;
  email: string;
  mobile: string;
  accessCode: string;
  venue: string;
  date: string;
}): Promise<void> => {
  try {
    await supabase.functions.invoke('notify', {
      body: {
        type: 'rsvp_confirmation',
        guest: {
          name: opts.name,
          email: opts.email,
          mobile: opts.mobile,
          accessCode: opts.accessCode,
          venue: opts.venue,
          date: opts.date,
        },
      },
    });
  } catch {
    // best-effort — never block the funnel
  }
};

export const notifyInquiry = async (opts: {
  name: string;
  email: string;
  phone: string;
  eventType?: string;
  message?: string;
}): Promise<void> => {
  try {
    await supabase.functions.invoke('notify', {
      body: {
        type: 'inquiry_lead',
        inquiry: {
          name: opts.name,
          email: opts.email,
          phone: opts.phone,
          eventType: opts.eventType,
          message: opts.message,
        },
      },
    });
  } catch {
    // best-effort — never block admin notifications
  }
};

/**
 * Re-send a guest's confirmation email — the same ConexMail welcome template
 * they received at registration, carrying their check-in QR and access code.
 * For the door when someone has lost or can't find the original.
 *
 * Unlike the helpers above this one THROWS. Those are fire-and-forget because
 * a failed notification must never block registration; here an admin is
 * waiting on the result, and silently reporting success for an email that
 * never sent would send a guest away empty-handed.
 *
 * Email only — `mobile` is deliberately omitted so the edge function skips the
 * SMS leg. Resending is a door-side action that may be repeated, and each SMS
 * costs money.
 */
export const resendTicketEmail = async (opts: {
  name: string;
  email: string;
  accessCode: string;
  venue: string;
  date: string;
}): Promise<void> => {
  const { data, error } = await supabase.functions.invoke('notify', {
    body: {
      type: 'rsvp_confirmation',
      guest: {
        name: opts.name,
        email: opts.email,
        accessCode: opts.accessCode,
        venue: opts.venue,
        date: opts.date,
      },
    },
  });
  if (error) throw error;
  const emailResult = (data as { results?: { email?: { sent?: boolean; error?: string } } } | null)
    ?.results?.email;
  if (emailResult && emailResult.sent === false) {
    throw new Error(emailResult.error ?? 'The mail service rejected the send');
  }
};
