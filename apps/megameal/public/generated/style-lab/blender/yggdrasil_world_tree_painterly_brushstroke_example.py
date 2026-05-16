from __future__ import annotations

import bisect
import math
import random
from array import array
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

REPO_ROOT = Path("/home/greggles/Merkin")
SOURCE_GLB = (
    REPO_ROOT
    / "apps/megameal/public/generated/hunyuan3d"
    / "yggdrasil-world-tree-merged-2026-04-25t02-07-36-925z"
    / "yggdrasil-world-tree-merged-2026-04-25t02-07-36-925z-generated-2026-04-25T02-24-40-321Z.glb"
)
OUTPUT_DIR = REPO_ROOT / "apps/megameal/public/generated/style-lab/blender"
OUTPUT_BLEND = OUTPUT_DIR / "yggdrasil-world-tree-brushstroke-painterly-example.blend"
OUTPUT_RENDER = OUTPUT_DIR / "yggdrasil-world-tree-brushstroke-painterly-example.png"

RANDOM_SEED = 1776
WORLD_TREE_SCALE = 8.0
NORMAL_X = -12.0
PAINTERLY_X = 12.0
STROKE_COUNT = 18000


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def import_tree_copy(name: str, x_offset: float) -> bpy.types.Collection:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(SOURCE_GLB))
    imported = [obj for obj in bpy.data.objects if obj not in before]

    collection = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(collection)

    imported_set = set(imported)
    roots = [obj for obj in imported if obj.parent not in imported_set]

    for obj in imported:
        for existing_collection in list(obj.users_collection):
            existing_collection.objects.unlink(obj)
        collection.objects.link(obj)

    for obj in roots:
        obj.location.x += x_offset
        obj.scale = tuple(component * WORLD_TREE_SCALE for component in obj.scale)

    return collection


def main_mesh_object(collection: bpy.types.Collection) -> bpy.types.Object:
    mesh_objects = [obj for obj in collection.all_objects if obj.type == "MESH"]
    if not mesh_objects:
        raise RuntimeError(f"No mesh objects in {collection.name}")
    return max(mesh_objects, key=lambda obj: len(obj.data.polygons))


def first_principled_node(material: bpy.types.Material):
    if not material or not material.use_nodes:
        return None
    for node in material.node_tree.nodes:
        if node.bl_idname == "ShaderNodeBsdfPrincipled":
            return node
    return None


def find_base_color_image(material: bpy.types.Material | None):
    if not material:
        return None
    principled = first_principled_node(material)
    if not principled:
        return None
    socket = principled.inputs.get("Base Color")
    if not socket:
        return None
    for link in material.node_tree.links:
        if link.to_node == principled and link.to_socket == socket:
            if link.from_node.bl_idname == "ShaderNodeTexImage":
                return link.from_node.image
    return None


def material_base_color(material: bpy.types.Material | None) -> tuple[float, float, float]:
    if material:
        principled = first_principled_node(material)
        socket = principled.inputs.get("Base Color") if principled else None
        if socket and hasattr(socket, "default_value"):
            color = socket.default_value
            return float(color[0]), float(color[1]), float(color[2])
        return tuple(float(channel) for channel in material.diffuse_color[:3])
    return 0.52, 0.45, 0.30


IMAGE_CACHE: dict[str, tuple[int, int, array]] = {}


def image_pixels(image: bpy.types.Image | None):
    if not image:
        return None
    key = image.name
    if key not in IMAGE_CACHE:
        width, height = image.size
        pixels = array("f", [0.0]) * (width * height * 4)
        image.pixels.foreach_get(pixels)
        IMAGE_CACHE[key] = (width, height, pixels)
    return IMAGE_CACHE[key]


def fract(value: float) -> float:
    return value - math.floor(value)


def sample_image(image: bpy.types.Image | None, uv: Vector):
    cached = image_pixels(image)
    if not cached:
        return None
    width, height, pixels = cached
    x = min(width - 1, max(0, int(fract(float(uv.x)) * width)))
    y = min(height - 1, max(0, int(fract(float(uv.y)) * height)))
    offset = (y * width + x) * 4
    return float(pixels[offset]), float(pixels[offset + 1]), float(pixels[offset + 2])


def clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def mix_color(
    a: tuple[float, float, float],
    b: tuple[float, float, float],
    amount: float,
) -> tuple[float, float, float]:
    return tuple(a[index] * (1.0 - amount) + b[index] * amount for index in range(3))


def painted_color(
    base: tuple[float, float, float],
    normal: Vector,
    rng: random.Random,
) -> tuple[float, float, float, float]:
    light = Vector((-0.18, -0.62, 0.76)).normalized()
    value = clamp(0.34 + max(0.0, normal.normalized().dot(light)) * 0.82)
    tone = base[0] * 0.299 + base[1] * 0.587 + base[2] * 0.114

    is_leaf = base[0] > max(base[1], base[2]) * 1.22
    if is_leaf:
        local = mix_color(base, (0.72, 0.08, 0.28), 0.34)
        highlight = (1.00, 0.50, 0.62)
        shadow = (0.22, 0.04, 0.13)
    else:
        local = mix_color(base, (0.26, 0.18, 0.12), 0.42)
        highlight = (0.72, 0.47, 0.25)
        shadow = (0.05, 0.08, 0.11)

    color = mix_color(local, highlight, max(0.0, value - 0.58) * 0.95)
    color = mix_color(color, shadow, max(0.0, 0.54 - value) * 0.72)

    stroke_variation = rng.uniform(-0.07, 0.10)
    saturation_push = rng.uniform(1.06, 1.34)
    gray = tone * (0.62 + value * 0.52)
    color = tuple(gray + (channel - gray) * saturation_push for channel in color)
    color = tuple(clamp(channel * (0.88 + value * 0.36) + stroke_variation, 0.035, 1.0) for channel in color)
    return color[0], color[1], color[2], rng.uniform(0.84, 1.0)


def make_underpaint_material() -> bpy.types.Material:
    material = bpy.data.materials.new("dark underpaint visible between brush strokes")
    material.diffuse_color = (0.075, 0.072, 0.058, 1.0)
    material.use_nodes = True
    principled = first_principled_node(material)
    if principled:
        principled.inputs["Base Color"].default_value = (0.075, 0.072, 0.058, 1.0)
        principled.inputs["Roughness"].default_value = 0.96
        principled.inputs["Metallic"].default_value = 0.0
    return material


def make_stroke_material() -> bpy.types.Material:
    material = bpy.data.materials.new("actual paint stroke vertex colors")
    material.diffuse_color = (0.80, 0.62, 0.32, 1.0)
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    principled = first_principled_node(material)
    if not principled:
        return material
    principled.inputs["Roughness"].default_value = 0.88
    principled.inputs["Metallic"].default_value = 0.0
    attribute = nodes.new(type="ShaderNodeAttribute")
    attribute.attribute_name = "brush_color"
    links.new(attribute.outputs["Color"], principled.inputs["Base Color"])
    if "Emission Color" in principled.inputs:
        links.new(attribute.outputs["Color"], principled.inputs["Emission Color"])
    if "Emission Strength" in principled.inputs:
        principled.inputs["Emission Strength"].default_value = 0.12
    return material


def cumulative_polygon_areas(mesh: bpy.types.Mesh) -> tuple[list[float], float]:
    cumulative: list[float] = []
    total = 0.0
    for polygon in mesh.polygons:
        if len(polygon.vertices) < 3:
            cumulative.append(total)
            continue
        total += max(0.000001, polygon.area)
        cumulative.append(total)
    return cumulative, total


def sample_polygon(mesh: bpy.types.Mesh, cumulative: list[float], total: float, rng: random.Random):
    pick = rng.random() * total
    index = min(len(cumulative) - 1, bisect.bisect_left(cumulative, pick))
    polygon = mesh.polygons[index]
    if len(polygon.vertices) < 3:
        return sample_polygon(mesh, cumulative, total, rng)
    return polygon


def barycentric_pair(rng: random.Random) -> tuple[float, float, float]:
    a = rng.random()
    b = rng.random()
    if a + b > 1.0:
        a = 1.0 - a
        b = 1.0 - b
    return 1.0 - a - b, a, b


def uv_for_sample(mesh: bpy.types.Mesh, polygon: bpy.types.MeshPolygon, weights):
    uv_layer = mesh.uv_layers.active
    if not uv_layer:
        return Vector((0.5, 0.5))
    uv = Vector((0.0, 0.0))
    loop_indices = list(polygon.loop_indices[:3])
    for weight, loop_index in zip(weights, loop_indices):
        uv += uv_layer.data[loop_index].uv * weight
    return uv


def base_color_for_sample(
    mesh: bpy.types.Mesh,
    polygon: bpy.types.MeshPolygon,
    weights,
    material_images,
    material_colors,
) -> tuple[float, float, float]:
    material_index = polygon.material_index
    image = material_images.get(material_index)
    sampled = sample_image(image, uv_for_sample(mesh, polygon, weights))
    if sampled:
        return sampled
    return material_colors.get(material_index, (0.52, 0.45, 0.30))


def build_brush_stroke_mesh(target: bpy.types.Object) -> bpy.types.Object:
    rng = random.Random(RANDOM_SEED)
    mesh = target.data
    world_matrix: Matrix = target.matrix_world.copy()
    normal_matrix = world_matrix.to_3x3()
    cumulative, total = cumulative_polygon_areas(mesh)

    material_images = {
        index: find_base_color_image(material)
        for index, material in enumerate(mesh.materials)
    }
    material_colors = {
        index: material_base_color(material)
        for index, material in enumerate(mesh.materials)
    }

    vertices: list[tuple[float, float, float]] = []
    faces: list[tuple[int, int, int, int]] = []
    colors: list[tuple[float, float, float, float]] = []

    up = Vector((0.0, 0.0, 1.0))
    for _ in range(STROKE_COUNT):
        polygon = sample_polygon(mesh, cumulative, total, rng)
        vertex_indices = list(polygon.vertices[:3])
        weights = barycentric_pair(rng)
        local_point = Vector((0.0, 0.0, 0.0))
        for weight, vertex_index in zip(weights, vertex_indices):
            local_point += mesh.vertices[vertex_index].co * weight

        normal = (normal_matrix @ polygon.normal).normalized()
        point = world_matrix @ local_point
        tangent = normal.cross(up)
        if tangent.length < 0.001:
            tangent = normal.cross(Vector((1.0, 0.0, 0.0)))
        tangent.normalize()
        bitangent = normal.cross(tangent).normalized()

        angle = rng.uniform(-0.95, 0.95)
        direction = (tangent * math.cos(angle) + bitangent * math.sin(angle)).normalized()
        side = normal.cross(direction).normalized()
        length = rng.uniform(0.20, 0.74)
        width = rng.uniform(0.035, 0.105)
        curve = side * rng.uniform(-0.08, 0.08)
        center = point + normal * 0.075
        base = base_color_for_sample(mesh, polygon, weights, material_images, material_colors)
        color = painted_color(base, normal, rng)

        start_index = len(vertices)
        for segment in range(4):
            t = segment / 3.0
            along = (t - 0.5) * length
            stroke_center = center + direction * along + curve * math.sin(t * math.pi)
            pressure = math.sin(t * math.pi)
            half_width = width * (0.26 + pressure * 0.74)
            vertices.append(tuple(stroke_center - side * half_width))
            vertices.append(tuple(stroke_center + side * half_width))
            colors.extend([color, color])

        for segment in range(3):
            a = start_index + segment * 2
            faces.append((a, a + 1, a + 3, a + 2))

    stroke_mesh = bpy.data.meshes.new("world tree actual brush stroke mesh")
    stroke_mesh.from_pydata(vertices, [], faces)
    stroke_mesh.update()
    color_attribute = stroke_mesh.color_attributes.new(
        name="brush_color",
        type="BYTE_COLOR",
        domain="CORNER",
    )
    for polygon in stroke_mesh.polygons:
        for loop_index in polygon.loop_indices:
            color_attribute.data[loop_index].color = colors[stroke_mesh.loops[loop_index].vertex_index]

    stroke_object = bpy.data.objects.new("PAINTERLY_SURFACE_BRUSH_STROKES", stroke_mesh)
    bpy.context.scene.collection.objects.link(stroke_object)
    stroke_object.data.materials.append(make_stroke_material())
    return stroke_object


def strip_to_underpaint(collection: bpy.types.Collection) -> None:
    material = make_underpaint_material()
    for obj in collection.all_objects:
        if obj.type != "MESH":
            continue
        obj.data.materials.clear()
        obj.data.materials.append(material)


def make_label(text: str, location: tuple[float, float, float]) -> None:
    curve = bpy.data.curves.new(text, type="FONT")
    curve.body = text
    curve.align_x = "CENTER"
    curve.align_y = "CENTER"
    curve.size = 1.15
    obj = bpy.data.objects.new(text, curve)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = (math.radians(67), 0.0, 0.0)


def mesh_scene_bounds() -> tuple[Vector, Vector]:
    mesh_objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if not mesh_objects:
        raise RuntimeError("No mesh objects to frame")

    bounds_min = Vector((math.inf, math.inf, math.inf))
    bounds_max = Vector((-math.inf, -math.inf, -math.inf))
    for obj in mesh_objects:
        for corner in obj.bound_box:
            world_corner = obj.matrix_world @ Vector(corner)
            bounds_min.x = min(bounds_min.x, world_corner.x)
            bounds_min.y = min(bounds_min.y, world_corner.y)
            bounds_min.z = min(bounds_min.z, world_corner.z)
            bounds_max.x = max(bounds_max.x, world_corner.x)
            bounds_max.y = max(bounds_max.y, world_corner.y)
            bounds_max.z = max(bounds_max.z, world_corner.z)
    return bounds_min, bounds_max


def look_at(obj: bpy.types.Object, target: Vector) -> None:
    direction = target - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def add_camera_and_lights() -> None:
    bounds_min, bounds_max = mesh_scene_bounds()
    center = (bounds_min + bounds_max) * 0.5
    size = bounds_max - bounds_min

    bpy.ops.object.light_add(type="AREA", location=(0, bounds_min.y - 28, bounds_max.z + 22))
    key = bpy.context.object
    key.name = "large soft painter light"
    key.data.energy = 1120
    key.data.size = 24

    bpy.ops.object.light_add(type="POINT", location=(bounds_min.x - 12, center.y + 14, bounds_max.z + 9))
    fill = bpy.context.object
    fill.name = "cool side fill"
    fill.data.energy = 220
    fill.data.color = (0.58, 0.72, 1.0)

    distance = max(size.x, size.y, size.z) * 1.8
    bpy.ops.object.camera_add(location=(center.x, bounds_min.y - distance, center.z + size.z * 0.2))
    camera = bpy.context.object
    look_at(camera, center)
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = max(size.z * 1.48, (size.x / (1800 / 1050)) * 1.32)
    camera.data.clip_end = distance * 4.0
    bpy.context.scene.camera = camera


def render_settings() -> None:
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 80
    scene.render.resolution_x = 1800
    scene.render.resolution_y = 1050
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "Medium High Contrast"
    scene.world = scene.world or bpy.data.worlds.new("World")
    scene.world.color = (0.14, 0.145, 0.15)


def main() -> None:
    if not SOURCE_GLB.exists():
        raise FileNotFoundError(SOURCE_GLB)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    clear_scene()
    normal = import_tree_copy("NORMAL_WORLD_TREE_GLB", NORMAL_X)
    painterly = import_tree_copy("PAINTERLY_WORLD_TREE_BRUSH_STROKES", PAINTERLY_X)
    bpy.context.view_layer.update()
    painterly_main_mesh = main_mesh_object(painterly)
    strokes = build_brush_stroke_mesh(painterly_main_mesh)
    strokes.name = "PAINTERLY ACTUAL SURFACE BRUSH STROKES"

    make_label("NORMAL GLB", (NORMAL_X, 15.0, -15.0))
    make_label("PAINTERLY BRUSH STROKES ON MESH", (PAINTERLY_X, 15.0, -15.0))
    bpy.context.view_layer.update()
    add_camera_and_lights()
    render_settings()

    bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT_BLEND))
    bpy.context.scene.render.filepath = str(OUTPUT_RENDER)
    bpy.ops.render.render(write_still=True)
    print(f"Wrote {OUTPUT_BLEND}")
    print(f"Wrote {OUTPUT_RENDER}")


if __name__ == "__main__":
    main()
