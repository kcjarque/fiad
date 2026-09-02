import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, Send, Users, Calendar, Eye, X, Play, AlertTriangle, Sparkles } from 'lucide-react';
import { AdminShell } from '../../components/admin/AdminShell';
import { toast } from '../../stores/toastStore';
import {
  getCampaign,
  seedCampaign,
  updateCampaign,
  listEmails,
  updateEmail,
  listRecipients,
  importRecipients,
  sendTestEmail,
  runDispatch,
} from '../../services/campaignService';
import { renderMergeFields } from '../../data/fiadCampaign';
import type { CampaignEmail, CampaignTrack, EmailCampaign, CampaignStatus } from '../../types';

const MANILA = 'Asia/Manila';

function manilaParts(iso: string): { date: string; time: string } {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: MANILA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}
const manilaToIso = (date: string, time: string) => `${date}T${time}:00+08:00`;
const fmtManila = (iso: string) =>
  new Date(iso).toLocaleString('en-PH', {
    timeZone: MANILA,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const STATUS_STYLE: Record<string, string> = {
  scheduled: 'bg-champagne/20 text-plum',
  sending: 'bg-rose/25 text-plum',
  sent: 'bg-emerald-100 text-emerald-800',
  paused: 'bg-plum/10 text-plum/60',
  draft: 'bg-plum/10 text-plum/60',
  active: 'bg-emerald-100 text-emerald-800',
};

export function AdminEmailMarketing() {
  const qc = useQueryClient();
  const {
    data: campaign,
    isLoading,
    error,
  } = useQuery<EmailCampaign | null>({ queryKey: ['campaign'], queryFn: getCampaign });

  const [seeding, setSeeding] = useState(false);

  const doSeed = async () => {
    setSeeding(true);
    try {
      await seedCampaign();
      await qc.invalidateQueries({ queryKey: ['campaign'] });
      await qc.invalidateQueries({ queryKey: ['campaignEmails'] });
      toast.success('Campaign created — all 20 emails seeded.');
    } catch (e) {
      toast.error(`Could not create campaign: ${(e as Error).message}`);
    } finally {
      setSeeding(false);
    }
  };

  // Table-missing (migration not applied) → friendly setup notice.
  if (error) {
    return (
      <AdminShell>
        <Header />
        <div className="card max-w-2xl border border-amber-200 bg-amber-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
            <div>
              <div className="font-medium text-plum">Email Marketing tables aren’t set up yet</div>
              <p className="text-sm text-plum/70 mt-1">
                Apply migration <code className="bg-white px-1 rounded">0058_email_campaigns.sql</code> in the
                Supabase dashboard, then reload this page.
              </p>
              <p className="text-xs text-plum/50 mt-2 break-all">{(error as Error).message}</p>
            </div>
          </div>
        </div>
      </AdminShell>
    );
  }

  if (isLoading) {
    return (
      <AdminShell>
        <Header />
        <div className="text-plum/60">Loading…</div>
      </AdminShell>
    );
  }

  if (!campaign) {
    return (
      <AdminShell>
        <Header />
        <div className="card max-w-2xl text-center">
          <div className="w-14 h-14 rounded-2xl bg-coral/10 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="text-coral" size={26} />
          </div>
          <div className="font-display text-xl text-plum">Set up the Season 2 campaign</div>
          <p className="text-sm text-plum/60 mt-2 max-w-md mx-auto">
            Creates the “40-Day Blast” with all 16 visitor + 4 supplier emails, pre-scheduled
            (8 AM Manila, with Aug 11 at 7 PM). Nothing sends until you import a list and set the
            campaign to <strong>Active</strong>.
          </p>
          <button className="btn-primary mt-5" onClick={doSeed} disabled={seeding}>
            {seeding ? 'Creating…' : 'Create Season 2 campaign'}
          </button>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <Header />
      <CampaignBody campaign={campaign} />
    </AdminShell>
  );
}

function Header() {
  return (
    <div className="mb-4 md:mb-6">
      <h1 className="font-display text-2xl md:text-3xl flex items-center gap-2">
        <Mail size={24} className="text-coral" /> Email Marketing
      </h1>
      <p className="text-sm text-plum/60 mt-1">Season 2 · 40-Day Blast Campaign</p>
    </div>
  );
}

function CampaignBody({ campaign }: { campaign: EmailCampaign }) {
  const qc = useQueryClient();
  const { data: emails = [] } = useQuery({
    queryKey: ['campaignEmails', campaign.id],
    queryFn: () => listEmails(campaign.id),
  });
  const { data: recipients = [] } = useQuery({
    queryKey: ['campaignRecipients', campaign.id],
    queryFn: () => listRecipients(campaign.id),
  });

  const [editing, setEditing] = useState<CampaignEmail | null>(null);

  const visitor = emails.filter((e) => e.track === 'visitor');
  const supplier = emails.filter((e) => e.track === 'supplier');
  const counts = useMemo(
    () => ({
      visitor: recipients.filter((r) => r.track === 'visitor').length,
      supplier: recipients.filter((r) => r.track === 'supplier').length,
    }),
    [recipients],
  );

  const setStatus = async (status: CampaignStatus) => {
    if (status === 'active' && recipients.length === 0) {
      toast.error('Add recipients before activating — an active campaign with no list sends nothing.');
    }
    try {
      await updateCampaign(campaign.id, { status });
      await qc.invalidateQueries({ queryKey: ['campaign'] });
      toast.success(`Campaign ${status}.`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const doDispatch = async () => {
    if (!confirm('Run the dispatcher now? It sends any emails that are already due to your list.')) return;
    try {
      const res = (await runDispatch()) as { due?: number };
      toast.success(`Dispatch ran — ${res?.due ?? 0} due email(s) processed.`);
      await qc.invalidateQueries({ queryKey: ['campaignEmails', campaign.id] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Status + settings */}
      <div className="grid md:grid-cols-2 gap-4">
        <StatusCard campaign={campaign} onStatus={setStatus} onDispatch={doDispatch} recipientCount={recipients.length} />
        <SettingsCard campaign={campaign} />
      </div>

      {/* Recipients */}
      <RecipientsCard campaignId={campaign.id} counts={counts} total={recipients.length} />

      {/* Emails */}
      <div className="grid lg:grid-cols-2 gap-6">
        <EmailColumn title="Visitor Track" subtitle={`${visitor.length} emails`} emails={visitor} onOpen={setEditing} />
        <EmailColumn title="Supplier Track" subtitle={`${supplier.length} emails`} emails={supplier} onOpen={setEditing} />
      </div>

      {editing && (
        <EmailEditor campaign={campaign} email={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

function StatusCard({
  campaign,
  onStatus,
  onDispatch,
  recipientCount,
}: {
  campaign: EmailCampaign;
  onStatus: (s: CampaignStatus) => void;
  onDispatch: () => void;
  recipientCount: number;
}) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <span className="label !mb-0">Campaign status</span>
        <span className={`chip ${STATUS_STYLE[campaign.status]}`}>{campaign.status}</span>
      </div>
      <div className="flex gap-2 mt-3">
        {(['draft', 'active', 'paused'] as CampaignStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => onStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-sm capitalize transition ${
              campaign.status === s ? 'bg-coral text-white' : 'bg-plum/5 text-plum/70 hover:bg-plum/10'
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      <p className="text-xs text-plum/50 mt-3">
        {campaign.status === 'active'
          ? 'Live — the scheduler will blast due emails to your list every 5 minutes.'
          : 'Paused/draft — nothing sends automatically. Set to Active when the list is ready.'}
      </p>
      <button className="btn-ghost !px-3 !py-2 text-sm mt-2 border border-plum/15" onClick={onDispatch}>
        <Play size={14} className="mr-1.5" /> Run dispatch now
      </button>
      {recipientCount === 0 && (
        <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
          <AlertTriangle size={12} /> No recipients yet — imports drive who gets emailed.
        </p>
      )}
    </div>
  );
}

function SettingsCard({ campaign }: { campaign: EmailCampaign }) {
  const qc = useQueryClient();
  const [fromName, setFromName] = useState(campaign.fromName);
  const [registerLink, setRegisterLink] = useState(campaign.registerLink);
  const [fbPage, setFbPage] = useState(campaign.fbPage);
  const dirty = fromName !== campaign.fromName || registerLink !== campaign.registerLink || fbPage !== campaign.fbPage;

  const save = async () => {
    try {
      await updateCampaign(campaign.id, { fromName, registerLink, fbPage });
      await qc.invalidateQueries({ queryKey: ['campaign'] });
      toast.success('Sender settings saved.');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="card space-y-3">
      <span className="label !mb-0">Sender &amp; links (merge defaults)</span>
      <div>
        <label className="label">From name</label>
        <input className="input" value={fromName} onChange={(e) => setFromName(e.target.value)} />
      </div>
      <div>
        <label className="label">Register link · {'{{register_link}}'}</label>
        <input className="input" value={registerLink} onChange={(e) => setRegisterLink(e.target.value)} />
      </div>
      <div>
        <label className="label">Facebook page · {'{{fb_page}}'}</label>
        <input className="input" value={fbPage} onChange={(e) => setFbPage(e.target.value)} />
      </div>
      <button className="btn-primary !py-2 text-sm" onClick={save} disabled={!dirty}>
        Save
      </button>
    </div>
  );
}

function RecipientsCard({
  campaignId,
  counts,
  total,
}: {
  campaignId: string;
  counts: { visitor: number; supplier: number };
  total: number;
}) {
  const qc = useQueryClient();
  const [track, setTrack] = useState<CampaignTrack>('visitor');
  const [raw, setRaw] = useState('');
  const [busy, setBusy] = useState(false);

  const doImport = async () => {
    if (!raw.trim()) return;
    setBusy(true);
    try {
      const { parsed } = await importRecipients(campaignId, track, raw);
      await qc.invalidateQueries({ queryKey: ['campaignRecipients', campaignId] });
      setRaw('');
      toast.success(parsed ? `Imported ${parsed} ${track} recipient(s).` : 'No valid emails found.');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="label !mb-0 flex items-center gap-1.5">
          <Users size={15} className="text-plum/50" /> Recipient list
        </span>
        <div className="flex gap-2 text-xs">
          <span className="chip">Visitor: {counts.visitor}</span>
          <span className="chip">Supplier: {counts.supplier}</span>
          <span className="chip bg-coral/10 text-coral">Total: {total}</span>
        </div>
      </div>
      <p className="text-xs text-plum/50 mt-2">
        The campaign list is separate from your event guests. Paste one recipient per line as{' '}
        <code className="bg-plum/5 px-1 rounded">email, First Name</code>. Duplicates are skipped.
      </p>
      <div className="flex gap-2 mt-3">
        {(['visitor', 'supplier'] as CampaignTrack[]).map((t) => (
          <button
            key={t}
            onClick={() => setTrack(t)}
            className={`px-3 py-1.5 rounded-lg text-sm capitalize ${
              track === t ? 'bg-plum text-cream' : 'bg-plum/5 text-plum/70 hover:bg-plum/10'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <textarea
        className="input mt-2 font-mono text-sm"
        rows={4}
        placeholder={'maria@email.com, Maria\njose@email.com, Jose'}
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
      />
      <button className="btn-primary !py-2 text-sm mt-2" onClick={doImport} disabled={busy || !raw.trim()}>
        {busy ? 'Importing…' : `Import to ${track}`}
      </button>
    </div>
  );
}

function EmailColumn({
  title,
  subtitle,
  emails,
  onOpen,
}: {
  title: string;
  subtitle: string;
  emails: CampaignEmail[];
  onOpen: (e: CampaignEmail) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="font-display text-lg text-plum">{title}</h2>
        <span className="text-xs text-plum/50">{subtitle}</span>
      </div>
      <div className="space-y-2">
        {emails.map((e) => (
          <button
            key={e.id}
            onClick={() => onOpen(e)}
            className="card !p-3.5 w-full text-left hover:shadow-soft transition block"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-plum/50">
                  <Calendar size={12} /> {fmtManila(e.scheduledAt)}
                </div>
                <div className="font-medium text-plum truncate mt-1">{e.subject}</div>
                {e.preview && <div className="text-xs text-plum/50 truncate">{e.preview}</div>}
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className={`chip ${STATUS_STYLE[e.status]}`}>{e.status}</span>
                {e.sentCount > 0 && <span className="text-[11px] text-plum/40">{e.sentCount} sent</span>}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function EmailEditor({
  campaign,
  email,
  onClose,
}: {
  campaign: EmailCampaign;
  email: CampaignEmail;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const initial = manilaParts(email.scheduledAt);
  const [subject, setSubject] = useState(email.subject);
  const [preview, setPreview] = useState(email.preview ?? '');
  const [bodyHtml, setBodyHtml] = useState(email.bodyHtml);
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [testTo, setTestTo] = useState('kyle@conexmedia.ph');
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);

  const renderedPreview = useMemo(
    () =>
      renderMergeFields(bodyHtml, {
        firstName: 'Maria',
        registerLink: campaign.registerLink,
        fromName: campaign.fromName,
        fbPage: campaign.fbPage,
      }),
    [bodyHtml, campaign],
  );

  const save = async () => {
    setSaving(true);
    try {
      await updateEmail(email.id, {
        subject,
        preview,
        bodyHtml,
        scheduledAt: manilaToIso(date, time),
      });
      await qc.invalidateQueries({ queryKey: ['campaignEmails', campaign.id] });
      toast.success('Email saved.');
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(testTo)) return toast.error('Enter a valid test email.');
    setSending(true);
    try {
      const res = (await sendTestEmail(email.id, testTo)) as { result?: { sent?: boolean; error?: string } };
      if (res?.result?.sent) toast.success(`Test sent to ${testTo}.`);
      else toast.error(`Test not sent: ${res?.result?.error ?? 'unknown error'}`);
    } catch (e) {
      toast.error(`Test failed: ${(e as Error).message}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog">
      <div className="absolute inset-0 bg-plum/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-4xl h-full bg-cream shadow-soft flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-plum/10 bg-white">
          <div className="min-w-0">
            <div className="text-xs text-plum/50">{email.label}</div>
            <div className="font-medium text-plum truncate">{fmtManila(manilaToIso(date, time))}</div>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-2 text-plum/60 hover:text-plum">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto grid md:grid-cols-2 gap-0">
          {/* Left — fields */}
          <div className="p-5 space-y-4 md:border-r border-plum/10">
            <div>
              <label className="label">Subject</label>
              <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div>
              <label className="label">Preview text</label>
              <input className="input" value={preview} onChange={(e) => setPreview(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Send date (Manila)</label>
                <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <label className="label">Time (Manila)</label>
                <input type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label">Body HTML</label>
              <textarea
                className="input font-mono text-xs"
                rows={12}
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
              />
              <p className="text-xs text-plum/40 mt-1">
                Tokens: {'{{first_name}}'} {'{{register_link}}'} {'{{from_name}}'} {'{{fb_page}}'}
              </p>
            </div>
            <div className="card !p-3 bg-white">
              <label className="label flex items-center gap-1.5">
                <Send size={13} className="text-coral" /> Send a test
              </label>
              <div className="flex gap-2">
                <input className="input" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
                <button className="btn-secondary !py-2 shrink-0" onClick={sendTest} disabled={sending}>
                  {sending ? '…' : 'Send'}
                </button>
              </div>
              <p className="text-xs text-plum/40 mt-1">Sends only to this address, with sample merge data.</p>
            </div>
          </div>

          {/* Right — live preview */}
          <div className="p-5 bg-plum/5">
            <div className="label flex items-center gap-1.5">
              <Eye size={13} /> Live preview
            </div>
            <div className="rounded-xl overflow-hidden border border-plum/10 bg-white">
              <iframe title="Email preview" srcDoc={renderedPreview} className="w-full h-[560px] bg-white" />
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-plum/10 bg-white flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
