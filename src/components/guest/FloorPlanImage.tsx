import { useState } from 'react';
import { ZoomIn, ZoomOut, ExternalLink } from 'lucide-react';
import { useEventStore } from '../../stores/eventStore';

// The official Season 2 floor plans (rendered from the architect's PDF) shown
// per venue. Guests match a supplier's booth code (from Booth Info) to the plan.
const PLANS: Record<string, { src: string; label: string }> = {
  evt_fiad_s2_brittany: { src: '/img/floorplan/brittany.png', label: 'Brittany Hotel, BGC · Hall 2 (Bamboo)' },
  evt_fiad_s2_mella: { src: '/img/floorplan/mella.png', label: 'Mella Hotel, Las Piñas · Ground Floor Lobby' },
};

export function FloorPlanImage() {
  const eventId = useEventStore((s) => s.selectedEventId);
  const plan = PLANS[eventId] ?? PLANS.evt_fiad_s2_brittany;
  const [zoomed, setZoomed] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="text-xs text-plum/60 leading-tight">{plan.label}</div>
        <button
          onClick={() => setZoomed((z) => !z)}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-plum/15 px-3 py-1.5 text-xs font-medium text-plum/70 hover:text-plum hover:border-plum/30 transition"
        >
          {zoomed ? <><ZoomOut size={13} /> Fit width</> : <><ZoomIn size={13} /> Zoom in</>}
        </button>
      </div>

      <div
        className={`rounded-2xl border border-champagne/30 bg-white ${zoomed ? 'overflow-auto' : 'overflow-hidden'}`}
        style={zoomed ? { maxHeight: '72vh' } : undefined}
      >
        <img
          src={plan.src}
          alt={`Season 2 floor plan — ${plan.label}`}
          className="block select-none"
          style={{ width: zoomed ? '240%' : '100%', maxWidth: 'none' }}
          draggable={false}
        />
      </div>

      <div className="flex items-center justify-between gap-3 mt-2">
        <div className="text-[11px] text-plum/50">
          Official floor plan · find booth codes in <span className="font-medium text-plum/70">Booth Info</span>.
        </div>
        <a
          href={plan.src}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center gap-1 text-[11px] text-coral"
        >
          <ExternalLink size={12} /> Full size
        </a>
      </div>
    </div>
  );
}
