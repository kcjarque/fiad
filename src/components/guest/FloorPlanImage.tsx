import { useState } from 'react';
import { ZoomIn, ZoomOut, ExternalLink, Map as MapIcon } from 'lucide-react';
import { useEventStore } from '../../stores/eventStore';

// Official floor plans (rendered from the architect's PDF) shown per venue.
// Guests match a supplier's booth code (from Booth Info) to the plan. Add a
// venue here once its plan exists; until then it shows "coming soon".
const PLANS: Record<string, { src: string; label: string }> = {
  evt_fiad_s2_brittany: { src: '/img/floorplan/brittany.png', label: 'Brittany Hotel, BGC · Hall 2 (Bamboo)' },
  evt_fiad_s2_mella: { src: '/img/floorplan/mella.png', label: 'Mella Hotel, Las Piñas · Ground Floor Lobby' },
};

export function FloorPlanImage() {
  const eventId = useEventStore((s) => s.selectedEventId);
  const plan = PLANS[eventId];
  const [zoomed, setZoomed] = useState(false);

  // No plan for this venue yet. This used to fall back to Brittany's, which
  // would have handed a Season 3 guest a map of a building they aren't in —
  // worse than no map, because they would try to follow it.
  if (!plan) {
    return (
      <div className="rounded-2xl border border-champagne/30 bg-white text-center py-10 px-5">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-champagne/20 text-champagne mb-3">
          <MapIcon size={20} aria-hidden="true" />
        </div>
        <div className="font-serif text-lg text-plum">Floor plan coming soon</div>
        <p className="text-sm text-plum/60 mt-1 max-w-xs mx-auto">
          The booth layout for this venue will appear here once it's final.
        </p>
      </div>
    );
  }

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
          alt={`Floor plan — ${plan.label}`}
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
