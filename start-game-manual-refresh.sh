#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$repo_root"

if [[ $# -gt 0 ]]; then
  export GAME_DEV_PORT="$1"
  shift
fi

echo "Starting game dev server in manual-refresh mode..."
echo "HMR is disabled; refresh the browser yourself to reload saved level data."
echo "Port: ${GAME_DEV_PORT:-4322}"

exec pnpm --dir apps/game dev:manual-refresh "$@"
