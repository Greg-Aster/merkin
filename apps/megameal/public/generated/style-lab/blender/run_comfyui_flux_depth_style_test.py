from __future__ import annotations

import json
import time
import urllib.parse
import urllib.request
import uuid
from pathlib import Path


SERVER = "http://127.0.0.1:8188"
OUTPUT_DIR = Path(
    "/home/greggles/Merkin/apps/megameal/public/generated/style-lab/blender/comfyui-flux-style-test"
)
PROMPT_JSON = OUTPUT_DIR / "comfyui-flux-depth-style-api-prompt.json"
OUTPUT_IMAGE = OUTPUT_DIR / "yggdrasil-world-tree-flux-depth-aquarelle-paint-test-strong.png"

POSITIVE_PROMPT = (
    "bright painted concept art render of the exact same low-poly world tree mesh, "
    "hand-painted albedo, broad opaque brush blocks, visible brush strokes, "
    "rich magenta canopy with rose, violet, and crimson color variation, "
    "dark twisted blue-black trunk with strong cyan and violet painted rim highlights, "
    "shaped light and shadow, expressive color script, painterly concept art materials, "
    "preserved silhouette, non-photorealistic"
)
NEGATIVE_PROMPT = (
    "photorealistic, toon shader, flat cel shading, plastic, noise overlay, "
    "low quality, blurry, text, watermark, extra objects, different tree silhouette"
)


def request_json(path: str, payload: dict | None = None) -> dict:
    url = f"{SERVER}{path}"
    if payload is None:
        with urllib.request.urlopen(url, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))

    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def build_prompt() -> dict:
    return {
        "1": {
            "class_type": "LoadImage",
            "inputs": {"image": "merkin-yggdrasil-world-tree-source-composition.png"},
        },
        "2": {
            "class_type": "ImageScale",
            "inputs": {
                "image": ["1", 0],
                "upscale_method": "lanczos",
                "width": 1152,
                "height": 672,
                "crop": "disabled",
            },
        },
        "3": {"class_type": "VAELoader", "inputs": {"vae_name": "ae.safetensors"}},
        "4": {"class_type": "VAEEncode", "inputs": {"pixels": ["2", 0], "vae": ["3", 0]}},
        "5": {
            "class_type": "UnetLoaderGGUF",
            "inputs": {"unet_name": "FLUX1/flux1-dev-Q6_K.gguf"},
        },
        "6": {
            "class_type": "LoraLoaderModelOnly",
            "inputs": {
                "model": ["5", 0],
                "lora_name": "flux1_dev_turbo.safetensors",
                "strength_model": 1.0,
            },
        },
        "7": {
            "class_type": "LoraLoaderModelOnly",
            "inputs": {
                "model": ["6", 0],
                "lora_name": "Aquarelle_IV-8.safetensors",
                "strength_model": 1.4,
            },
        },
        "8": {
            "class_type": "DualCLIPLoader",
            "inputs": {
                "clip_name1": "flux/clip_l.safetensors",
                "clip_name2": "t5/google_t5-v1_1-xxl_encoderonly-fp8_e4m3fn.safetensors",
                "type": "flux",
            },
        },
        "9": {"class_type": "CLIPTextEncode", "inputs": {"text": POSITIVE_PROMPT, "clip": ["8", 0]}},
        "10": {
            "class_type": "FluxGuidance",
            "inputs": {"conditioning": ["9", 0], "guidance": 5.0},
        },
        "11": {"class_type": "CLIPTextEncode", "inputs": {"text": NEGATIVE_PROMPT, "clip": ["8", 0]}},
        "12": {
            "class_type": "DepthAnythingV2Preprocessor",
            "inputs": {"image": ["2", 0], "ckpt_name": "depth_anything_v2_vitl.pth", "resolution": 1024},
        },
        "13": {
            "class_type": "ControlNetLoader",
            "inputs": {"control_net_name": "FLUX.1/flux-depth-controlnet-v3.safetensors"},
        },
        "14": {
            "class_type": "ControlNetApplyAdvanced",
            "inputs": {
                "positive": ["10", 0],
                "negative": ["11", 0],
                "control_net": ["13", 0],
                "image": ["12", 0],
                "strength": 0.48,
                "start_percent": 0.0,
                "end_percent": 0.72,
            },
        },
        "15": {
            "class_type": "KSampler",
            "inputs": {
                "model": ["7", 0],
                "seed": 24051601,
                "steps": 22,
                "cfg": 1.0,
                "sampler_name": "euler",
                "scheduler": "normal",
                "positive": ["14", 0],
                "negative": ["14", 1],
                "latent_image": ["4", 0],
                "denoise": 0.86,
            },
        },
        "16": {"class_type": "VAEDecode", "inputs": {"samples": ["15", 0], "vae": ["3", 0]}},
        "17": {
            "class_type": "SaveImage",
            "inputs": {"images": ["16", 0], "filename_prefix": "merkin/style-lab/yggdrasil-flux-depth-aquarelle-paint-test-strong"},
        },
    }


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    prompt = build_prompt()
    PROMPT_JSON.write_text(json.dumps(prompt, indent=2) + "\n", encoding="utf-8")

    client_id = str(uuid.uuid4())
    response = request_json("/prompt", {"prompt": prompt, "client_id": client_id})
    prompt_id = response["prompt_id"]

    deadline = time.monotonic() + 1200
    while time.monotonic() < deadline:
        history = request_json(f"/history/{prompt_id}")
        if prompt_id in history:
            outputs = history[prompt_id].get("outputs", {})
            images = outputs.get("17", {}).get("images", [])
            if not images:
                raise RuntimeError(f"No SaveImage output in history: {history[prompt_id]}")
            image = images[0]
            query = urllib.parse.urlencode(
                {
                    "filename": image["filename"],
                    "subfolder": image.get("subfolder", ""),
                    "type": image.get("type", "output"),
                }
            )
            with urllib.request.urlopen(f"{SERVER}/view?{query}", timeout=60) as response_view:
                OUTPUT_IMAGE.write_bytes(response_view.read())
            print(f"Wrote {OUTPUT_IMAGE}")
            return
        time.sleep(2)

    raise TimeoutError(f"Timed out waiting for ComfyUI prompt {prompt_id}")


if __name__ == "__main__":
    main()
