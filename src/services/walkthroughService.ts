import { supabase } from '../lib/supabase';
import type { WalkthroughItem, WalkthroughType } from '../types';
import { uid } from '../utils/id';

const ACTIVE_EVENT_ID = 'evt_fiad_dec25';

type Row = {
  id: string;
  event_id: string;
  type: WalkthroughType;
  title: string;
  content: string;
  image_url: string | null;
  time: string | null;
  sort_order: number;
  store_id: string | null;
};

const rowToItem = (r: Row): WalkthroughItem => ({
  id: r.id,
  eventId: r.event_id,
  type: r.type,
  title: r.title,
  content: r.content,
  imageUrl: r.image_url ?? undefined,
  time: r.time ?? undefined,
  order: r.sort_order,
  storeId: r.store_id ?? undefined,
});

export const listWalkthrough = async (type?: WalkthroughType): Promise<WalkthroughItem[]> => {
  let q = supabase.from('walkthrough_items').select('*').order('sort_order');
  if (type) q = q.eq('type', type);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(rowToItem);
};

export const createWalkthrough = async (
  w: Omit<WalkthroughItem, 'id' | 'eventId'>,
): Promise<WalkthroughItem> => {
  const row: Row = {
    id: uid('wt'),
    event_id: ACTIVE_EVENT_ID,
    type: w.type,
    title: w.title,
    content: w.content,
    image_url: w.imageUrl ?? null,
    time: w.time ?? null,
    sort_order: w.order,
    store_id: w.storeId ?? null,
  };
  const { error } = await supabase.from('walkthrough_items').insert(row);
  if (error) throw error;
  return rowToItem(row);
};

export const updateWalkthrough = async (
  id: string,
  patch: Partial<WalkthroughItem>,
): Promise<WalkthroughItem | undefined> => {
  const dbPatch: Partial<Row> = {};
  if (patch.type !== undefined) dbPatch.type = patch.type;
  if (patch.title !== undefined) dbPatch.title = patch.title;
  if (patch.content !== undefined) dbPatch.content = patch.content;
  if (patch.imageUrl !== undefined) dbPatch.image_url = patch.imageUrl ?? null;
  if (patch.time !== undefined) dbPatch.time = patch.time ?? null;
  if (patch.order !== undefined) dbPatch.sort_order = patch.order;
  if (patch.storeId !== undefined) dbPatch.store_id = patch.storeId ?? null;
  const { data, error } = await supabase
    .from('walkthrough_items')
    .update(dbPatch)
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data ? rowToItem(data) : undefined;
};

export const deleteWalkthrough = async (id: string): Promise<void> => {
  const { error } = await supabase.from('walkthrough_items').delete().eq('id', id);
  if (error) throw error;
};
