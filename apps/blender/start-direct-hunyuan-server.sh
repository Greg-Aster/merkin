#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SERVER="${ROOT_DIR}/apps/blender/hunyuan3d-direct/server.py"
PYTHON="${HUNYUAN3D_PYTHON:-/home/greggles/ComfyUI/venv/bin/python}"
UNIT="${HUNYUAN3D_UNIT:-merkin-hunyuan3d-direct}"
HOST="${HUNYUAN3D_HOST:-127.0.0.1}"
PORT="${HUNYUAN3D_PORT:-8080}"
ENABLE_TEXTURE="${HUNYUAN3D_ENABLE_TEXTURE:-1}"

args=(
  "${SERVER}"
  --host "${HOST}"
  --port "${PORT}"
)

if [[ "${ENABLE_TEXTURE}" == "1" || "${ENABLE_TEXTURE}" == "true" ]]; then
  args+=(--enable-texture)
fi

case "${1:-start}" in
  start)
    systemd-run --user \
      --unit="${UNIT}" \
      --collect \
      --same-dir \
      "${PYTHON}" "${args[@]}"
    ;;
  foreground)
    exec "${PYTHON}" "${args[@]}"
    ;;
  stop)
    systemctl --user stop "${UNIT}.service" || true
    ;;
  restart)
    systemctl --user stop "${UNIT}.service" || true
    systemd-run --user \
      --unit="${UNIT}" \
      --collect \
      --same-dir \
      "${PYTHON}" "${args[@]}"
    ;;
  status)
    systemctl --user status "${UNIT}.service" --no-pager || true
    ;;
  logs)
    journalctl --user -u "${UNIT}.service" -f
    ;;
  health)
    curl -fsS "http://${HOST}:${PORT}/health"
    printf "\n"
    ;;
  *)
    echo "Usage: $0 {start|foreground|stop|restart|status|logs|health}" >&2
    exit 2
    ;;
esac
