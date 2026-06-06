#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$repo_root"

port_args=()
if [[ $# -gt 0 ]]; then
  GAME_DEV_PORT="$1"
  export GAME_DEV_PORT
  port_args=(-- --port "$GAME_DEV_PORT")
  shift
fi

echo "Starting @merkin/game-megameal dev server via pnpm dev:game..."
echo "Legacy manual-refresh mode has been retired; this wrapper now launches the current game app."
if [[ -n "${GAME_DEV_PORT:-}" ]]; then
  echo "Port: ${GAME_DEV_PORT}"
else
  echo "Port: Astro default"
fi

exec pnpm dev:game "${port_args[@]}" "$@"
