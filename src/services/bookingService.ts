import { supabase } from '../lib/supabase';
import type { SupplierBooking, SupplierBookingStatus } from '../types';
import { uid } from '../utils/id';

type Row = {
  id: string;
  store_id: string;
  event_id: string | null;
  client_name: string;
  client_mobile: string | null;
  client_email: string | null;
  event_date: string | null;
  message: string | null;
  status: SupplierBookingStatus;
  created_at: string;
};

const rowToBooking = (r: Row): SupplierBooking => ({
  id: r.id,
  storeId: r.store_id,
  eventId: r.event_id ?? undefined,
  clientName: r.client_name,
  clientMobile: r.client_mobile ?? undefined,
  clientEmail: r.client_email ?? undefined,
  eventDate: r.event_date ?? undefined,
  message: r.message ?? undefined,
  status: r.status,
  createdAt: r.created_at,
});

export const createBooking = async (input: {
  storeId: string;
  eventId?: string;
  clientName: string;
  clientMobile?: string;
  clientEmail?: string;
  eventDate?: string;
  message?: string;
}): Promise<SupplierBooking> => {
  const row: Row = {
    id: uid('bkg'),
    store_id: input.storeId,
    event_id: input.eventId ?? null,
    client_name: input.clientName.trim(),
    client_mobile: input.clientMobile?.trim() || null,
    client_email: input.clientEmail?.trim() || null,
    event_date: input.eventDate?.trim() || null,
    message: input.message?.trim() || null,
    status: 'new',
    created_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('supplier_bookings').insert(row);
  if (error) throw error;
  // Best-effort: email the supplier so they see it without logging in.
  try {
    await supabase.functions.invoke('notify', { body: { type: 'supplier_booking', bookingId: row.id } });
  } catch {
    /* notification is best-effort — never block the booking */
  }
  return rowToBooking(row);
};

export const listBookingsForStore = async (storeId: string): Promise<SupplierBooking[]> => {
  const { data, error } = await supabase
    .from('supplier_bookings')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToBooking);
};

export const listAllBookings = async (): Promise<SupplierBooking[]> => {
  const { data, error } = await supabase
    .from('supplier_bookings')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToBooking);
};

export const updateBookingStatus = async (id: string, status: SupplierBookingStatus): Promise<void> => {
  const { error } = await supabase.from('supplier_bookings').update({ status }).eq('id', id);
  if (error) throw error;
};
