import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// ═══════════════════════════════════════════════════════════════════════════
// ⚠️  STAGING ONLY — DO NOT POINT THIS AT PRODUCTION
//
//     Before every run, verify STAGING_URL does NOT contain your production
//     project ID. Your production project ID is in your .env or Supabase
//     dashboard — keep them visually distinct.
// ═══════════════════════════════════════════════════════════════════════════
const STAGING_URL = 'https://REPLACE_WITH_STAGING_PROJECT_ID.supabase.co';
const ANON_KEY    = 'REPLACE_WITH_STAGING_ANON_KEY';
const MAX_VUS     = 250; // total across all scenarios

// ── Staging seed data ───────────────────────────────────────────────────────
// Run the helper query at the bottom of this file on your staging DB to get
// real IDs to paste here. These must exist before the test runs.

// Normal load: requests spread across these pairs to avoid all hitting the same lock
const GUEST_IDS = [
  'REPLACE_guest_id_1',
  'REPLACE_guest_id_2',
  'REPLACE_guest_id_3',
  'REPLACE_guest_id_4',
  'REPLACE_guest_id_5',
];

const STORE_IDS = [
  'REPLACE_store_id_1',
  'REPLACE_store_id_2',
  'REPLACE_store_id_3',
];

const CHALLENGE_IDS = [
  'REPLACE_challenge_id_1',
  'REPLACE_challenge_id_2',
];

// ── C3 contention constants ─────────────────────────────────────────────────
// 50 VUs × ₱200 = ₱10,000 total attempted spend.
// Daily cap is ₱5,000 → exactly 25 should approve, rest become pending_override.
// Use a dedicated guest that has ZERO transactions today. Re-run against a fresh
// guest (or delete their transactions) between test runs or results are undefined.
const CONTENTION_GUEST  = 'REPLACE_contention_guest_id'; // dedicated cap-test guest
const CONTENTION_STORE  = 'REPLACE_contention_store_id'; // any valid store
const CONTENTION_AMOUNT = 200; // ₱200 per VU

// ── C4 override contention ──────────────────────────────────────────────────
// setup() creates one pending_override using this guest, then all 50 override
// VUs hammer approve_override on the same row. Only one should claim it.
// Must be a guest with no prior spend today (so the cap isn't already hit).
const OVERRIDE_GUEST = 'REPLACE_override_test_guest_id';
const OVERRIDE_STORE = CONTENTION_STORE; // reuse any valid store

const RECEIPT_PLACEHOLDER = 'https://placehold.co/400x300/jpg';

// ═══════════════════════════════════════════════════════════════════════════
// Custom metrics
// ═══════════════════════════════════════════════════════════════════════════
const rpcErrors      = new Counter('rpc_errors');
const approvalClaims = new Counter('approval_claims');   // must stay at 1 for the test override
const issueTrend     = new Trend('issue_entries_ms',     true);
const challengeTrend = new Trend('complete_challenge_ms', true);
const overrideTrend  = new Trend('approve_override_ms',  true);

// ═══════════════════════════════════════════════════════════════════════════
// Scenarios + thresholds
// ═══════════════════════════════════════════════════════════════════════════
export const options = {
  scenarios: {
    // 150 VUs: normal spread across guest/store pairs
    normal_transactions: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m',  target: 150 },
        { duration: '3m',  target: 150 },
        { duration: '30s', target: 0   },
      ],
      gracefulRampDown: '30s',
      exec: 'normalTransactions',
    },

    // 50 VUs × 10 iterations, no sleep, no ramp.
    // All 50 VUs are pre-allocated and fire immediately — 500 requests
    // at CONTENTION_GUEST + CONTENTION_STORE as fast as Postgres can handle
    // them. This creates real millisecond-level overlap on the advisory lock.
    // A ramping executor with sleep would queue requests seconds apart and
    // prove nothing about simultaneity.
    cap_contention: {
      executor:    'per-vu-iterations',
      vus:         50,
      iterations:  10,   // each VU fires 10 back-to-back calls, no sleep
      maxDuration: '30s',
      gracefulStop: '5s',
      exec: 'contentionTest',
    },

    // 50 VUs × 1 iteration, no sleep, no ramp.
    // All 50 VUs call approve_override on the SAME row simultaneously.
    // Only one should claim it (already_resolved=false); the rest must see
    // already_resolved=true. With a ramp + sleep the second admin would
    // arrive after the first had already committed — the race never forms.
    override_contention: {
      executor:    'per-vu-iterations',
      vus:         50,
      iterations:  1,    // one shot each — the race is in the simultaneous arrival
      maxDuration: '30s',
      gracefulStop: '5s',
      exec: 'overrideApproval',
    },
  },

  thresholds: {
    // Global HTTP
    'http_req_failed':                     ['rate<0.01'],   // <1% error rate overall
    'http_req_duration':                   ['p(95)<2000'],  // p95 < 2s overall

    // Per-RPC latency
    'issue_entries_ms':                    ['p(95)<2000'],
    'complete_challenge_ms':               ['p(95)<2000'],
    'approve_override_ms':                 ['p(95)<2000'],

    // Correctness — these failing means data is corrupt, not just slow
    'rpc_errors':       ['count<1'],  // zero 4xx/5xx from the RPCs we control
    'approval_claims':  ['count<2'],  // exactly ONE VU should ever claim a fresh approval
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════
function headers() {
  return {
    'apikey':        ANON_KEY,
    'Authorization': `Bearer ${ANON_KEY}`,
    'Content-Type':  'application/json',
  };
}

function rpc(fn, payload) {
  return http.post(
    `${STAGING_URL}/rest/v1/rpc/${fn}`,
    JSON.stringify(payload),
    { headers: headers(), tags: { rpc: fn } },
  );
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ═══════════════════════════════════════════════════════════════════════════
// setup() — runs once before VUs start
// Creates one pending_override that the override_contention scenario will hammer.
// ═══════════════════════════════════════════════════════════════════════════
export function setup() {
  console.log('setup: creating pending_override for C4 contention test...');

  const res = rpc('issue_entries', {
    p_idempotency_key: uuidv4(),
    p_store_id:        OVERRIDE_STORE,
    p_guest_id:        OVERRIDE_GUEST,
    p_amount:          9_999_999, // astronomically over any cap → always pending_override
    p_receipt_url:     RECEIPT_PLACEHOLDER,
    p_override_note:   'k6 C4 contention test — override approval',
  });

  if (res.status !== 200) {
    throw new Error(`setup failed (${res.status}): ${res.body}`);
  }

  const body = JSON.parse(res.body);

  // On a re-run, the idempotency key is new so this will always create a fresh
  // override. If you need to reuse an existing pending one, query for it below.
  if (body.kind !== 'override') {
    throw new Error(`Expected override from setup, got: ${JSON.stringify(body)}`);
  }

  console.log(`setup: override created → ${body.override_id}`);
  return { overrideId: body.override_id };
}

// ═══════════════════════════════════════════════════════════════════════════
// Scenario 1 — Normal load, spread across guest/store pairs
// ═══════════════════════════════════════════════════════════════════════════
export function normalTransactions() {
  const guestId = pick(GUEST_IDS);
  const storeId = pick(STORE_IDS);
  const amount  = (Math.floor(Math.random() * 10) + 1) * 100; // ₱100–₱1,000

  group('issue_entries', () => {
    const t0  = Date.now();
    const res = rpc('issue_entries', {
      p_idempotency_key: uuidv4(),
      p_store_id:        storeId,
      p_guest_id:        guestId,
      p_amount:          amount,
      p_receipt_url:     RECEIPT_PLACEHOLDER,
    });
    issueTrend.add(Date.now() - t0);

    const passed = check(res, {
      'issue_entries 200':       (r) => r.status === 200,
      'issue_entries has kind':  (r) => {
        try { return ['approved','override','duplicate'].includes(JSON.parse(r.body).kind); }
        catch { return false; }
      },
    });
    if (!passed) rpcErrors.add(1);
  });

  group('complete_challenge', () => {
    const t0  = Date.now();
    const res = rpc('complete_challenge', {
      p_guest_id:     guestId,
      p_challenge_id: pick(CHALLENGE_IDS),
    });
    challengeTrend.add(Date.now() - t0);

    const passed = check(res, {
      'complete_challenge 200':      (r) => r.status === 200,
      'complete_challenge bool new': (r) => {
        try { return typeof JSON.parse(r.body).new === 'boolean'; }
        catch { return false; }
      },
    });
    if (!passed) rpcErrors.add(1);
  });

  sleep(1);
}

// ═══════════════════════════════════════════════════════════════════════════
// Scenario 2 — C3 cap contention
// 50 VUs, each with a UNIQUE idempotency key (real concurrent new submissions),
// all targeting the same CONTENTION_GUEST + CONTENTION_STORE.
// Expected: floor(5000 / 200) = 25 approved, remainder pending_override.
// Any 500 or data corruption = C3 failure.
// ═══════════════════════════════════════════════════════════════════════════
export function contentionTest() {
  const t0  = Date.now();
  const res = rpc('issue_entries', {
    p_idempotency_key: uuidv4(), // unique per call — each is a real new submission
    p_store_id:        CONTENTION_STORE,
    p_guest_id:        CONTENTION_GUEST,
    p_amount:          CONTENTION_AMOUNT,
    p_receipt_url:     RECEIPT_PLACEHOLDER,
    p_override_note:   'k6 C3 cap contention test',
  });
  issueTrend.add(Date.now() - t0);

  const passed = check(res, {
    'contention 200':           (r) => r.status === 200,
    'contention no 5xx':        (r) => r.status < 500,
    'contention valid kind':    (r) => {
      if (r.status !== 200) return false;
      try {
        return ['approved','override','duplicate'].includes(JSON.parse(r.body).kind);
      } catch { return false; }
    },
  });
  if (!passed || res.status >= 500) rpcErrors.add(1);
  // No sleep — back-to-back iterations are the whole point.
}

// ═══════════════════════════════════════════════════════════════════════════
// Scenario 3 — C4 override approval contention
// 50 VUs all call approve_override on the SAME override row created in setup().
// Expected: exactly one VU gets already_resolved=false (the real approval);
// all subsequent calls get already_resolved=true (idempotent early return).
// If approval_claims > 1, the FOR UPDATE / conditional UPDATE gate failed.
// ═══════════════════════════════════════════════════════════════════════════
export function overrideApproval(data) {
  if (!data?.overrideId) {
    console.error('overrideApproval: no overrideId in setup data');
    return;
  }

  const t0  = Date.now();
  const res = rpc('approve_override', {
    p_override_id: data.overrideId,
    p_admin_id:    `k6_admin_vu_${__VU}`,
  });
  overrideTrend.add(Date.now() - t0);

  const passed = check(res, {
    'approve_override 200':      (r) => r.status === 200,
    'approve_override resolved': (r) => {
      try {
        const b = JSON.parse(r.body);
        return b.status === 'approved' || b.already_resolved === true;
      } catch { return false; }
    },
  });

  if (!passed) {
    rpcErrors.add(1);
  } else {
    try {
      const b = JSON.parse(res.body);
      if (b.already_resolved === false) {
        // This VU claimed the approval. Should happen exactly once across all VUs.
        // If approval_claims ends up > 1, entries were written twice — C4 breached.
        approvalClaims.add(1);
      }
    } catch { /* non-JSON body already caught above */ }
  }
  // No sleep — 50 VUs each fire exactly once, arrival timing is the test.
}
