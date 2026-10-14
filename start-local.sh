#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
APP="$ROOT/dashboard-proyecto/dashboard_proyectos/nextjs_space"
PG_CTL="$(command -v pg_ctl || true)"
if [[ -z "$PG_CTL" && -x /opt/homebrew/bin/pg_ctl ]]; then PG_CTL=/opt/homebrew/bin/pg_ctl; fi
if [[ -z "$PG_CTL" ]]; then echo 'No se encontró pg_ctl de PostgreSQL.'; exit 1; fi
mkdir -p "$ROOT/.local/run"
if ! "$PG_CTL" -D "$ROOT/.local/postgres" status >/dev/null 2>&1; then
  "$PG_CTL" -D "$ROOT/.local/postgres" -l "$ROOT/.local/postgres.log" \
    -o "-h 127.0.0.1 -p 55432 -k $ROOT/.local/run" start
fi
cd "$APP"
exec pnpm dev --hostname 127.0.0.1 --port 3040
