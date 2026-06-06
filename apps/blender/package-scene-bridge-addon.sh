#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ADDON_DIR="${SCRIPT_DIR}/merkin_scene_bridge"
OUTPUT_PATH="${SCRIPT_DIR}/merkin_scene_bridge.zip"

if [[ "${1:-}" == "--check" ]]; then
  test -f "${ADDON_DIR}/__init__.py"
  command -v zip >/dev/null
  echo "Merkin scene bridge packaging inputs are available."
  exit 0
fi

rm -f "${OUTPUT_PATH}"
(
  cd "${SCRIPT_DIR}"
  zip -qr "${OUTPUT_PATH}" merkin_scene_bridge -x '*/__pycache__/*' '*.pyc'
)

echo "${OUTPUT_PATH}"
