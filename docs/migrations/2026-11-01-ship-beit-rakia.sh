#!/usr/bin/env bash
# Run from the book repo. Order matters: column first, code second, content last.
set -euo pipefail
cd "$(dirname "$0")/../.."
supabase db query --linked -f docs/migrations/2026-11-01-service-weekend-price.sql
git checkout main
git pull --ff-only origin main
git merge --ff-only feat/stay-weekend-rate
git push origin main
npx vercel deploy --prod --yes --scope team_8ibtIeAI5bZIZWls7F97nUuD
node scripts/beit-rakia-data-2026-11-01.mjs --apply
curl -s -o /dev/null -w "beit-rakia %{http_code}\n" https://book.bapita.com/beit-rakia
curl -s -o /dev/null -w "beit-chai %{http_code} -> %{redirect_url}\n" https://book.bapita.com/beit-chai
