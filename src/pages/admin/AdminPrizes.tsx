import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminShell } from '../../components/admin/AdminShell';
import { createPrize, deletePrize, listPrizes, updatePrize, uploadPrizeImage } from '../../services/prizeService';
import { listGuests } from '../../services/guestService';
import { listStoresForLogin } from '../../services/authService';
import { Modal } from '../../components/shared/Modal';
import { toast } from '../../stores/toastStore';
import type { Prize } from '../../types';
import { useEventStore } from '../../stores/eventStore';
import { listEvents } from '../../services/eventService';

const empty = {
  name: '', description: '', imageUrl: '', quantity: 1, scheduledAt: '', sponsoredByStoreId: '',
  isGrand: false,
  /** Extra events pooled into this prize's draw (host event is always in). */
  poolEventIds: [] as string[],
};

// Convert a stored ISO timestamp to the value a datetime-local input wants
// (local time, "YYYY-MM-DDTHH:MM"), and vice-versa on save.
const toLocalInput = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const fmtSchedule = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';

export function AdminPrizes() {
  const qc = useQueryClient();
  const selectedEventId = useEventStore((s) => s.selectedEventId);
  const { data: prizes = [] } = useQuery({ queryKey: ['prizes', selectedEventId], queryFn: listPrizes });
  const { data: guests = [] } = useQuery({ queryKey: ['guests', selectedEventId], queryFn: listGuests });
  const guestsById = useMemo(() => new Map(guests.map((g) => [g.id, g])), [guests]);
  const { data: stores = [] } = useQuery({ queryKey: ['storesForLogin'], queryFn: listStoresForLogin });
  const suppliers = useMemo(() => stores.filter((s) => s.boothNumber !== 'DEMO'), [stores]);
  const storesById = useMemo(() => new Map(stores.map((s) => [s.id, s])), [stores]);
  // Venues a grand prize can pool in, besides the one hosting it.
  const { data: events = [] } = useQuery({ queryKey: ['events'], queryFn: listEvents });
  const otherEvents = useMemo(
    () => events.filter((e) => e.id !== selectedEventId),
    [events, selectedEventId],
  );

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Prize | null>(null);
  const [draft, setDraft] = useState(empty);
  const [uploadingImg, setUploadingImg] = useState(false);

  const onImgFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingImg(true);
    try {
      const url = await uploadPrizeImage(file);
      setDraft((d) => ({ ...d, imageUrl: url }));
      toast.success('Photo uploaded');
    } catch (err) {
      toast.error(`Upload failed: ${(err as Error).message}`);
    } finally {
      setUploadingImg(false);
    }
  };

  const invalidate = () => qc.invalidateQueries({ queryKey: ['prizes'] });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!draft.name) throw new Error('Name required');
      const payload = {
        ...draft,
        imageUrl: draft.imageUrl || `https://picsum.photos/seed/${encodeURIComponent(draft.name)}/400/400`,
        scheduledAt: draft.scheduledAt ? new Date(draft.scheduledAt).toISOString() : '',
        // A non-grand prize never pools. Empty lets the DB trigger reset the
        // pool to just this prize's own event.
        poolEventIds: draft.isGrand ? draft.poolEventIds : [],
      };
      if (editing) {
        await updatePrize(editing.id, payload);
        toast.success('Prize updated');
      } else {
        await createPrize(payload);
        toast.success('Prize added');
      }
    },
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setEditing(null);
      setDraft(empty);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deletePrize,
    onSuccess: invalidate,
    onError: () => toast.error('Delete failed'),
  });

  const edit = (p: Prize) => {
    setEditing(p);
    setDraft({
      name: p.name, description: p.description, imageUrl: p.imageUrl, quantity: p.quantity,
      scheduledAt: toLocalInput(p.scheduledAt), sponsoredByStoreId: p.sponsoredByStoreId ?? '',
      isGrand: p.isGrand, poolEventIds: p.poolEventIds ?? [],
    });
    setOpen(true);
  };

  return (
    <AdminShell>
      <div className="flex items-center justify-between mb-4 md:mb-6 gap-3">
        <h1 className="font-display text-2xl md:text-3xl">Raffle Prizes</h1>
        <button
          className="btn-primary !px-4 !py-2 text-sm md:text-base md:!px-5 md:!py-3"
          onClick={() => { setEditing(null); setDraft(empty); setOpen(true); }}
        >
          + Add
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {prizes.map((p) => {
          const winner = p.winnerGuestId ? guestsById.get(p.winnerGuestId) : null;
          return (
            <div key={p.id} className="card">
              <img src={p.imageUrl} alt={p.name} className="w-full h-36 object-cover rounded-xl" />
              <div className="font-display text-lg mt-3">{p.name}</div>
              <div className="text-sm text-plum/70 mt-1">{p.description}</div>
              <div className="text-xs text-plum/50 mt-2">Qty: {p.quantity}</div>
              {p.scheduledAt && <div className="text-xs text-plum/60 mt-1">Draw: {fmtSchedule(p.scheduledAt)}</div>}
              {p.sponsoredByStoreId && storesById.get(p.sponsoredByStoreId) && (
                <div className="text-xs text-plum/60 mt-0.5">Sponsor: {storesById.get(p.sponsoredByStoreId)!.name}</div>
              )}
              {winner ? (
                <div className="mt-2 chip bg-emerald-100 text-emerald-800">Won by {winner.name}</div>
              ) : (
                <div className="mt-2 chip">Undrawn</div>
              )}
              <div className="mt-4 flex gap-2">
                <button className="btn-ghost text-sm" onClick={() => edit(p)}>Edit</button>
                <button
                  className="btn-ghost text-sm text-red-600"
                  onClick={() => { if (confirm('Delete this prize?')) deleteMutation.mutate(p.id); }}
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit prize' : 'New prize'}>
        <div className="space-y-3">
          <div>
            <label className="label">Name</label>
            <input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </div>
          <div>
            <label className="label">Photo</label>
            <div className="flex items-center gap-3">
              {draft.imageUrl
                ? <img src={draft.imageUrl} alt="" className="w-16 h-16 rounded-xl object-cover bg-white border border-plum/10 shrink-0" />
                : <div className="w-16 h-16 rounded-xl bg-plum/5 border border-plum/10 flex items-center justify-center text-[10px] text-plum/40 shrink-0">no photo</div>}
              <label className={`inline-flex items-center gap-2 rounded-lg border border-plum/15 px-3 py-2 text-sm cursor-pointer ${uploadingImg ? 'opacity-60' : 'hover:border-coral hover:text-coral'} text-plum`}>
                {uploadingImg ? 'Uploading…' : 'Upload photo'}
                <input type="file" accept="image/*" className="hidden" disabled={uploadingImg} onChange={onImgFile} />
              </label>
            </div>
            <input className="input mt-2 text-xs" value={draft.imageUrl} onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value })} placeholder="…or paste an image URL" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Quantity</label>
              <input type="number" className="input" value={draft.quantity} onChange={(e) => setDraft({ ...draft, quantity: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label">Draw schedule</label>
              <input type="datetime-local" className="input" value={draft.scheduledAt} onChange={(e) => setDraft({ ...draft, scheduledAt: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Linked supplier (sponsor)</label>
            <select className="input" value={draft.sponsoredByStoreId} onChange={(e) => setDraft({ ...draft, sponsoredByStoreId: e.target.value })}>
              <option value="">None</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>Booth {s.boothNumber} — {s.name}</option>)}
            </select>
          </div>

          {/* Grand raffle — paid-only eligibility, and (optionally) a pool
              that spans other venues. The prize is still hosted and drawn at
              the event selected above. */}
          <div className="rounded-xl border border-plum/15 p-3">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1"
                checked={draft.isGrand}
                onChange={(e) => setDraft({ ...draft, isGrand: e.target.checked })}
              />
              <span>
                <span className="label !mb-0">Grand raffle prize</span>
                <span className="block text-xs text-plum/60 mt-0.5">
                  Draws from paid entries only. Past winners stay eligible.
                </span>
              </span>
            </label>

            {draft.isGrand && (
              <div className="mt-3 pl-6">
                <label className="label">Also include entries from</label>
                {otherEvents.length === 0 ? (
                  <div className="text-xs text-plum/60">No other events to pool.</div>
                ) : (
                  otherEvents.map((ev) => (
                    <label key={ev.id} className="flex items-center gap-2 cursor-pointer py-1">
                      <input
                        type="checkbox"
                        checked={draft.poolEventIds.includes(ev.id)}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            poolEventIds: e.target.checked
                              ? [...draft.poolEventIds, ev.id]
                              : draft.poolEventIds.filter((id) => id !== ev.id),
                          })
                        }
                      />
                      <span className="text-sm text-plum/80">{ev.name}</span>
                    </label>
                  ))
                )}
                <div className="text-xs text-plum/60 mt-1">
                  Guests at the selected venues become eligible and will see this
                  prize in their own app.
                </div>
              </div>
            )}
          </div>
          <button
            className="btn-primary w-full"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </Modal>
    </AdminShell>
  );
}
