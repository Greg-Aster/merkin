from __future__ import annotations

import importlib.util
from pathlib import Path

import bpy

from bl_ext.blender_org.paint_system.operators.image_filters import resolve_brush_preset_path
from bl_ext.blender_org.paint_system.operators.image_filters.brush_painter_core import (
    BrushPainterCore,
)

BASE_SCRIPT = Path(__file__).with_name("yggdrasil_world_tree_paint_system_gouache_test.py")

spec = importlib.util.spec_from_file_location("paint_system_gouache_test_base", BASE_SCRIPT)
if spec is None or spec.loader is None:
    raise RuntimeError(f"Could not load base script: {BASE_SCRIPT}")

base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)

base.OUTPUT_DIR = (
    base.REPO_ROOT / "apps/megameal/public/generated/style-lab/blender/paint-system-gouache-max-test"
)
base.OUTPUT_ORIGINAL_GLB = base.OUTPUT_DIR / "yggdrasil-world-tree-original.glb"
base.OUTPUT_PAINTED_GLB = base.OUTPUT_DIR / "yggdrasil-world-tree-paint-system-gouache-max.glb"
base.OUTPUT_BLEND = base.OUTPUT_DIR / "yggdrasil-world-tree-paint-system-gouache-max-comparison.blend"
base.OUTPUT_RENDER = base.OUTPUT_DIR / "yggdrasil-world-tree-paint-system-gouache-max-comparison.png"
base.OUTPUT_TEXTURE = base.OUTPUT_DIR / "yggdrasil-world-tree-paint-system-gouache-max-basecolor.png"
base.BRUSH_PRESET = "Gouache Short 2"
base.RANDOM_SEED = 240517


def apply_max_paint_system_brush_painter(
    image: bpy.types.Image, mesh: bpy.types.Object
) -> bpy.types.Image:
    brush_folder = Path(resolve_brush_preset_path()) / base.BRUSH_PRESET
    if not brush_folder.exists():
        raise FileNotFoundError(brush_folder)

    painter = BrushPainterCore()
    painter.brush_coverage_density = 1.0
    painter.min_brush_scale = 0.018
    painter.max_brush_scale = 0.18
    painter.start_opacity = 0.72
    painter.end_opacity = 1.0
    painter.steps = 14
    painter.gradient_threshold = 0.0
    painter.gaussian_sigma = 1
    painter.hue_shift = 0.035
    painter.saturation_shift = 0.28
    painter.value_shift = 0.22
    painter.use_random_seed = True
    painter.random_seed = base.RANDOM_SEED
    painter.use_random_rotation = True
    painter.random_rotation_range = 180.0
    painter.enable_seam_duplication = True

    uv_name = mesh.data.uv_layers.active.name if mesh.data.uv_layers.active else None
    painted = painter.apply_brush_painting(
        image.copy(),
        brush_folder_path=str(brush_folder),
        mesh_object=mesh,
        uv_map_name=uv_name,
    )
    painted.name = "PaintSystem_MaxGouache_BaseColor"
    painted.filepath_raw = str(base.OUTPUT_TEXTURE)
    painted.file_format = "PNG"
    painted.save()
    return painted


base.apply_paint_system_brush_painter = apply_max_paint_system_brush_painter


if __name__ == "__main__":
    base.main()
