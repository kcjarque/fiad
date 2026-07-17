import { supabase } from '../lib/supabase';
import type { SupplierSignup } from '../types';
import { uid } from '../utils/id';

type Row = {
  id: string;
  business_name: string;
  contact_person: string;
  email: string;
  mobile: string;
  category: string | null;
  social: string | null;
  products: string | null;
  message: string | null;
  document_urls: string[] | null;
  created_at: string;
};

const rowToSignup = (r: Row): SupplierSignup => ({
  id: r.id,
  businessName: r.business_name,
  contactPerson: r.contact_person,
  email: r.email,
  mobile: r.mobile,
  category: r.category ?? undefined,
  social: r.social ?? undefined,
  products: r.products ?? undefined,
  message: r.message ?? undefined,
  documentUrls: r.document_urls ?? undefined,
  createdAt: r.created_at,
});

const DOCS_BUCKET = 'supplier-docs';

/**
 * Upload the DTI (or SEC) registration files to Supabase Storage and return
 * their public URLs. Called before createSupplierSignup so the URLs can be
 * stored on the row. Each file gets a random prefix so names never collide.
 */
export const uploadSupplierDocs = async (files: File[]): Promise<string[]> => {
  const urls: string[] = [];
  for (const file of files) {
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${uid('doc')}-${safe}`;
    const { error } = await supabase.storage
      .from(DOCS_BUCKET)
      .upload(path, file, { contentType: file.type || undefined, upsert: false });
    if (error) throw error;
    urls.push(supabase.storage.from(DOCS_BUCKET).getPublicUrl(path).data.publicUrl);
  }
  return urls;
};

export const createSupplierSignup = async (data: {
  businessName: string;
  contactPerson: string;
  email: string;
  mobile: string;
  category?: string;
  social?: string;
  products?: string;
  message?: string;
  documentUrls?: string[];
}): Promise<SupplierSignup> => {
  const row: Row = {
    id: uid('sup'),
    business_name: data.businessName.trim(),
    contact_person: data.contactPerson.trim(),
    email: data.email.trim(),
    mobile: data.mobile.trim(),
    category: data.category?.trim() || null,
    social: data.social?.trim() || null,
    products: data.products?.trim() || null,
    message: data.message?.trim() || null,
    document_urls: data.documentUrls && data.documentUrls.length > 0 ? data.documentUrls : null,
    created_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('supplier_signups').insert(row);
  if (error) throw error;
  return rowToSignup(row);
};

/**
 * All supplier applications, newest first. Not event-scoped — suppliers apply
 * to the fair in general, and the admin wants one inbox.
 */
export const listSupplierSignups = async (): Promise<SupplierSignup[]> => {
  const { data, error } = await supabase
    .from('supplier_signups')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToSignup);
};
