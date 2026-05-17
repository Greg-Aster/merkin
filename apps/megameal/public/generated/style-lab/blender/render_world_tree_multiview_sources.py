from __future__ import annotations

import importlib.util
import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


BASE_SCRIPT = Path(__file__).with_name("yggdrasil_world_tree_paint_system_gouache_test.py")
spec = importlib.util.spec_from_file_location("paint_system_gouache_test_base", BASE_SCRIPT)
if spec is None or spec.loader is None:
    raise RuntimeError(f"Could not load base script: {BASE_SCRIPT}")

base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)

OUTPUT_DIR = (
    base.REPO_ROOT / "apps/megameal/public/generated/style-lab/blender/comfyui-multiview-bake-test"
)
SOURCE_DIR = OUTPUT_DIR / "source-views"
MANIFEST = OUTPUT_DIR / "multiview-manifest.json"

VIEWS = [
    {"name": "front", "azimuth_deg": -90.0, "elevation_factor": 0.18},
    {"name": "back", "azimuth_deg": 90.0, "elevation_factor": 0.18},
    {"name": "left", "azimuth_deg": 180.0, "elevation_factor": 0.18},
    {"name": "right", "azimuth_deg": 0.0, "elevation_factor": 0.18},
    {"name": "front_top", "azimuth_deg": -90.0, "elevation_factor": 0.95},
    {"name": "back_top", "azimuth_deg": 90.0, "elevation_factor": 0.95},
]


def repo_relative(path: Path) -> str:
    try:
        return path.resolve().relative_to(base.REPO_ROOT).as_posix()
    except ValueError:
        return path.as_posix()


def public_url(path: Path) -> str | None:
    relative_path = repo_relative(path)
    public_prefix = "apps/megameal/public/"
    if relative_path.startswith(public_prefix):
        return "/" + relative_path[len(public_prefix) :]
    return None


def view_output_path(view: dict) -> Path:
    return SOURCE_DIR / f"yggdrasil-world-tree-source-{view['name']}.png"


def view_camera_descriptor(
    center: Vector,
    size: Vector,
    azimuth_deg: float,
    elevation_factor: float,
) -> tuple[Vector, float]:
    distance = max(size.x, size.y, size.z) * 1.8
    azimuth = math.radians(azimuth_deg)
    direction = Vector((math.cos(azimuth), math.sin(azimuth), 0.0))
    location = center + direction * distance
    location.z = center.z + size.z * elevation_factor
    ortho_scale = max(size.z * 1.45, (size.x / (1152 / 672)) * 1.28)
    return location, ortho_scale


def manifest_entry(
    view: dict,
    output_path: Path,
    center: Vector,
    size: Vector,
    *,
    backfilled: bool = False,
) -> dict:
    camera_location, ortho_scale = view_camera_descriptor(
        center,
        size,
        view["azimuth_deg"],
        view["elevation_factor"],
    )
    return {
        **view,
        "mode": "ai-texture-source-view",
        "status": "experimental-source",
        "source_asset_url": public_url(base.SOURCE_GLB),
        "source_asset_path": repo_relative(base.SOURCE_GLB),
        "source_image": public_url(output_path),
        "source_image_path": repo_relative(output_path),
        "camera_location": [camera_location.x, camera_location.y, camera_location.z],
        "ortho_scale": ortho_scale,
        "backfilled_from_existing_image": backfilled,
    }


def normalize_existing_manifest_entry(entry: dict) -> dict:
    normalized = dict(entry)
    source_image = normalized.get("source_image")
    if isinstance(source_image, str) and source_image.startswith(str(base.REPO_ROOT)):
        normalized["source_image"] = public_url(Path(source_image))
        normalized["source_image_path"] = repo_relative(Path(source_image))
    elif isinstance(source_image, str) and source_image.startswith("apps/megameal/public/"):
        source_path = base.REPO_ROOT / source_image
        normalized["source_image"] = public_url(source_path)
        normalized["source_image_path"] = repo_relative(source_path)
    elif isinstance(source_image, str) and source_image.startswith("/"):
        normalized.setdefault(
            "source_image_path",
            "apps/megameal/public/" + source_image.lstrip("/"),
        )
    normalized.setdefault("mode", "ai-texture-source-view")
    normalized.setdefault("status", "experimental-source")
    normalized.setdefault("source_asset_url", public_url(base.SOURCE_GLB))
    normalized.setdefault("source_asset_path", repo_relative(base.SOURCE_GLB))
    normalized.setdefault("backfilled_from_existing_image", False)
    return normalized


def setup_view_camera(
    center: Vector,
    size: Vector,
    azimuth_deg: float,
    elevation_factor: float,
) -> bpy.types.Object:
    location, ortho_scale = view_camera_descriptor(
        center,
        size,
        azimuth_deg,
        elevation_factor,
    )
    bpy.ops.object.camera_add(location=location)
    camera = bpy.context.object
    base.look_at(camera, center)
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = ortho_scale
    camera.data.clip_end = max(size.x, size.y, size.z) * 9.0
    bpy.context.scene.camera = camera
    return camera


def setup_light(center: Vector, size: Vector) -> None:
    bpy.ops.object.light_add(type="AREA", location=(center.x, center.y - size.y * 1.8, center.z + size.z * 1.8))
    key = bpy.context.object
    key.name = "multiview key light"
    key.data.energy = 1500
    key.data.size = max(size.x, size.y, size.z)
    bpy.ops.object.light_add(type="POINT", location=(center.x - size.x, center.y + size.y, center.z + size.z))
    fill = bpy.context.object
    fill.name = "multiview fill light"
    fill.data.energy = 250
    fill.data.color = (0.58, 0.72, 1.0)


def render_settings() -> None:
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 64
    scene.render.resolution_x = 1152
    scene.render.resolution_y = 672
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "Medium High Contrast"
    scene.world = scene.world or bpy.data.worlds.new("World")
    scene.world.color = (0.14, 0.145, 0.15)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--view", default="", help="Render only one named view")
    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--") + 1 :]
    else:
        argv = []
    return parser.parse_args(argv)


def main() -> None:
    args = parse_args()
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    base.clear_scene()
    base.import_glb(base.SOURCE_GLB, scale=8.0)
    bpy.context.view_layer.update()
    bounds_min, bounds_max = base.scene_bounds()
    center = (bounds_min + bounds_max) * 0.5
    size = bounds_max - bounds_min
    setup_light(center, size)
    render_settings()

    manifest = []
    selected_views = [view for view in VIEWS if not args.view or view["name"] == args.view]
    if args.view and not selected_views:
        raise ValueError(f"Unknown view: {args.view}")

    existing_manifest = []
    if MANIFEST.exists():
        loaded_manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
        if isinstance(loaded_manifest, list):
            existing_manifest = loaded_manifest
    existing_by_name = {
        entry["name"]: normalize_existing_manifest_entry(entry)
        for entry in existing_manifest
        if isinstance(entry, dict) and isinstance(entry.get("name"), str)
    }

    for view in selected_views:
        for obj in list(bpy.context.scene.objects):
            if obj.type == "CAMERA":
                bpy.data.objects.remove(obj, do_unlink=True)
        camera = setup_view_camera(center, size, view["azimuth_deg"], view["elevation_factor"])
        bpy.context.view_layer.update()
        output_path = view_output_path(view)
        bpy.context.scene.render.filepath = str(output_path)
        bpy.ops.render.render(write_still=True)
        entry = manifest_entry(view, output_path, center, size)
        entry["camera_location"] = [camera.location.x, camera.location.y, camera.location.z]
        entry["ortho_scale"] = camera.data.ortho_scale
        manifest.append(entry)
        print(f"Wrote {output_path}")

    for entry in manifest:
        existing_by_name[entry["name"]] = entry
    for view in VIEWS:
        if view["name"] in existing_by_name:
            continue
        output_path = view_output_path(view)
        if output_path.exists():
            existing_by_name[view["name"]] = manifest_entry(
                view,
                output_path,
                center,
                size,
                backfilled=True,
            )
    ordered_manifest = [existing_by_name[view["name"]] for view in VIEWS if view["name"] in existing_by_name]
    MANIFEST.write_text(json.dumps(ordered_manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {MANIFEST}")


if __name__ == "__main__":
    main()
