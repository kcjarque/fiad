import { supabase } from '../lib/supabase';
import { uid } from '../utils/id';
import { FIAD_CAMPAIGN, CAMPAIGN_EMAILS } from '../data/fiadCampaign';
import type {
  EmailCampaign,
  CampaignEmail,
  CampaignRecipient,
  CampaignTrack,
} from '../types';

// ── Row shapes (snake_case from PostgREST) ───────────────────────────────────
type CampaignRow = {
  id: string;
  name: string;
  status: EmailCampaign['status'];
  from_name: string;
  register_link: string;
  fb_page: string;
  created_at: string;
  updated_at: string;
};
type EmailRow = {
  id: string;
  campaign_id: string;
  track: CampaignTrack;
  seq_no: number;
  label: string | null;
  subject: string;
  preview: string | null;
  body_html: string;
  scheduled_at: string;
  status: CampaignEmail['status'];
  sent_count: number;
  created_at: string;
  updated_at: string;
};
type RecipientRow = {
  id: string;
  campaign_id: string;
  track: CampaignTrack;
  email: string;
  first_name: string | null;
  created_at: string;
};

const toCampaign = (r: CampaignRow): EmailCampaign => ({
  id: r.id,
  name: r.name,
  status: r.status,
  fromName: r.from_name,
  registerLink: r.register_link,
  fbPage: r.fb_page,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});
const toEmail = (r: EmailRow): CampaignEmail => ({
  id: r.id,
  campaignId: r.campaign_id,
  track: r.track,
  seqNo: r.seq_no,
  label: r.label ?? undefined,
  subject: r.subject,
  preview: r.preview ?? undefined,
  bodyHtml: r.body_html,
  scheduledAt: r.scheduled_at,
  status: r.status,
  sentCount: r.sent_count,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});
const toRecipient = (r: RecipientRow): CampaignRecipient => ({
  id: r.id,
  campaignId: r.campaign_id,
  track: r.track,
  email: r.email,
  firstName: r.first_name ?? undefined,
  createdAt: r.created_at,
});

const emailRowId = (campaignId: string, key: string) => `cmail_${campaignId}_${key}`;

// ── Campaign ─────────────────────────────────────────────────────────────────
/** The single FIAD campaign, or null if not seeded yet. */
export const getCampaign = async (): Promise<EmailCampaign | null> => {
  const { data, error } = await supabase
    .from('email_campaigns')
    .select('*')
    .eq('id', FIAD_CAMPAIGN.id)
    .maybeSingle();
  if (error) throw error;
  return data ? toCampaign(data as CampaignRow) : null;
};

/**
 * Insert the campaign + all 20 emails. Idempotent: rows use deterministic ids
 * and existing rows are left untouched (never clobbers admin edits).
 */
export const seedCampaign = async (): Promise<void> => {
  const now = new Date().toISOString();
  const { error: cErr } = await supabase
    .from('email_campaigns')
    .upsert(
      {
        id: FIAD_CAMPAIGN.id,
        name: FIAD_CAMPAIGN.name,
        status: 'draft',
        from_name: FIAD_CAMPAIGN.fromName,
        register_link: FIAD_CAMPAIGN.registerLink,
        fb_page: FIAD_CAMPAIGN.fbPage,
        created_at: now,
        updated_at: now,
      },
      { onConflict: 'id', ignoreDuplicates: true },
    );
  if (cErr) throw cErr;

  const rows = CAMPAIGN_EMAILS.map((e) => ({
    id: emailRowId(FIAD_CAMPAIGN.id, e.key),
    campaign_id: FIAD_CAMPAIGN.id,
    track: e.track,
    seq_no: e.seqNo,
    label: e.label,
    subject: e.subject,
    preview: e.preview,
    body_html: e.bodyHtml,
    scheduled_at: e.scheduledAt,
    status: 'scheduled',
    sent_count: 0,
    created_at: now,
    updated_at: now,
  }));
  const { error: eErr } = await supabase
    .from('campaign_emails')
    .upsert(rows, { onConflict: 'id', ignoreDuplicates: true });
  if (eErr) throw eErr;
};

export const updateCampaign = async (
  id: string,
  patch: Partial<Pick<EmailCampaign, 'status' | 'fromName' | 'registerLink' | 'fbPage'>>,
): Promise<void> => {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.fromName !== undefined) row.from_name = patch.fromName;
  if (patch.registerLink !== undefined) row.register_link = patch.registerLink;
  if (patch.fbPage !== undefined) row.fb_page = patch.fbPage;
  const { error } = await supabase.from('email_campaigns').update(row).eq('id', id);
  if (error) throw error;
};

// ── Emails ───────────────────────────────────────────────────────────────────
export const listEmails = async (campaignId: string): Promise<CampaignEmail[]> => {
  const { data, error } = await supabase
    .from('campaign_emails')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('track', { ascending: true })
    .order('seq_no', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => toEmail(r as EmailRow));
};

export const updateEmail = async (
  id: string,
  patch: Partial<Pick<CampaignEmail, 'subject' | 'preview' | 'bodyHtml' | 'scheduledAt' | 'status'>>,
): Promise<void> => {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.subject !== undefined) row.subject = patch.subject;
  if (patch.preview !== undefined) row.preview = patch.preview;
  if (patch.bodyHtml !== undefined) row.body_html = patch.bodyHtml;
  if (patch.scheduledAt !== undefined) row.scheduled_at = patch.scheduledAt;
  if (patch.status !== undefined) row.status = patch.status;
  const { error } = await supabase.from('campaign_emails').update(row).eq('id', id);
  if (error) throw error;
};

// ── Recipients ───────────────────────────────────────────────────────────────
export const listRecipients = async (campaignId: string): Promise<CampaignRecipient[]> => {
  const { data, error } = await supabase
    .from('campaign_recipients')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => toRecipient(r as RecipientRow));
};

/**
 * Parse "email, first name" lines (or CSV) and insert for a track. Emails are
 * lowercased + de-duplicated; existing rows are ignored (unique index). Returns
 * how many valid rows were submitted.
 */
export const importRecipients = async (
  campaignId: string,
  track: CampaignTrack,
  raw: string,
): Promise<{ parsed: number }> => {
  const seen = new Set<string>();
  const rows = raw
    .split(/\r?\n/)
    .map((line) => {
      const parts = line.split(/[,\t]/).map((s) => s.trim());
      const email = (parts[0] ?? '').toLowerCase();
      const firstName = parts[1] ?? '';
      return { email, firstName };
    })
    .filter((r) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.email))
    .filter((r) => (seen.has(r.email) ? false : (seen.add(r.email), true)))
    .map((r) => ({
      id: uid('crcp'),
      campaign_id: campaignId,
      track,
      email: r.email,
      first_name: r.firstName || null,
      created_at: new Date().toISOString(),
    }));
  if (rows.length === 0) return { parsed: 0 };
  const { error } = await supabase
    .from('campaign_recipients')
    .upsert(rows, { onConflict: 'campaign_id,track,email', ignoreDuplicates: true });
  if (error) throw error;
  return { parsed: rows.length };
};

export const deleteRecipient = async (id: string): Promise<void> => {
  const { error } = await supabase.from('campaign_recipients').delete().eq('id', id);
  if (error) throw error;
};

// ── Sends (edge function) ────────────────────────────────────────────────────
/** Send one test copy of an email to `to` with sample merge data. */
export const sendTestEmail = async (
  emailId: string,
  to: string,
  firstName?: string,
): Promise<unknown> => {
  const { data, error } = await supabase.functions.invoke('campaign-dispatch', {
    body: { mode: 'test', emailId, to, firstName: firstName || 'Maria' },
  });
  if (error) throw error;
  return data;
};

/** Manually run the due-email dispatch (same call cron makes). For testing. */
export const runDispatch = async (): Promise<unknown> => {
  const { data, error } = await supabase.functions.invoke('campaign-dispatch', {
    body: { mode: 'dispatch' },
  });
  if (error) throw error;
  return data;
};
