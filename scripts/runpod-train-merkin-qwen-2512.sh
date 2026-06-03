#!/usr/bin/env bash
set -euo pipefail

# Run this on the RunPod pod after AI Toolkit is installed and the dataset is
# extracted to /workspace/merkin.
#
# Default target:
#   Qwen/Qwen-Image-2512 LoRA, 1024 buckets, uint4 ARA, 48 GB GPU.
#
# Usage:
#   chmod +x runpod-train-merkin-qwen-2512.sh
#   ./runpod-train-merkin-qwen-2512.sh
#
# Useful overrides:
#   STEPS=2000 ./runpod-train-merkin-qwen-2512.sh
#   RESOLUTIONS="1024" ./runpod-train-merkin-qwen-2512.sh
#   RESOLUTIONS="512,768,1024" ./runpod-train-merkin-qwen-2512.sh
#   BATCH_SIZE=2 GRADIENT_CHECKPOINTING=false ./runpod-train-merkin-qwen-2512.sh
#   LOW_VRAM=1 ./runpod-train-merkin-qwen-2512.sh
#   QTYPE="uint3|ostris/accuracy_recovery_adapters/qwen_image_2512_torchao_uint3.safetensors" ./runpod-train-merkin-qwen-2512.sh

TOOLKIT_DIR="${TOOLKIT_DIR:-/workspace/ai-toolkit}"
DATASET_DIR="${DATASET_DIR:-/workspace/merkin}"
RUN_NAME="${RUN_NAME:-merkin_qwen_image_2512_1024_uint4_v1}"
STEPS="${STEPS:-2500}"
SAVE_EVERY="${SAVE_EVERY:-250}"
BATCH_SIZE="${BATCH_SIZE:-1}"
RANK="${RANK:-16}"
LR="${LR:-1e-4}"
RESOLUTIONS="${RESOLUTIONS:-768,1024}"
QTYPE="${QTYPE:-uint4|ostris/accuracy_recovery_adapters/qwen_image_2512_torchao_uint4.safetensors}"
LOW_VRAM="${LOW_VRAM:-0}"
LAYER_OFFLOAD="${LAYER_OFFLOAD:-0}"
GRADIENT_CHECKPOINTING="${GRADIENT_CHECKPOINTING:-true}"
PREFETCH="${PREFETCH:-1}"

bool_yaml() {
  case "${1}" in
    1|true|TRUE|yes|YES|on|ON) printf 'true' ;;
    *) printf 'false' ;;
  esac
}

csv_to_yaml_list() {
  local input="${1}"
  local out=""
  IFS=',' read -ra parts <<< "${input}"
  for part in "${parts[@]}"; do
    part="${part//[[:space:]]/}"
    if [ -n "${part}" ]; then
      if [ -n "${out}" ]; then
        out="${out}, "
      fi
      out="${out}${part}"
    fi
  done
  printf '[ %s ]' "${out}"
}

if [ ! -d "${TOOLKIT_DIR}" ]; then
  echo "AI Toolkit not found at ${TOOLKIT_DIR}" >&2
  exit 1
fi

if [ ! -d "${DATASET_DIR}" ]; then
  echo "Dataset not found at ${DATASET_DIR}" >&2
  echo "Expected extracted images and .txt captions in that folder." >&2
  exit 1
fi

IMAGE_COUNT="$(find "${DATASET_DIR}" -maxdepth 1 -type f \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' \) | wc -l)"
CAPTION_COUNT="$(find "${DATASET_DIR}" -maxdepth 1 -type f -iname '*.txt' | wc -l)"

echo "Dataset: ${DATASET_DIR}"
echo "Images: ${IMAGE_COUNT}"
echo "Captions: ${CAPTION_COUNT}"

if [ "${IMAGE_COUNT}" -eq 0 ]; then
  echo "No training images found." >&2
  exit 1
fi

if [ "${IMAGE_COUNT}" -ne "${CAPTION_COUNT}" ]; then
  echo "Image/caption count mismatch. Continuing, but check missing captions if training looks wrong." >&2
fi

cd "${TOOLKIT_DIR}"
source venv/bin/activate

if [ -f runpod_env.sh ]; then
  source runpod_env.sh
else
  export HF_HOME="${HF_HOME:-/workspace/hf-cache}"
  export HF_HUB_CACHE="${HF_HUB_CACHE:-/workspace/hf-cache/hub}"
  export HF_HUB_ENABLE_HF_TRANSFER="${HF_HUB_ENABLE_HF_TRANSFER:-0}"
  export HF_HUB_DISABLE_XET="${HF_HUB_DISABLE_XET:-1}"
  export PYTORCH_CUDA_ALLOC_CONF="${PYTORCH_CUDA_ALLOC_CONF:-expandable_segments:True}"
fi

python - <<'PY'
import torch
print("torch:", torch.__version__)
print("cuda:", torch.version.cuda)
print("available:", torch.cuda.is_available())
print("device:", torch.cuda.get_device_name(0))
print("vram_gb:", round(torch.cuda.get_device_properties(0).total_memory / 1024**3, 1))
PY

mkdir -p config/runpod output
CONFIG_PATH="${TOOLKIT_DIR}/config/runpod/${RUN_NAME}.yaml"
RESOLUTION_YAML="$(csv_to_yaml_list "${RESOLUTIONS}")"
LOW_VRAM_YAML="$(bool_yaml "${LOW_VRAM}")"
LAYER_OFFLOAD_YAML="$(bool_yaml "${LAYER_OFFLOAD}")"
GRADIENT_CHECKPOINTING_YAML="$(bool_yaml "${GRADIENT_CHECKPOINTING}")"

cat > "${CONFIG_PATH}" <<EOF
---
job: extension
config:
  name: "${RUN_NAME}"
  process:
    - type: "sd_trainer"
      training_folder: "output"
      performance_log_every: 100
      device: cuda:0
      network:
        type: "lora"
        linear: ${RANK}
        linear_alpha: ${RANK}
      save:
        dtype: float16
        save_every: ${SAVE_EVERY}
        max_step_saves_to_keep: 10
      datasets:
        - folder_path: "${DATASET_DIR}"
          caption_ext: "txt"
          caption_dropout_rate: 0.0
          shuffle_tokens: false
          cache_latents_to_disk: true
          resolution: ${RESOLUTION_YAML}
      train:
        batch_size: ${BATCH_SIZE}
        cache_text_embeddings: true
        steps: ${STEPS}
        gradient_accumulation: 1
        timestep_type: "weighted"
        train_unet: true
        train_text_encoder: false
        gradient_checkpointing: ${GRADIENT_CHECKPOINTING_YAML}
        noise_scheduler: "flowmatch"
        optimizer: "adamw8bit"
        lr: ${LR}
        skip_first_sample: true
        disable_sampling: true
        dtype: bf16
      model:
        name_or_path: "Qwen/Qwen-Image-2512"
        arch: "qwen_image"
        quantize: true
        qtype: "${QTYPE}"
        quantize_te: true
        qtype_te: "qfloat8"
        low_vram: ${LOW_VRAM_YAML}
        layer_offloading: ${LAYER_OFFLOAD_YAML}
        layer_offloading_transformer_percent: 0.25
        layer_offloading_text_encoder_percent: 1.0
      sample:
        sampler: "flowmatch"
        sample_every: ${SAVE_EVERY}
        width: 1024
        height: 1024
        prompts: []
        neg: ""
        seed: 42
        walk_seed: true
        guidance_scale: 3
        sample_steps: 25
meta:
  name: "[name]"
  version: "1.0"
EOF

echo "Wrote config: ${CONFIG_PATH}"

if [ "${PREFETCH}" = "1" ]; then
  echo "Prefetching Qwen/Qwen-Image-2512 and accuracy recovery adapter..."
  if command -v hf >/dev/null 2>&1; then
    hf download Qwen/Qwen-Image-2512
    hf download ostris/accuracy_recovery_adapters qwen_image_2512_torchao_uint4.safetensors
  else
    huggingface-cli download Qwen/Qwen-Image-2512
    huggingface-cli download ostris/accuracy_recovery_adapters qwen_image_2512_torchao_uint4.safetensors
  fi
fi

echo "Starting training."
echo "Output folder will be: ${TOOLKIT_DIR}/output/${RUN_NAME}"
python run.py "${CONFIG_PATH}"
