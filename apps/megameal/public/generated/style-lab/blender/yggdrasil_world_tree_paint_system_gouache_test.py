from __future__ import annotations

import math
import shutil
from pathlib import Path

import bpy
from mathutils import Vector

from bl_ext.blender_org.paint_system.operators.image_filters import resolve_brush_preset_path
from bl_ext.blender_org.paint_system.operators.image_filters.brush_painter_core import (
    BrushPainterCore,
)

REPO_ROOT = Path("/home/greggles/Merkin")
SOURCE_GLB = (
    REPO_ROOT
    / "apps/megameal/public/generated/hunyuan3d"
    / "yggdrasil-world-tree-merged-2026-04-25t02-07-36-925z"
    / "yggdrasil-world-tree-merged-2026-04-25t02-07-36-925z-generated-2026-04-25T02-24-40-321Z.glb"
)
OUTPUT_DIR = REPO_ROOT / "apps/megameal/public/generated/style-lab/blender/paint-system-gouache-test"
OUTPUT_ORIGINAL_GLB = OUTPUT_DIR / "yggdrasil-world-tree-original.glb"
OUTPUT_PAINTED_GLB = OUTPUT_DIR / "yggdrasil-world-tree-paint-system-gouache.glb"
OUTPUT_BLEND = OUTPUT_DIR / "yggdrasil-world-tree-paint-system-gouache-comparison.blend"
OUTPUT_RENDER = OUTPUT_DIR / "yggdrasil-world-tree-paint-system-gouache-comparison.png"
OUTPUT_TEXTURE = OUTPUT_DIR / "yggdrasil-world-tree-paint-system-gouache-basecolor.png"

BRUSH_PRESET = "Gouache Short 1"
RANDOM_SEED = 240516


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def imported_roots(before: set[bpy.types.Object]) -> list[bpy.types.Object]:
    imported = [obj for obj in bpy.data.objects if obj not in before]
    imported_set = set(imported)
    return [obj for obj in imported if obj.parent not in imported_set]


def import_glb(path: Path, x_offset: float = 0.0, scale: float = 1.0) -> list[bpy.types.Object]:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    roots = imported_roots(before)
    for root in roots:
        root.location.x += x_offset
        root.scale = tuple(component * scale for component in root.scale)
    return roots


def mesh_objects() -> list[bpy.types.Object]:
    return [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]


def largest_mesh_object() -> bpy.types.Object:
    meshes = mesh_objects()
    if not meshes:
        raise RuntimeError("No mesh object found")
    return max(meshes, key=lambda obj: len(obj.data.polygons))


def first_principled_node(material: bpy.types.Material):
    if not material or not material.use_nodes:
        return None
    for node in material.node_tree.nodes:
        if node.bl_idname == "ShaderNodeBsdfPrincipled":
            return node
    return None


def base_color_texture_nodes(material: bpy.types.Material) -> list[bpy.types.Node]:
    principled = first_principled_node(material)
    if not principled:
        return []
    socket = principled.inputs.get("Base Color")
    if not socket:
        return []
    nodes = []
    for link in material.node_tree.links:
        if link.to_node == principled and link.to_socket == socket:
            if link.from_node.bl_idname == "ShaderNodeTexImage" and link.from_node.image:
                nodes.append(link.from_node)
    return nodes


def apply_paint_system_brush_painter(image: bpy.types.Image, mesh: bpy.types.Object) -> bpy.types.Image:
    brush_folder = Path(resolve_brush_preset_path()) / BRUSH_PRESET
    if not brush_folder.exists():
        raise FileNotFoundError(brush_folder)

    painter = BrushPainterCore()
    painter.brush_coverage_density = 0.92
    painter.min_brush_scale = 0.012
    painter.max_brush_scale = 0.068
    painter.start_opacity = 0.45
    painter.end_opacity = 0.94
    painter.steps = 7
    painter.gradient_threshold = 0.02
    painter.gaussian_sigma = 2
    painter.use_random_seed = True
    painter.random_seed = RANDOM_SEED
    painter.use_random_rotation = True
    painter.random_rotation_range = 65.0
    painter.enable_seam_duplication = True

    uv_name = mesh.data.uv_layers.active.name if mesh.data.uv_layers.active else None
    painted = painter.apply_brush_painting(
        image.copy(),
        brush_folder_path=str(brush_folder),
        mesh_object=mesh,
        uv_map_name=uv_name,
    )
    painted.name = "PaintSystem_Gouache_BaseColor"
    painted.filepath_raw = str(OUTPUT_TEXTURE)
    painted.file_format = "PNG"
    painted.save()
    return painted


def replace_base_color_images_with_paint_system_output(mesh: bpy.types.Object) -> None:
    painted_by_source: dict[str, bpy.types.Image] = {}
    for material in bpy.data.materials:
        for texture_node in base_color_texture_nodes(material):
            source_image = texture_node.image
            if source_image.size[0] == 0 or source_image.size[1] == 0:
                continue
            key = source_image.name
            if key not in painted_by_source:
                painted_by_source[key] = apply_paint_system_brush_painter(source_image, mesh)
            texture_node.image = painted_by_source[key]

        principled = first_principled_node(material)
        if principled:
            if "Roughness" in principled.inputs:
                principled.inputs["Roughness"].default_value = 0.93
            if "Metallic" in principled.inputs:
                principled.inputs["Metallic"].default_value = 0.0


def export_painted_glb() -> None:
    clear_scene()
    import_glb(SOURCE_GLB)
    bpy.context.view_layer.update()
    mesh = largest_mesh_object()
    replace_base_color_images_with_paint_system_output(mesh)
    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT_PAINTED_GLB),
        export_format="GLB",
        use_selection=False,
    )


def scene_bounds() -> tuple[Vector, Vector]:
    meshes = mesh_objects()
    if not meshes:
        raise RuntimeError("No meshes to frame")
    bounds_min = Vector((math.inf, math.inf, math.inf))
    bounds_max = Vector((-math.inf, -math.inf, -math.inf))
    for obj in meshes:
        for corner in obj.bound_box:
            point = obj.matrix_world @ Vector(corner)
            bounds_min.x = min(bounds_min.x, point.x)
            bounds_min.y = min(bounds_min.y, point.y)
            bounds_min.z = min(bounds_min.z, point.z)
            bounds_max.x = max(bounds_max.x, point.x)
            bounds_max.y = max(bounds_max.y, point.y)
            bounds_max.z = max(bounds_max.z, point.z)
    return bounds_min, bounds_max


def look_at(obj: bpy.types.Object, target: Vector) -> None:
    direction = target - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def make_label(text: str, location: tuple[float, float, float]) -> None:
    curve = bpy.data.curves.new(text, type="FONT")
    curve.body = text
    curve.align_x = "CENTER"
    curve.align_y = "CENTER"
    curve.size = 0.9
    obj = bpy.data.objects.new(text, curve)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = (math.radians(67), 0.0, 0.0)


def add_lighting_and_camera() -> None:
    bounds_min, bounds_max = scene_bounds()
    center = (bounds_min + bounds_max) * 0.5
    size = bounds_max - bounds_min

    bpy.ops.object.light_add(type="AREA", location=(center.x, bounds_min.y - 24, bounds_max.z + 22))
    key = bpy.context.object
    key.name = "paint system comparison key light"
    key.data.energy = 1550
    key.data.size = 24

    bpy.ops.object.light_add(type="POINT", location=(bounds_min.x - 10, center.y + 12, bounds_max.z + 7))
    fill = bpy.context.object
    fill.name = "paint system comparison fill light"
    fill.data.energy = 250
    fill.data.color = (0.58, 0.72, 1.0)

    distance = max(size.x, size.y, size.z) * 1.8
    bpy.ops.object.camera_add(location=(center.x, bounds_min.y - distance, center.z + size.z * 0.18))
    camera = bpy.context.object
    look_at(camera, center)
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = max(size.z * 1.45, (size.x / (1800 / 1050)) * 1.28)
    camera.data.clip_end = distance * 4.0
    bpy.context.scene.camera = camera


def render_settings() -> None:
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 96
    scene.render.resolution_x = 1800
    scene.render.resolution_y = 1050
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "Medium High Contrast"
    scene.world = scene.world or bpy.data.worlds.new("World")
    scene.world.color = (0.14, 0.145, 0.15)


def build_comparison_scene() -> None:
    clear_scene()
    import_glb(OUTPUT_ORIGINAL_GLB, x_offset=-12.0, scale=8.0)
    import_glb(OUTPUT_PAINTED_GLB, x_offset=12.0, scale=8.0)
    bpy.context.view_layer.update()
    make_label("ORIGINAL GLB", (-12.0, 15.0, -15.0))
    make_label("PAINT SYSTEM GOUACHE TEXTURE", (12.0, 15.0, -15.0))
    bpy.context.view_layer.update()
    add_lighting_and_camera()
    render_settings()
    bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT_BLEND))
    bpy.context.scene.render.filepath = str(OUTPUT_RENDER)
    bpy.ops.render.render(write_still=True)


def main() -> None:
    if not SOURCE_GLB.exists():
        raise FileNotFoundError(SOURCE_GLB)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    shutil.copy2(SOURCE_GLB, OUTPUT_ORIGINAL_GLB)
    export_painted_glb()
    build_comparison_scene()
    print(f"Wrote {OUTPUT_ORIGINAL_GLB}")
    print(f"Wrote {OUTPUT_PAINTED_GLB}")
    print(f"Wrote {OUTPUT_TEXTURE}")
    print(f"Wrote {OUTPUT_BLEND}")
    print(f"Wrote {OUTPUT_RENDER}")


if __name__ == "__main__":
    main()
