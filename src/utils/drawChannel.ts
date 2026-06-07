/**
 * Cross-window pub/sub for the admin draw flow → stage projector view.
 *
 * BroadcastChannel works inside one browser instance (same origin), which
 * is exactly the constraint we want: the laptop driving both monitors at
 * the venue. Stage subscribes, AdminDraw publishes.
 *
 * Messages are typed so both sides agree on the shape.
 */

export type Prize = {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  /** Pre-formatted "Store Name · Booth X" string for the claim notice. */
  claimLocation?: string;
};

export type StageMsg =
  | {
      type: 'set_prize';
      prize: Prize | null;
      undrawnCount: number;
      drawnList: { name: string; winner: string }[];
    }
  | {
      type: 'spin_start';
      prize: Prize;
      reel: string[];
      landingIndex: number;
      durationMs: number;
    }
  | {
      type: 'reveal';
      winner: { name: string; ticketNumber: string };
      prize: Prize;
    }
  | { type: 'reset' }
  | { type: 'ping' /* stage announces it is alive */ }
  | { type: 'pong' /* admin acks ping */ };

const CHANNEL_NAME = 'fiad-draw-stage';

export function openChannel(): BroadcastChannel {
  return new BroadcastChannel(CHANNEL_NAME);
}

export function postMessage(ch: BroadcastChannel, msg: StageMsg): void {
  ch.postMessage(msg);
}
