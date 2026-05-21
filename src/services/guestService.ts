import { supabase } from '../lib/supabase';
import type { Guest } from '../types';
import { uid } from '../utils/id';
import { getActiveEvent } from './eventService';

type Row = {
  id: string;
  event_id: string;
  name: string;
  email: string;
  mobile: string;
  qr_token: string;
  registered_at: string;
  access_code?: string | null;
};

const rowToGuest = (r: Row): Guest => ({
  id: r.id,
  eventId: r.event_id,
  name: r.name,
  email: r.email,
  mobile: r.mobile,
  qrToken: r.qr_token,
  registeredAt: r.registered_at,
  accessCode: r.access_code ?? undefined,
});

export const registerGuest = async (data: {
  name: string;
  email: string;
  mobile: string;
}): Promise<Guest> => {
  const event = await getActiveEvent();
  const guest: Guest = {
    id: uid('guest'),
    name: data.name.trim(),
    email: data.email.trim(),
    mobile: data.mobile.trim(),
    qrToken: `guest-qr-${Math.random().toString(36).slice(2, 12)}`,
    registeredAt: new Date().toISOString(),
    eventId: event.id,
  };
  const { error } = await supabase.from('guests').insert({
    id: guest.id,
    event_id: guest.eventId,
    name: guest.name,
    email: guest.email,
    mobile: guest.mobile,
    qr_token: guest.qrToken,
    registered_at: guest.registeredAt,
  });
  if (error) throw error;
  return guest;
};

export const getGuest = async (id: string): Promise<Guest | undefined> => {
  const { data, error } = await supabase.from('guests').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? rowToGuest(data) : undefined;
};

export const getGuestByQr = async (qrToken: string): Promise<Guest | undefined> => {
  const { data, error } = await supabase
    .from('guests')
    .select('*')
    .eq('qr_token', qrToken)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToGuest(data) : undefined;
};

export const findGuestByEmail = async (email: string): Promise<Guest | undefined> => {
  const e = email.trim().toLowerCase();
  const { data, error } = await supabase
    .from('guests')
    .select('*')
    .ilike('email', e)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToGuest(data) : undefined;
};

export const loginGuestWithAccessCode = async (
  email: string,
  code: string,
): Promise<Guest> => {
  const { data, error } = await supabase.functions.invoke('guest-login', {
    body: { email: email.trim().toLowerCase(), code: code.trim().toUpperCase() },
  });
  if (error) {
    const status = (error as { status?: number }).status;
    if (status === 401) throw new Error('Invalid email or access code.');
    throw new Error(error.message ?? 'Sign-in failed.');
  }
  if (!data?.ok || !data.guest) throw new Error('Invalid email or access code.');
  return rowToGuest(data.guest);
};

export const listGuests = async (): Promise<Guest[]> => {
  const { data, error } = await supabase
    .from('guests')
    .select('*')
    .order('registered_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToGuest);
};
