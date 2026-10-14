#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
pg_ctl -D "$ROOT/.local/postgres" -m fast stop
