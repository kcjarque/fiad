import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminShell } from '../../components/admin/AdminShell';
import { createChallenge, deleteChallenge, listChallenges, updateChallenge } from '../../services/challengeService';
import { listStores } from '../../services/storeService';
import { Modal } from '../../components/shared/Modal';
import { toast } from '../../stores/toastStore';
import type { Challenge } from '../../types';

const empty: Omit<Challenge, 'id' | 'eventId'> = {
  type: 'booth',
  name: '',
  description: '',
  rewardType: 'stamp_only',
};

export function AdminChallenges() {
  const qc = useQueryClient();
  const { data: challenges = [], refetch } = useQuery({ queryKey: ['challenges'], queryFn: listChallenges });
  const { data: stores = [] } = useQuery({ queryKey: ['stores'], queryFn: listStores });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Challenge | null>(null);
  const [draft, setDraft] = useState<Omit<Challenge, 'id' | 'eventId'>>(empty);

  const save = async () => {
    if (!draft.name) {
      toast.error('Name required');
      return;
    }
    if (editing) {
      await updateChallenge(editing.id, draft);
      toast.success('Challenge updated');
    } else {
      await createChallenge({ ...draft, eventId: 'evt_fiad_dec25' });
      toast.success('Challenge added');
    }
    qc.invalidateQueries({ queryKey: ['challenges'] });
    setOpen(false);
    setEditing(null);
    setDraft(empty);
  };

  const edit = (c: Challenge) => {
    setEditing(c);
    const { id: _id, eventId: _eid, ...rest } = c;
    setDraft(rest);
    setOpen(true);
  };

  return (
    <AdminShell>
      <div className="flex items-center justify-between mb-4 md:mb-6 gap-3">
        <h1 className="font-display text-2xl md:text-3xl">Challenges</h1>
        <button className="btn-primary !px-4 !py-2 text-sm md:text-base md:!px-5 md:!py-3" onClick={() => { setEditing(null); setDraft({ ...empty }); setOpen(true); }}>+ Add</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {challenges.map((c) => (
          <div key={c.id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <div className="chip">{c.type}</div>
                <div className="font-display text-lg mt-2">{c.name}</div>
                <div className="text-sm text-plum/70 mt-1">{c.description}</div>
                {c.storeId && <div className="text-xs text-plum/50 mt-2">Store: {stores.find((s) => s.id === c.storeId)?.name}</div>}
                <div className="text-xs text-coral mt-1">
                  {c.rewardType === 'raffle_entries' ? `+${c.rewardValue ?? 0} entries` : c.rewardType === 'physical_prize' ? 'Physical prize' : 'Stamp only'}
                </div>
              </div>
              <div className="flex gap-2">
                <button className="btn-ghost text-sm" onClick={() => edit(c)}>Edit</button>
                <button className="btn-ghost text-sm text-red-600" onClick={async () => { if (confirm('Delete?')) { await deleteChallenge(c.id); qc.invalidateQueries({ queryKey: ['challenges'] }); } }}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit challenge' : 'New challenge'}>
        <div className="space-y-3">
          <div>
            <label className="label">Type</label>
            <select className="input" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as Challenge['type'] })}>
              <option value="booth">Booth</option>
              <option value="activity">Activity</option>
              <option value="visit_all">Visit all booths</option>
            </select>
          </div>
          <div>
            <label className="label">Name</label>
            <input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </div>
          {draft.type === 'booth' && (
            <div>
              <label className="label">Store</label>
              <select className="input" value={draft.storeId ?? ''} onChange={(e) => setDraft({ ...draft, storeId: e.target.value || undefined })}>
                <option value="">—</option>
                {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Reward</label>
              <select className="input" value={draft.rewardType} onChange={(e) => setDraft({ ...draft, rewardType: e.target.value as Challenge['rewardType'] })}>
                <option value="stamp_only">Stamp only</option>
                <option value="raffle_entries">Raffle entries</option>
                <option value="physical_prize">Physical prize</option>
              </select>
            </div>
            {draft.rewardType === 'raffle_entries' && (
              <div>
                <label className="label">Entries</label>
                <input type="number" className="input" value={draft.rewardValue ?? 0} onChange={(e) => setDraft({ ...draft, rewardValue: Number(e.target.value) })} />
              </div>
            )}
          </div>
          <button className="btn-primary w-full" onClick={save}>Save</button>
        </div>
      </Modal>
    </AdminShell>
  );
}
