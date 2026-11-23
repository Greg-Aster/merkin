#!/usr/bin/env bash
set -euo pipefail

# RunPod AI Toolkit setup for Qwen Image LoRA training.
# Upload this file to JupyterLab, then run:
#   chmod +x setup-runpod-ai-toolkit.sh
#   ./setup-runpod-ai-toolkit.sh
#
# Optional:
#   INSTALL_DIR=/workspace/ai-toolkit ./setup-runpod-ai-toolkit.sh
#   FORCE_TORCH_291=1 ./setup-runpod-ai-toolkit.sh

INSTALL_DIR="${INSTALL_DIR:-/workspace/ai-toolkit}"
export DEBIAN_FRONTEND=noninteractive

echo "Installing AI Toolkit into: ${INSTALL_DIR}"

if command -v apt-get >/dev/null 2>&1; then
  apt-get update
  apt-get install -y git git-lfs python3-venv python3-pip curl ca-certificates gnupg tmux
  git lfs install --skip-repo || true

  NODE_MAJOR="$(node -p "parseInt(process.versions.node.split('.')[0])" 2>/dev/null || echo 0)"
  if [ "${NODE_MAJOR}" -lt 20 ]; then
    curl -fsSL https://deb.nodesource.com/setup_22.x -o /tmp/nodesource_setup.sh
    bash /tmp/nodesource_setup.sh
    apt-get install -y nodejs
  fi
fi

if [ -d "${INSTALL_DIR}/.git" ]; then
  git -C "${INSTALL_DIR}" pull --ff-only
else
  git clone https://github.com/ostris/ai-toolkit.git "${INSTALL_DIR}"
fi

cd "${INSTALL_DIR}"

python3 -m venv --system-site-packages venv
source venv/bin/activate
python -m pip install -U pip wheel

if [ "${FORCE_TORCH_291:-0}" = "1" ]; then
  python -m pip install --no-cache-dir \
    torch==2.9.1 torchvision==0.24.1 torchaudio==2.9.1 \
    --index-url https://download.pytorch.org/whl/cu128
fi

python - <<'PY' || python -m pip install --no-cache-dir torch==2.9.1 torchvision==0.24.1 torchaudio==2.9.1 --index-url https://download.pytorch.org/whl/cu128
import torch
assert torch.cuda.is_available()
print("Using torch:", torch.__version__, "CUDA:", torch.version.cuda)
print("GPU:", torch.cuda.get_device_name(0))
PY

python -m pip install -r requirements.txt

mkdir -p /workspace/hf-cache datasets output config/runpod

cat > runpod_env.sh <<'EOF'
export HF_HOME=/workspace/hf-cache
export HF_HUB_CACHE=/workspace/hf-cache/hub
export HF_HUB_ENABLE_HF_TRANSFER=0
export HF_HUB_DISABLE_XET=1
export PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True
EOF

if [ -n "${HF_TOKEN:-}" ]; then
  huggingface-cli login --token "${HF_TOKEN}" --add-to-git-credential || true
fi

cat > start-ui.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
source venv/bin/activate
source runpod_env.sh
TOKEN="${AI_TOOLKIT_AUTH:-$(python - <<'PY'
import secrets
print(secrets.token_hex(16))
PY
)}"
echo "AI Toolkit UI auth token: ${TOKEN}"
cd ui
AI_TOOLKIT_AUTH="${TOKEN}" npm run build_and_start
EOF

cat > run-train.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
source venv/bin/activate
source runpod_env.sh
CONFIG="${1:?Usage: ./run-train.sh config/path/to-job.yaml}"
python run.py "${CONFIG}"
EOF

chmod +x start-ui.sh run-train.sh

python - <<'PY'
import torch
props = torch.cuda.get_device_properties(0)
print("torch:", torch.__version__)
print("cuda:", torch.version.cuda)
print("available:", torch.cuda.is_available())
print("device:", torch.cuda.get_device_name(0))
print("vram_gb:", round(props.total_memory / 1024**3, 1))
PY

cat <<EOF

Setup complete.

Start the UI:
  cd ${INSTALL_DIR}
  ./start-ui.sh

Run a training config directly:
  cd ${INSTALL_DIR}
  ./run-train.sh config/your_config.yaml

If torch/torchao fails on this image, rerun this setup with:
  FORCE_TORCH_291=1 ./setup-runpod-ai-toolkit.sh
EOF
