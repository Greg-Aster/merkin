#!/usr/bin/env bash
set -euo pipefail

UNIT_NAME="merkin-comfyui-hunyuan"
COMFYUI_ROOT="${COMFYUI_ROOT:-/home/greggles/ComfyUI}"
COMFYUI_PORT="${COMFYUI_PORT:-8188}"
START_SCRIPT="${COMFYUI_ROOT}/startup311.sh"

if [[ ! -x "${START_SCRIPT}" ]]; then
  echo "ComfyUI startup script not found or not executable: ${START_SCRIPT}" >&2
  exit 1
fi

case "${1:-start}" in
  start)
    if systemctl --user is-active --quiet "${UNIT_NAME}.service"; then
      echo "Local Hunyuan ComfyUI is already running: http://127.0.0.1:${COMFYUI_PORT}"
      exit 0
    fi

    systemd-run \
      --user \
      --unit="${UNIT_NAME}" \
      --same-dir \
      --collect \
      --setenv="COMFYUI_PORT=${COMFYUI_PORT}" \
      "${START_SCRIPT}" \
      --log-stdout

    echo "Starting local Hunyuan ComfyUI: http://127.0.0.1:${COMFYUI_PORT}"
    echo "Check status: $0 status"
    echo "Stop server:  $0 stop"
    ;;
  stop)
    systemctl --user stop "${UNIT_NAME}.service" || true
    echo "Stopped local Hunyuan ComfyUI."
    ;;
  restart)
    systemctl --user stop "${UNIT_NAME}.service" || true
    exec "$0" start
    ;;
  status)
    systemctl --user status "${UNIT_NAME}.service" --no-pager || true
    ;;
  logs)
    journalctl --user -u "${UNIT_NAME}.service" -f
    ;;
  *)
    echo "Usage: $0 [start|stop|restart|status|logs]" >&2
    exit 2
    ;;
esac
