import { supabase } from '../lib/supabase';
import type { EventInquiry } from '../types';
import { uid } from '../utils/id';
import { getSelectedEventId } from '../stores/eventStore';

type Row = {
  id: string;
  event_id: string | null;
  name: string;
  email: string;
  phone: string;
  event_type: string | null;
  message: string | null;
  created_at: string;
};

const rowToInquiry = (r: Row): EventInquiry => ({
  id: r.id,
  eventId: r.event_id ?? undefined,
  name: r.name,
  email: r.email,
  phone: r.phone,
  eventType: r.event_type ?? undefined,
  message: r.message ?? undefined,
  createdAt: r.created_at,
});

export const createInquiry = async (
  data: {
    name: string;
    email: string;
    phone: string;
    eventType?: string;
    message?: string;
  },
  // Event the lead came from. The /rsvp funnel passes the chosen venue's
  // event id explicitly (a public browser's selected event still defaults to
  // Season 1, so we can't infer it).
  eventId: string = getSelectedEventId(),
): Promise<EventInquiry> => {
  const inquiry: Row = {
    id: uid('inq'),
    event_id: eventId,
    name: data.name.trim(),
    email: data.email.trim(),
    phone: data.phone.trim(),
    event_type: data.eventType?.trim() || null,
    message: data.message?.trim() || null,
    created_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('event_inquiries').insert(inquiry);
  if (error) throw error;
  return rowToInquiry(inquiry);
};

/**
 * All inquiries, newest first. Intentionally NOT event-scoped — these are
 * sales leads, and the admin wants one inbox across every event.
 */
export const listInquiries = async (): Promise<EventInquiry[]> => {
  const { data, error } = await supabase
    .from('event_inquiries')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToInquiry);
};
