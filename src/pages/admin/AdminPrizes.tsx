import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminShell } from '../../components/admin/AdminShell';
import { createPrize, deletePrize, listPrizes, updatePrize } from '../../services/prizeService';
import { listGuests } from '../../services/guestService';
import { Modal } from '../../components/shared/Modal';
import { toast } from '../../stores/toastStore';
import type { Prize } from '../../types';
import { useEventStore } from '../../stores/eventStore';

const empty = { name: '', description: '', imageUrl: '', quantity: 1 };

export function AdminPrizes() {
  const qc = useQueryClient();
  const selectedEventId = useEventStore((s) => s.selectedEventId);
  const { data: prizes = [] } = useQuery({ queryKey: ['prizes', selectedEventId], queryFn: listPrizes });
  const { data: guests = [] } = useQuery({ queryKey: ['guests', selectedEventId], queryFn: listGuests });
  const guestsById = useMemo(() => new Map(guests.map((g) => [g.id, g])), [guests]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Prize | null>(null);
  const [draft, setDraft] = useState(empty);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['prizes'] });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!draft.name) throw new Error('Name required');
      if (editing) {
        await updatePrize(editing.id, draft);
        toast.success('Prize updated');
      } else {
        await createPrize({
          ...draft,
          imageUrl: draft.imageUrl || `https://picsum.photos/seed/${encodeURIComponent(draft.name)}/400/400`,
        });
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
    setDraft({ name: p.name, description: p.description, imageUrl: p.imageUrl, quantity: p.quantity });
    setOpen(true);
  };

  return (
    <AdminShell>
      <div className="flex items-center justify-between mb-4 md:mb-6 gap-3">
        <h1 className="font-display text-2xl md:text-3xl">Prizes</h1>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Quantity</label>
              <input
                type="number"
                className="input"
                value={draft.quantity}
                onChange={(e) => setDraft({ ...draft, quantity: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="label">Image URL</label>
              <input className="input" value={draft.imageUrl} onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value })} />
            </div>
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
