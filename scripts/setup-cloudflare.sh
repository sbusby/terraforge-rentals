#!/usr/bin/env bash
# One-time Cloudflare setup. Safe to re-run: each step skips itself if done.
#
#   npm run setup:cloudflare db        # after `npx wrangler login`
#   npm run setup:cloudflare secrets   # after connecting the Pages project to GitHub
#
# Secrets are read from .dev.vars (gitignored). ADMIN_TOKEN is generated there
# if missing; paste your Stripe keys into it before running `secrets`.
set -euo pipefail
cd "$(dirname "$0")/.."

DB_NAME="terraforge-reservations"
PROJECT="terraforge-rentals"
export CI=1  # no interactive prompts from wrangler

need_login() {
  if ! npx wrangler whoami 2>/dev/null | grep -q "associated with the email"; then
    echo "Not signed in to Cloudflare. Run:  npx wrangler login" >&2
    exit 1
  fi
}

ensure_dev_vars() {
  [ -f .dev.vars ] || cp .dev.vars.example .dev.vars
  if grep -q '^ADMIN_TOKEN=make-this' .dev.vars || ! grep -q '^ADMIN_TOKEN=' .dev.vars; then
    local tok; tok="$(openssl rand -hex 24)"
    grep -v '^ADMIN_TOKEN=' .dev.vars > .dev.vars.tmp || true
    echo "ADMIN_TOKEN=$tok" >> .dev.vars.tmp
    mv .dev.vars.tmp .dev.vars
    echo "Generated ADMIN_TOKEN in .dev.vars"
  fi
}

var() { grep "^$1=" .dev.vars | head -1 | cut -d= -f2-; }

step_db() {
  need_login
  local id
  id="$(npx wrangler d1 list --json 2>/dev/null | node -e '
    let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
      const db=(JSON.parse(s||"[]")).find(d=>d.name===process.argv[1]);
      process.stdout.write(db?db.uuid:"");})' "$DB_NAME")"
  if [ -z "$id" ]; then
    echo "Creating D1 database $DB_NAME..."
    npx wrangler d1 create "$DB_NAME" >/dev/null
    id="$(npx wrangler d1 list --json | node -e '
      let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
        process.stdout.write(JSON.parse(s).find(d=>d.name===process.argv[1]).uuid);})' "$DB_NAME")"
  else
    echo "D1 database $DB_NAME already exists."
  fi
  sed -i.bak -E "s/^database_id = \".*\"/database_id = \"$id\"/" wrangler.toml && rm -f wrangler.toml.bak
  echo "wrangler.toml database_id = $id"
  npx wrangler d1 migrations apply "$DB_NAME" --remote
  echo
  echo "Done. Commit and push wrangler.toml so Cloudflare builds use this database:"
  echo "  git commit -am 'Set D1 database id' && git push"
}

step_secrets() {
  need_login
  ensure_dev_vars
  for k in STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET ADMIN_TOKEN; do
    v="$(var "$k")"
    case "$v" in
      ""|*...|make-this*) echo "Set $k in .dev.vars first." >&2; exit 1 ;;
    esac
  done
  case "$(var STRIPE_SECRET_KEY)" in
    sk_test_*) echo "Using Stripe TEST key (switch to sk_live_ at cutover).";;
    sk_live_*) echo "Using Stripe LIVE key.";;
    *) echo "STRIPE_SECRET_KEY should start with sk_test_ or sk_live_." >&2; exit 1;;
  esac
  # Wrangler sets Production-environment secrets. Until cutover the Pages
  # production branch is cloudflare-migration, so that is where testing happens.
  for k in STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET ADMIN_TOKEN; do
    printf '%s' "$(var "$k")" | npx wrangler pages secret put "$k" --project-name "$PROJECT" >/dev/null
    echo "  $k set"
  done
  echo "Secrets set. Redeploy (push a commit, or Retry deployment in the dashboard) to pick them up."
}

case "${1:-}" in
  db) step_db ;;
  secrets) step_secrets ;;
  token) ensure_dev_vars ;;
  *) echo "usage: $0 db|secrets|token" >&2; exit 2 ;;
esac
