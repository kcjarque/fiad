import { useState } from 'react';
import { AdminShell } from '../../components/admin/AdminShell';
import { useDb } from '../../hooks/useDb';
import { createWalkthrough, deleteWalkthrough, listWalkthrough, updateWalkthrough } from '../../services/walkthroughService';
import { Modal } from '../../components/shared/Modal';
import { toast } from '../../stores/toastStore';
import type { WalkthroughItem, WalkthroughType } from '../../types';

const typeOptions: { value: WalkthroughType; label: string }[] = [
  { value: 'booth_info', label: 'Booth info' },
  { value: 'promo', label: 'Promo' },
  { value: 'schedule_item', label: 'Schedule item' },
  { value: 'map', label: 'Map' },
];

const empty: Omit<WalkthroughItem, 'id' | 'eventId'> = {
  type: 'booth_info',
  title: '',
  content: '',
  order: 0,
};

export function AdminWalkthrough() {
  const [filter, setFilter] = useState<WalkthroughType>('booth_info');
  const items = useDb(() => listWalkthrough(filter));
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WalkthroughItem | null>(null);
  const [draft, setDraft] = useState<Omit<WalkthroughItem, 'id' | 'eventId'>>(empty);

  const save = () => {
    if (!draft.title) return toast.error('Title required');
    if (editing) {
      updateWalkthrough(editing.id, draft);
      toast.success('Updated');
    } else {
      createWalkthrough(draft);
      toast.success('Added');
    }
    setOpen(false);
    setEditing(null);
    setDraft({ ...empty, type: filter });
  };

  const edit = (w: WalkthroughItem) => {
    setEditing(w);
    const { id: _id, eventId: _eid, ...rest } = w;
    setDraft(rest);
    setOpen(true);
  };

  return (
    <AdminShell>
      <div className="flex items-center justify-between mb-4 md:mb-6 gap-3">
        <h1 className="font-display text-2xl md:text-3xl">Walkthrough</h1>
        <button className="btn-primary !px-4 !py-2 text-sm md:text-base md:!px-5 md:!py-3" onClick={() => { setEditing(null); setDraft({ ...empty, type: filter }); setOpen(true); }}>+ Add</button>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 pb-1">
        {typeOptions.map((t) => (
          <button
            key={t.value}
            onClick={() => setFilter(t.value)}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap shrink-0 ${filter === t.value ? 'bg-plum text-cream' : 'bg-white border border-plum/10'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {items.map((w) => (
          <div key={w.id} className="card flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <div className="font-display text-lg">{w.title}</div>
              <div className="text-sm text-plum/70 mt-1 break-words">{w.content}</div>
              {w.time && <div className="text-xs chip mt-2">{w.time}</div>}
            </div>
            {w.imageUrl && <img src={w.imageUrl} alt="" className="w-full sm:w-24 h-32 sm:h-24 rounded-xl object-cover" />}
            <div className="flex sm:flex-col gap-2 self-end sm:self-auto">
              <button className="btn-ghost text-sm" onClick={() => edit(w)}>Edit</button>
              <button className="btn-ghost text-sm text-red-600" onClick={() => { if (confirm('Delete?')) deleteWalkthrough(w.id); }}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit item' : 'New item'}>
        <div className="space-y-3">
          <div>
            <label className="label">Type</label>
            <select className="input" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as WalkthroughType })}>
              {typeOptions.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Title</label>
            <input className="input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </div>
          <div>
            <label className="label">Content</label>
            <textarea className="input" rows={4} value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Time (optional)</label>
              <input className="input" value={draft.time ?? ''} onChange={(e) => setDraft({ ...draft, time: e.target.value })} />
            </div>
            <div>
              <label className="label">Order</label>
              <input type="number" className="input" value={draft.order} onChange={(e) => setDraft({ ...draft, order: Number(e.target.value) })} />
            </div>
          </div>
          <div>
            <label className="label">Image URL (optional)</label>
            <input className="input" value={draft.imageUrl ?? ''} onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value })} />
          </div>
          <button className="btn-primary w-full" onClick={save}>Save</button>
        </div>
      </Modal>
    </AdminShell>
  );
}
