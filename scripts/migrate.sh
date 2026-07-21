#!/usr/bin/env bash
set -Eeuo pipefail

APP_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$APP_ROOT"

if [[ -f .env ]]; then
  set -a
  source .env
  set +a
fi
: "${DATABASE_URL:?DATABASE_URL is required}"
command -v psql >/dev/null 2>&1 || {
  echo 'psql is required to apply migrations.' >&2
  exit 1
}

found=0
for migration in backend/migrations/*.sql; do
  [[ -f "$migration" ]] || continue
  found=1
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$migration"
done
if [[ "$found" -ne 1 ]]; then
  echo 'No backend migrations found.' >&2
  exit 1
fi

