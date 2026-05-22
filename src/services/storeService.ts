import { supabase } from '../lib/supabase';
import type { Store } from '../types';
import { uid } from '../utils/id';
import { getActiveEvent } from './eventService';

type Row = {
  id: string;
  event_id: string;
  name: string;
  category: string;
  description: string;
  logo_url: string;
  image_url: string | null;
  booth_number: string;
  qr_token: string;
  passcode: string;
  email?: string | null;
  contact?: string | null;
  social_media?: string | null;
};

const rowToStore = (r: Row): Store => ({
  id: r.id,
  eventId: r.event_id,
  name: r.name,
  category: r.category,
  description: r.description,
  logoUrl: r.logo_url,
  imageUrl: r.image_url ?? undefined,
  boothNumber: r.booth_number,
  qrToken: r.qr_token,
  passcode: r.passcode,
  email: r.email ?? undefined,
  contact: r.contact ?? undefined,
  socialMedia: r.social_media ?? undefined,
});

const storeToInsert = (s: Store): Row => ({
  id: s.id,
  event_id: s.eventId,
  name: s.name,
  category: s.category,
  description: s.description,
  logo_url: s.logoUrl,
  image_url: s.imageUrl ?? null,
  booth_number: s.boothNumber,
  qr_token: s.qrToken,
  passcode: s.passcode,
  email: s.email ?? null,
  contact: s.contact ?? null,
  social_media: s.socialMedia ?? null,
});

export const listStores = async (): Promise<Store[]> => {
  const { data, error } = await supabase.from('stores').select('*').order('booth_number');
  if (error) throw error;
  return (data ?? []).map(rowToStore);
};

export const getStore = async (id: string): Promise<Store | undefined> => {
  const { data, error } = await supabase.from('stores').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? rowToStore(data) : undefined;
};

export const getStoreByQr = async (qrToken: string): Promise<Store | undefined> => {
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('qr_token', qrToken)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToStore(data) : undefined;
};

export const createStore = async (
  data: Omit<Store, 'id' | 'qrToken' | 'eventId'>,
): Promise<Store> => {
  const event = await getActiveEvent();
  const store: Store = {
    ...data,
    id: uid('store'),
    qrToken: `store-qr-${Math.random().toString(36).slice(2, 10)}`,
    eventId: event.id,
  };
  const { error } = await supabase.from('stores').insert(storeToInsert(store));
  if (error) throw error;
  return store;
};

export const updateStore = async (
  id: string,
  patch: Partial<Store>,
): Promise<Store | undefined> => {
  const dbPatch: Partial<Row> = {};
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.category !== undefined) dbPatch.category = patch.category;
  if (patch.description !== undefined) dbPatch.description = patch.description;
  if (patch.logoUrl !== undefined) dbPatch.logo_url = patch.logoUrl;
  if (patch.imageUrl !== undefined) dbPatch.image_url = patch.imageUrl ?? null;
  if (patch.boothNumber !== undefined) dbPatch.booth_number = patch.boothNumber;
  if (patch.passcode !== undefined) dbPatch.passcode = patch.passcode;
  const { data, error } = await supabase
    .from('stores')
    .update(dbPatch)
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data ? rowToStore(data) : undefined;
};

export const deleteStore = async (id: string): Promise<void> => {
  const { error } = await supabase.from('stores').delete().eq('id', id);
  if (error) throw error;
};
