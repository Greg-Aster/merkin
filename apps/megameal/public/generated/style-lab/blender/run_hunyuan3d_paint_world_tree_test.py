from __future__ import annotations

import base64
import json
import urllib.error
import urllib.request
from pathlib import Path


REPO_ROOT = Path("/home/greggles/Merkin")
SOURCE_GLB = (
    REPO_ROOT
    / "apps/megameal/public/generated/hunyuan3d"
    / "yggdrasil-world-tree-merged-2026-04-25t02-07-36-925z"
    / "yggdrasil-world-tree-merged-2026-04-25t02-07-36-925z-generated-2026-04-25T02-24-40-321Z.glb"
)
REFERENCE_IMAGE = Path(
    "/home/greggles/ComfyUI/output/merkin/references/yggdrasil-world-tree-merged-1777083570498_00001_.png"
)
OUTPUT_DIR = REPO_ROOT / "apps/megameal/public/generated/style-lab/blender/hunyuan3d-paint-test"
OUTPUT_GLB = OUTPUT_DIR / "yggdrasil-world-tree-hunyuan3d-paint-reference-textured.glb"
OUTPUT_REQUEST = OUTPUT_DIR / "hunyuan3d-paint-request.json"


def as_base64(path: Path) -> str:
    return base64.b64encode(path.read_bytes()).decode("ascii")


def main() -> None:
    if not SOURCE_GLB.exists():
        raise FileNotFoundError(SOURCE_GLB)
    if not REFERENCE_IMAGE.exists():
        raise FileNotFoundError(REFERENCE_IMAGE)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    payload = {
        "image": as_base64(REFERENCE_IMAGE),
        "mesh": as_base64(SOURCE_GLB),
        "texture": True,
        "face_count": 40000,
    }
    OUTPUT_REQUEST.write_text(
        json.dumps(
            {
                "source_glb": str(SOURCE_GLB),
                "reference_image": str(REFERENCE_IMAGE),
                "output_glb": str(OUTPUT_GLB),
                "texture": True,
                "face_count": payload["face_count"],
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    request = urllib.request.Request(
        "http://127.0.0.1:8080/generate",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=900) as response:
            response_body = response.read()
            content_type = response.headers.get("content-type", "")
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Hunyuan3D request failed: HTTP {exc.code}: {body}") from exc

    if "application/json" in content_type:
        raise RuntimeError(response_body.decode("utf-8", errors="replace"))

    OUTPUT_GLB.write_bytes(response_body)
    print(f"Wrote {OUTPUT_GLB}")


if __name__ == "__main__":
    main()
