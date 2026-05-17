from __future__ import annotations

import importlib.util
import json
import math
from datetime import datetime, timezone
from pathlib import Path

import bpy
import numpy as np
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector


BASE_SCRIPT = Path(__file__).with_name("yggdrasil_world_tree_paint_system_gouache_test.py")
spec = importlib.util.spec_from_file_location("paint_system_gouache_test_base", BASE_SCRIPT)
if spec is None or spec.loader is None:
    raise RuntimeError(f"Could not load base script: {BASE_SCRIPT}")

base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)

OUTPUT_DIR = (
    base.REPO_ROOT / "apps/megameal/public/generated/style-lab/blender/comfyui-projection-bake-test"
)
STYLE_IMAGE = (
    base.REPO_ROOT
    / "apps/megameal/public/generated/style-lab/blender/comfyui-flux-style-test"
    / "yggdrasil-world-tree-flux-depth-aquarelle-paint-test-strong.png"
)
OUTPUT_TEXTURE = OUTPUT_DIR / "yggdrasil-world-tree-comfyui-single-view-projection-basecolor.png"
OUTPUT_GLB = OUTPUT_DIR / "yggdrasil-world-tree-comfyui-single-view-projection.glb"
OUTPUT_METADATA = OUTPUT_GLB.with_suffix(".json")
OUTPUT_BLEND = OUTPUT_DIR / "yggdrasil-world-tree-comfyui-single-view-projection-comparison.blend"
OUTPUT_RENDER = OUTPUT_DIR / "yggdrasil-world-tree-comfyui-single-view-projection-comparison.png"


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


def load_pixels(path: Path) -> tuple[np.ndarray, bpy.types.Image]:
    image = bpy.data.images.load(str(path))
    width, height = image.size
    pixels = np.array(image.pixels[:], dtype=np.float32).reshape((height, width, 4))
    return pixels, image


def image_asset_key(image: bpy.types.Image) -> str:
    filepath = bpy.path.abspath(image.filepath) if image.filepath else ""
    return filepath or image.name


def base_color_images() -> list[bpy.types.Image]:
    images_by_key: dict[str, bpy.types.Image] = {}
    for material in bpy.data.materials:
        for node in base.base_color_texture_nodes(material):
            if node.image and node.image.size[0] > 0 and node.image.size[1] > 0:
                images_by_key.setdefault(image_asset_key(node.image), node.image)
    return list(images_by_key.values())


def single_supported_mesh() -> bpy.types.Object:
    meshes = [obj for obj in base.mesh_objects() if obj.data.uv_layers.active]
    if len(meshes) != 1:
        raise RuntimeError(
            "ComfyUI single-view projection only supports one UV-mapped mesh. "
            f"Found {len(meshes)}; promote multi-mesh projection through StyleBakeManager before runtime use."
        )
    return meshes[0]


def single_supported_base_color_image() -> bpy.types.Image:
    images = base_color_images()
    if len(images) != 1:
        raise RuntimeError(
            "ComfyUI single-view projection only supports one base-color texture atlas. "
            f"Found {len(images)}; use the formal style bake product pipeline for multi-material sources."
        )
    return images[0]


def image_pixels(image: bpy.types.Image) -> np.ndarray:
    width, height = image.size
    return np.array(image.pixels[:], dtype=np.float32).reshape((height, width, 4))


def barycentric_grid(
    p0: np.ndarray,
    p1: np.ndarray,
    p2: np.ndarray,
    xs: np.ndarray,
    ys: np.ndarray,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    x0, y0 = p0
    x1, y1 = p1
    x2, y2 = p2
    denom = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2)
    if abs(float(denom)) < 1e-8:
        raise ValueError("Degenerate triangle")
    w0 = ((y1 - y2) * (xs - x2) + (x2 - x1) * (ys - y2)) / denom
    w1 = ((y2 - y0) * (xs - x2) + (x0 - x2) * (ys - y2)) / denom
    w2 = 1.0 - w0 - w1
    return w0, w1, w2


def triangle_bbox(points: np.ndarray, width: int, height: int) -> tuple[int, int, int, int] | None:
    min_x = max(0, int(math.floor(float(np.min(points[:, 0])))))
    max_x = min(width - 1, int(math.ceil(float(np.max(points[:, 0])))))
    min_y = max(0, int(math.floor(float(np.min(points[:, 1])))))
    max_y = min(height - 1, int(math.ceil(float(np.max(points[:, 1])))))
    if max_x < min_x or max_y < min_y:
        return None
    return min_x, max_x, min_y, max_y


def triangle_records(obj: bpy.types.Object, camera: bpy.types.Object, scene: bpy.types.Scene) -> list[dict]:
    mesh = obj.data
    if not mesh.uv_layers.active:
        raise RuntimeError(f"{obj.name} has no active UV layer")

    uv_data = mesh.uv_layers.active.data
    camera_inverse = camera.matrix_world.inverted()
    records: list[dict] = []

    for polygon in mesh.polygons:
        loop_indices = list(polygon.loop_indices)
        if len(loop_indices) < 3:
            continue
        loop_tris = [(loop_indices[0], loop_indices[index], loop_indices[index + 1]) for index in range(1, len(loop_indices) - 1)]
        for tri_loop_indices in loop_tris:
            world_points = []
            uvs = []
            projected = []
            depths = []
            for loop_index in tri_loop_indices:
                loop = mesh.loops[loop_index]
                world_point = obj.matrix_world @ mesh.vertices[loop.vertex_index].co
                uv = uv_data[loop_index].uv
                ndc = world_to_camera_view(scene, camera, world_point)
                camera_point = camera_inverse @ world_point
                world_points.append(world_point)
                uvs.append((float(uv.x), float(uv.y)))
                projected.append((float(ndc.x), float(ndc.y)))
                depths.append(float(-camera_point.z))

            if any(depth <= 0 for depth in depths):
                continue

            # Very thin projected triangles do not contribute useful texture data.
            p = np.array(projected, dtype=np.float32)
            area = abs(float(np.cross(p[1] - p[0], p[2] - p[0])))
            if area < 1e-8:
                continue

            world_normal = (obj.matrix_world.to_3x3() @ polygon.normal).normalized()
            world_center = sum(world_points, Vector()) / len(world_points)
            view_direction = (camera.location - world_center).normalized()
            facing_weight = max(0.0, float(world_normal.dot(view_direction)))
            if facing_weight <= 0.02:
                continue

            records.append(
                {
                    "uv": np.array(uvs, dtype=np.float32),
                    "screen": p,
                    "depth": np.array(depths, dtype=np.float32),
                    "weight": facing_weight,
                }
            )

    return records


def build_depth_buffer(records: list[dict], width: int, height: int) -> np.ndarray:
    zbuffer = np.full((height, width), np.inf, dtype=np.float32)
    for record in records:
        screen = record["screen"].copy()
        screen[:, 0] *= width - 1
        screen[:, 1] *= height - 1
        bbox = triangle_bbox(screen, width, height)
        if not bbox:
            continue
        min_x, max_x, min_y, max_y = bbox
        x_grid, y_grid = np.meshgrid(
            np.arange(min_x, max_x + 1, dtype=np.float32) + 0.5,
            np.arange(min_y, max_y + 1, dtype=np.float32) + 0.5,
        )
        try:
            w0, w1, w2 = barycentric_grid(screen[0], screen[1], screen[2], x_grid, y_grid)
        except ValueError:
            continue
        mask = (w0 >= -1e-4) & (w1 >= -1e-4) & (w2 >= -1e-4)
        if not np.any(mask):
            continue
        depth = w0 * record["depth"][0] + w1 * record["depth"][1] + w2 * record["depth"][2]
        patch = zbuffer[min_y : max_y + 1, min_x : max_x + 1]
        update = mask & (depth < patch)
        patch[update] = depth[update]
    return zbuffer


def sample_nearest(image_pixels: np.ndarray, x: np.ndarray, y: np.ndarray) -> np.ndarray:
    height, width, _ = image_pixels.shape
    xi = np.clip(np.rint(x).astype(np.int32), 0, width - 1)
    yi = np.clip(np.rint(y).astype(np.int32), 0, height - 1)
    return image_pixels[yi, xi]


def bake_projection(
    records: list[dict],
    styled_pixels: np.ndarray,
    source_pixels: np.ndarray,
    zbuffer: np.ndarray,
) -> tuple[np.ndarray, np.ndarray, dict]:
    texture = source_pixels.copy()
    texture_h, texture_w, _ = texture.shape
    style_h, style_w, _ = styled_pixels.shape
    painted = np.zeros((texture_h, texture_w), dtype=bool)
    depth_epsilon = 0.003
    visible_triangle_count = 0
    visible_sample_count = 0
    visible_weight_sum = 0.0

    for record in records:
        uv_pixels = record["uv"].copy()
        uv_pixels[:, 0] *= texture_w - 1
        uv_pixels[:, 1] *= texture_h - 1
        bbox = triangle_bbox(uv_pixels, texture_w, texture_h)
        if not bbox:
            continue
        min_x, max_x, min_y, max_y = bbox
        x_grid, y_grid = np.meshgrid(
            np.arange(min_x, max_x + 1, dtype=np.float32) + 0.5,
            np.arange(min_y, max_y + 1, dtype=np.float32) + 0.5,
        )
        try:
            w0, w1, w2 = barycentric_grid(uv_pixels[0], uv_pixels[1], uv_pixels[2], x_grid, y_grid)
        except ValueError:
            continue
        uv_mask = (w0 >= -1e-4) & (w1 >= -1e-4) & (w2 >= -1e-4)
        if not np.any(uv_mask):
            continue

        screen = record["screen"]
        sx = (w0 * screen[0, 0] + w1 * screen[1, 0] + w2 * screen[2, 0]) * (style_w - 1)
        sy = (w0 * screen[0, 1] + w1 * screen[1, 1] + w2 * screen[2, 1]) * (style_h - 1)
        depth = w0 * record["depth"][0] + w1 * record["depth"][1] + w2 * record["depth"][2]
        screen_bounds = (sx >= 0) & (sx <= style_w - 1) & (sy >= 0) & (sy <= style_h - 1)
        sx_i = np.clip(np.rint(sx).astype(np.int32), 0, style_w - 1)
        sy_i = np.clip(np.rint(sy).astype(np.int32), 0, style_h - 1)
        zbuffer_depth = zbuffer[sy_i, sx_i]
        visible = (
            uv_mask
            & screen_bounds
            & np.isfinite(zbuffer_depth)
            & (depth <= zbuffer_depth + depth_epsilon)
        )
        if not np.any(visible):
            continue
        visible_samples = int(visible.sum())
        visible_triangle_count += 1
        visible_sample_count += visible_samples
        visible_weight_sum += visible_samples * float(record["weight"])

        color = sample_nearest(styled_pixels, sx, sy)
        patch = texture[min_y : max_y + 1, min_x : max_x + 1]
        patch[visible] = color[visible]
        painted[min_y : max_y + 1, min_x : max_x + 1] |= visible

    texture[:, :, 3] = 1.0
    average_facing_weight = (
        visible_weight_sum / visible_sample_count if visible_sample_count else 0.0
    )
    print(
        "Projection visible UV triangles: "
        f"{visible_triangle_count}; samples: {visible_sample_count}; "
        f"average facing weight: {average_facing_weight:.3f}"
    )
    return texture, painted, {
        "depthEpsilon": depth_epsilon,
        "visibleTriangleCount": visible_triangle_count,
        "visibleSampleCount": visible_sample_count,
        "averageFacingWeight": average_facing_weight,
    }


def save_texture(pixels: np.ndarray) -> bpy.types.Image:
    height, width, _ = pixels.shape
    image = bpy.data.images.new("ComfyUI_Single_View_Projection_BaseColor", width=width, height=height, alpha=True)
    image.pixels.foreach_set(np.clip(pixels, 0.0, 1.0).reshape(-1))
    image.filepath_raw = str(OUTPUT_TEXTURE)
    image.file_format = "PNG"
    image.save()
    return image


def apply_texture(image: bpy.types.Image, source_image_key: str) -> int:
    replaced_node_count = 0
    for material in bpy.data.materials:
        material.use_nodes = True
        texture_nodes = [
            node
            for node in base.base_color_texture_nodes(material)
            if node.image and image_asset_key(node.image) == source_image_key
        ]
        if not texture_nodes:
            continue
        replaced_node_count += len(texture_nodes)
        for node in texture_nodes:
            node.image = image
        principled = base.first_principled_node(material)
        if principled:
            if "Roughness" in principled.inputs:
                principled.inputs["Roughness"].default_value = 0.95
            if "Metallic" in principled.inputs:
                principled.inputs["Metallic"].default_value = 0.0
    return replaced_node_count


def write_metadata(coverage: float, diagnostics: dict) -> None:
    metadata = {
        "schemaVersion": 1,
        "mode": "ai-texture-source",
        "status": "experimental-source",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sourceAssetUrl": public_url(base.SOURCE_GLB),
        "sourceAssetPath": repo_relative(base.SOURCE_GLB),
        "styleImageUrl": public_url(STYLE_IMAGE),
        "styleImagePath": repo_relative(STYLE_IMAGE),
        "outputs": {
            "textureUrl": public_url(OUTPUT_TEXTURE),
            "texturePath": repo_relative(OUTPUT_TEXTURE),
            "glbUrl": public_url(OUTPUT_GLB),
            "glbPath": repo_relative(OUTPUT_GLB),
            "comparisonRenderUrl": public_url(OUTPUT_RENDER),
            "comparisonRenderPath": repo_relative(OUTPUT_RENDER),
        },
        "coverage": coverage,
        "diagnostics": diagnostics,
        "runtimePolicy": {
            "eligibleForRuntimeCook": False,
            "promotionPath": "StyleBakeManager style bake product metadata",
            "removalCondition": "Replace with deterministic style bake product before committing runtime asset references.",
        },
    }
    OUTPUT_METADATA.write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")


def export_projected_glb() -> tuple[int, int, dict]:
    base.clear_scene()
    base.import_glb(base.SOURCE_GLB, scale=8.0)
    bpy.context.view_layer.update()
    base.add_lighting_and_camera()
    bpy.context.view_layer.update()
    scene = bpy.context.scene
    camera = scene.camera
    if camera is None:
        raise RuntimeError("Projection camera was not created")

    obj = single_supported_mesh()
    styled_pixels, _ = load_pixels(STYLE_IMAGE)
    source_image = single_supported_base_color_image()
    source_pixels = image_pixels(source_image)

    records = triangle_records(obj, camera, scene)
    print(f"Projection records: {len(records)}")
    if records:
        screens = np.concatenate([record["screen"] for record in records], axis=0)
        uvs = np.concatenate([record["uv"] for record in records], axis=0)
        print(
            "Projection screen range: "
            f"x={screens[:, 0].min():.3f}..{screens[:, 0].max():.3f} "
            f"y={screens[:, 1].min():.3f}..{screens[:, 1].max():.3f}; "
            f"uv x={uvs[:, 0].min():.3f}..{uvs[:, 0].max():.3f} "
            f"uv y={uvs[:, 1].min():.3f}..{uvs[:, 1].max():.3f}"
        )
    zbuffer = build_depth_buffer(records, styled_pixels.shape[1], styled_pixels.shape[0])
    projected_pixels, painted, diagnostics = bake_projection(
        records,
        styled_pixels,
        source_pixels,
        zbuffer,
    )
    baked_image = save_texture(projected_pixels)

    base.clear_scene()
    base.import_glb(base.SOURCE_GLB)
    bpy.context.view_layer.update()
    reimport_source_image = single_supported_base_color_image()
    baked_image = bpy.data.images.load(str(OUTPUT_TEXTURE), check_existing=True)
    diagnostics["replacedBaseColorTextureNodes"] = apply_texture(
        baked_image,
        image_asset_key(reimport_source_image),
    )

    bpy.ops.export_scene.gltf(filepath=str(OUTPUT_GLB), export_format="GLB", use_selection=False)
    return int(painted.sum()), int(painted.size), diagnostics


def render_comparison() -> None:
    base.clear_scene()
    base.import_glb(base.SOURCE_GLB, x_offset=-12.0, scale=8.0)
    base.import_glb(OUTPUT_GLB, x_offset=12.0, scale=8.0)
    bpy.context.view_layer.update()
    base.make_label("ORIGINAL GLB", (-12.0, 15.0, -15.0))
    base.make_label("SINGLE-VIEW PROJECTED GLB", (12.0, 15.0, -15.0))
    bpy.context.view_layer.update()
    base.add_lighting_and_camera()
    base.render_settings()
    bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT_BLEND))
    bpy.context.scene.render.filepath = str(OUTPUT_RENDER)
    bpy.ops.render.render(write_still=True)


def main() -> None:
    if not STYLE_IMAGE.exists():
        raise FileNotFoundError(STYLE_IMAGE)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    painted_count, total_count, diagnostics = export_projected_glb()
    render_comparison()
    coverage = painted_count / max(total_count, 1)
    write_metadata(coverage, diagnostics)
    print(f"Wrote {OUTPUT_TEXTURE}")
    print(f"Wrote {OUTPUT_GLB}")
    print(f"Wrote {OUTPUT_METADATA}")
    print(f"Wrote {OUTPUT_BLEND}")
    print(f"Wrote {OUTPUT_RENDER}")
    print(f"Projected UV coverage: {coverage:.2%}")


if __name__ == "__main__":
    main()
