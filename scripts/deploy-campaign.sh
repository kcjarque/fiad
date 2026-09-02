#!/usr/bin/env bash
# Deploy the FIAD `campaign-dispatch` edge function (Email Marketing broadcast
# sender). It reuses the same ConexMail secrets that `notify` set — edge-function
# secrets are project-wide — so normally you only need to deploy the function.
#
# Requires in fiad/.env.local (gitignored):
#   SUPABASE_ACCESS_TOKEN=sbp_...     # fiad project token
# Optional (only if the ConexMail secrets were never set / need refreshing):
#   CONEXMAIL_BASE_URL=https://api.conexmedia.ph
#   CONEXMAIL_API_KEY=cm_live_...
#
# Then: ./scripts/deploy-campaign.sh
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env.local ] || { echo "✗ fiad/.env.local not found"; exit 1; }
set -a; . ./.env.local; set +a

REF=cjhnsyldnzdedgianzsj
: "${SUPABASE_ACCESS_TOKEN:?set SUPABASE_ACCESS_TOKEN in .env.local}"

echo "▸ Deploying campaign-dispatch function to $REF…"
# JWT verification ON (default): callers (admin browser + pg_cron) pass a valid
# project key, so this is not an open email relay.
supabase functions deploy campaign-dispatch --project-ref "$REF"

# Only (re)set ConexMail secrets if provided — they're usually already set by
# deploy-notify.sh and shared across the project's functions.
if [ -n "${CONEXMAIL_API_KEY:-}" ]; then
  echo "▸ Refreshing ConexMail secrets…"
  supabase secrets set --project-ref "$REF" \
    "CONEXMAIL_BASE_URL=${CONEXMAIL_BASE_URL:-https://api.conexmedia.ph}" \
    "CONEXMAIL_API_KEY=${CONEXMAIL_API_KEY}"
fi

echo "✓ Done."
echo "  Next: apply migration 0058, then run supabase/cron/campaign_dispatch.sql once."
echo "  Test dispatch:"
echo "    curl -i -X POST https://$REF.supabase.co/functions/v1/campaign-dispatch \\"
echo "      -H 'Authorization: Bearer <ANON_KEY>' -H 'Content-Type: application/json' \\"
echo "      -d '{\"mode\":\"dispatch\"}'"
