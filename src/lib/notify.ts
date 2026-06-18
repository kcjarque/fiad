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
