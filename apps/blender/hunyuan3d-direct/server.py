#!/usr/bin/env python3
"""Local Hunyuan3D server for Blender.

This is intentionally small glue around the official Tencent Hunyuan3D-2
Python package. It loads the local checkpoint already present on this machine
and exposes the same `/generate` endpoint used by the official Blender add-on.
"""

from __future__ import annotations

import argparse
import base64
import os
import sys
import tempfile
import traceback
import uuid
from io import BytesIO
from pathlib import Path
from typing import Any

import torch
import trimesh
import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from PIL import Image


DEFAULT_REPO_ROOT = Path("/home/greggles/ai-runtimes/Hunyuan3D-2")
DEFAULT_SHAPE_CKPT = Path("/home/greggles/ComfyUI/models/diffusion_models/hunyuan3d-dit-v2-0/model.ckpt")
DEFAULT_SHAPE_CONFIG = Path(__file__).resolve().parent / "config" / "dit_config.yaml"
DEFAULT_TEXTURE_MODEL = Path("/home/greggles/ComfyUI/models/diffusers")
DEFAULT_OUTPUT_DIR = Path(__file__).resolve().parent / "outputs"


def decode_image(image_b64: str) -> Image.Image:
    return Image.open(BytesIO(base64.b64decode(image_b64))).convert("RGBA")


def decode_mesh(mesh_b64: str) -> trimesh.Trimesh | trimesh.Scene:
    return trimesh.load(BytesIO(base64.b64decode(mesh_b64)), file_type="glb")


def import_hunyuan(repo_root: Path) -> dict[str, Any]:
    repo_root = repo_root.expanduser().resolve()
    if not repo_root.exists():
        raise FileNotFoundError(f"Hunyuan3D repo not found: {repo_root}")
    sys.path.insert(0, str(repo_root))

    from hy3dgen.rembg import BackgroundRemover
    from hy3dgen.shapegen import (
        DegenerateFaceRemover,
        FaceReducer,
        FloaterRemover,
        Hunyuan3DDiTFlowMatchingPipeline,
    )
    from hy3dgen.texgen import Hunyuan3DPaintPipeline

    return {
        "BackgroundRemover": BackgroundRemover,
        "DegenerateFaceRemover": DegenerateFaceRemover,
        "FaceReducer": FaceReducer,
        "FloaterRemover": FloaterRemover,
        "Hunyuan3DDiTFlowMatchingPipeline": Hunyuan3DDiTFlowMatchingPipeline,
        "Hunyuan3DPaintPipeline": Hunyuan3DPaintPipeline,
    }


class HunyuanWorker:
    def __init__(self, args: argparse.Namespace):
        modules = import_hunyuan(Path(args.repo_root))
        self.output_dir = Path(args.output_dir).expanduser().resolve()
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.device = args.device
        self.enable_texture = bool(args.enable_texture)
        self.BackgroundRemover = modules["BackgroundRemover"]
        self.FloaterRemover = modules["FloaterRemover"]
        self.DegenerateFaceRemover = modules["DegenerateFaceRemover"]
        self.FaceReducer = modules["FaceReducer"]

        shape_ckpt = Path(args.shape_ckpt).expanduser().resolve()
        shape_config = Path(args.shape_config).expanduser().resolve()
        if not shape_ckpt.exists():
            raise FileNotFoundError(f"Shape checkpoint not found: {shape_ckpt}")
        if not shape_config.exists():
            raise FileNotFoundError(f"Shape config not found: {shape_config}")

        self.rembg = self.BackgroundRemover()
        self.shape_pipeline = modules["Hunyuan3DDiTFlowMatchingPipeline"].from_single_file(
            ckpt_path=str(shape_ckpt),
            config_path=str(shape_config),
            device=self.device,
            use_safetensors=False,
        )

        self.texture_pipeline = None
        if self.enable_texture:
            texture_model = Path(args.texture_model).expanduser().resolve()
            if not texture_model.exists():
                raise FileNotFoundError(f"Texture model not found: {texture_model}")
            self.texture_pipeline = modules["Hunyuan3DPaintPipeline"].from_pretrained(str(texture_model))

    def prepare_image(self, image_b64: str) -> Image.Image:
        image = decode_image(image_b64)
        alpha = image.getchannel("A")
        if alpha.getextrema()[0] < 255:
            return image
        try:
            return self.rembg(image)
        except Exception as exc:
            print(f"Background removal failed; using original image: {exc}", flush=True)
            return image

    @torch.inference_mode()
    def generate(self, params: dict[str, Any]) -> Path:
        image = params.get("image")
        mesh_data = params.get("mesh")
        if not image:
            raise ValueError(
                "This local direct server requires an input image. "
                "Text-only generation is not enabled because the text-to-image model is not loaded."
            )

        source_image = self.prepare_image(image)
        should_texture = bool(params.get("texture", False))
        if should_texture and not self.texture_pipeline:
            raise ValueError("Texture generation was requested, but the server was started without --enable-texture.")

        if mesh_data:
            mesh = decode_mesh(mesh_data)
        else:
            generator = torch.Generator(self.device).manual_seed(int(params.get("seed", 1234)))
            mesh = self.shape_pipeline(
                image=source_image,
                generator=generator,
                octree_resolution=int(params.get("octree_resolution", 256)),
                num_inference_steps=int(params.get("num_inference_steps", 20)),
                guidance_scale=float(params.get("guidance_scale", 5.5)),
                mc_algo="mc",
            )[0]

        if should_texture:
            mesh = self.FloaterRemover()(mesh)
            mesh = self.DegenerateFaceRemover()(mesh)
            mesh = self.FaceReducer()(mesh, max_facenum=int(params.get("face_count", 40000)))
            mesh = self.texture_pipeline(mesh, source_image)

        output_path = self.output_dir / f"{uuid.uuid4()}.glb"
        with tempfile.NamedTemporaryFile(suffix=".glb", delete=False) as handle:
            temp_path = Path(handle.name)
        try:
            mesh.export(temp_path)
            saved_mesh = trimesh.load(temp_path)
            saved_mesh.export(output_path)
        finally:
            temp_path.unlink(missing_ok=True)
        torch.cuda.empty_cache()
        return output_path


def build_app(worker: HunyuanWorker) -> FastAPI:
    app = FastAPI(title="Merkin Local Hunyuan3D")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health")
    async def health():
        return JSONResponse({"ok": True, "texture": worker.enable_texture})

    @app.post("/generate")
    async def generate(request: Request):
        try:
            params = await request.json()
            output_path = worker.generate(params)
            return FileResponse(output_path)
        except Exception as exc:
            traceback.print_exc()
            return JSONResponse({"error": str(exc)}, status_code=400)

    return app


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run local Hunyuan3D for Blender.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8080)
    parser.add_argument("--device", default="cuda")
    parser.add_argument("--repo-root", default=str(DEFAULT_REPO_ROOT))
    parser.add_argument("--shape-ckpt", default=str(DEFAULT_SHAPE_CKPT))
    parser.add_argument("--shape-config", default=str(DEFAULT_SHAPE_CONFIG))
    parser.add_argument("--texture-model", default=str(DEFAULT_TEXTURE_MODEL))
    parser.add_argument("--output-dir", default=str(DEFAULT_OUTPUT_DIR))
    parser.add_argument("--enable-texture", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    worker = HunyuanWorker(args)
    uvicorn.run(build_app(worker), host=args.host, port=args.port, log_level="info")


if __name__ == "__main__":
    main()
