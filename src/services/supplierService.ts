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
  createdAt: r.created_at,
});

export const createSupplierSignup = async (data: {
  businessName: string;
  contactPerson: string;
  email: string;
  mobile: string;
  category?: string;
  social?: string;
  products?: string;
  message?: string;
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
