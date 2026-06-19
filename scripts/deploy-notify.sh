#!/usr/bin/env bash
# Deploy the FIAD `notify` edge function and set its ConexMail + OneWaySMS
# secrets. Values are read from fiad/.env.local (gitignored) so nothing
# sensitive lands in git or shell history.
#
# Add these to fiad/.env.local first (only VITE_* keys reach the browser
# bundle — these stay server-side):
#
#   SUPABASE_ACCESS_TOKEN=sbp_...                 # fiad project token
#   CONEXMAIL_BASE_URL=https://api.conexmedia.ph  # custom domain (no Vercel SSO)
#   CONEXMAIL_API_KEY=cm_live_...                 # Conex Media workspace key
#   ONEWAYSMS_USERNAME=...                         # OneWaySMS account
#   ONEWAYSMS_PASSWORD=...
#   ONEWAYSMS_SENDER=CONEX                         # your registered sender id
#   FIAD_ADMIN_EMAIL=you@example.com              # inquiry alerts land here
#   FIAD_ADMIN_MOBILE=09xxxxxxxxx                 # optional; omit to skip admin SMS
#
# Then: ./scripts/deploy-notify.sh
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env.local ] || { echo "✗ fiad/.env.local not found"; exit 1; }
set -a; . ./.env.local; set +a

REF=cjhnsyldnzdedgianzsj
: "${SUPABASE_ACCESS_TOKEN:?set SUPABASE_ACCESS_TOKEN in .env.local}"
: "${CONEXMAIL_API_KEY:?set CONEXMAIL_API_KEY in .env.local}"

echo "▸ Deploying notify function to $REF…"
supabase functions deploy notify --project-ref "$REF" --no-verify-jwt

echo "▸ Setting secrets…"
args=(
  "CONEXMAIL_BASE_URL=${CONEXMAIL_BASE_URL:-https://api.conexmedia.ph}"
  "CONEXMAIL_API_KEY=${CONEXMAIL_API_KEY}"
  "ONEWAYSMS_USERNAME=${ONEWAYSMS_USERNAME:-}"
  "ONEWAYSMS_PASSWORD=${ONEWAYSMS_PASSWORD:-}"
  "ONEWAYSMS_SENDER=${ONEWAYSMS_SENDER:-CONEX}"
  "FIAD_ADMIN_EMAIL=${FIAD_ADMIN_EMAIL:-admin@fiad.app}"
)
[ -n "${FIAD_ADMIN_MOBILE:-}" ] && args+=("FIAD_ADMIN_MOBILE=${FIAD_ADMIN_MOBILE}")
supabase secrets set --project-ref "$REF" "${args[@]}"

echo "✓ Done. Test:"
echo "  curl -i -X POST https://$REF.supabase.co/functions/v1/notify \\"
echo "    -H 'Authorization: Bearer <ANON_KEY>' -H 'Content-Type: application/json' \\"
echo "    -d '{\"type\":\"inquiry_lead\",\"inquiry\":{\"name\":\"Test\",\"phone\":\"09171234567\",\"email\":\"you@example.com\"}}'"
