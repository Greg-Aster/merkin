#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

rm -f hunyuan3d_direct_blender_addon.zip
zip -qr hunyuan3d_direct_blender_addon.zip hunyuan3d_direct_blender_addon
echo "${SCRIPT_DIR}/hunyuan3d_direct_blender_addon.zip"
