bl_info = {
    "name": "Merkin Scene Bridge",
    "author": "Merkin",
    "version": (0, 2, 2),
    "blender": (4, 0, 0),
    "location": "View3D > Sidebar > Merkin",
    "description": "Import Merkin scene packages and export transform/collision deltas.",
    "category": "Import-Export",
}

import json
import os
import math
from pathlib import Path

import bpy
from bpy.app.handlers import persistent
from bpy.props import BoolProperty, StringProperty
from mathutils import Euler, Matrix, Vector


PACKAGE_FILE_NAME = "merkin-scene-package.json"
DELTA_FILE_NAME = "merkin-scene-delta.json"
BLENDER_APP_MARKER = "apps/blender"
MIN_COLLISION_SIZE = 0.05
SELECTION_REDIRECT_ACTIVE = False


def game_to_blender_axis_matrix():
    return Matrix(
        (
            (1.0, 0.0, 0.0, 0.0),
            (0.0, 0.0, -1.0, 0.0),
            (0.0, 1.0, 0.0, 0.0),
            (0.0, 0.0, 0.0, 1.0),
        )
    )


AXIS_CONVERSION = game_to_blender_axis_matrix()
AXIS_CONVERSION_INVERSE = AXIS_CONVERSION.inverted()


def matrix_from_game_transform(position, rotation, scale):
    location_matrix = Matrix.Translation(Vector(position))
    rotation_matrix = Euler(rotation, "XYZ").to_matrix().to_4x4()
    scale_matrix = Matrix.Diagonal((scale[0], scale[1], scale[2], 1.0))
    return AXIS_CONVERSION @ (location_matrix @ rotation_matrix @ scale_matrix) @ AXIS_CONVERSION_INVERSE


def game_transform_from_matrix(matrix):
    game_matrix = AXIS_CONVERSION_INVERSE @ matrix @ AXIS_CONVERSION
    position, rotation, scale = game_matrix.decompose()
    return {
        "position": [round(position.x, 6), round(position.y, 6), round(position.z, 6)],
        "rotation": [round(value, 6) for value in rotation.to_euler("XYZ")],
        "scale": [round(scale.x, 6), round(scale.y, 6), round(scale.z, 6)],
    }


def set_merkin_props(obj, node):
    collision = node.get("collision") or {}
    obj["merkin_node_id"] = node.get("id", "")
    obj["merkin_node_name"] = node.get("name", "")
    obj["merkin_kind"] = node.get("kind", "")
    obj["merkin_parent_id"] = node.get("parentId") or ""
    obj["merkin_asset_url"] = node.get("assetUrl", "")
    obj["merkin_collision_intent"] = collision.get("intent", "")
    obj["merkin_collision_channel"] = collision.get("channel", "")
    obj["merkin_export_mode"] = "transform-only"
    obj["merkin_children_locked"] = True


def set_merkin_collision_proxy_props(obj, node):
    collision = node.get("collision") or {}
    obj["merkin_node_id"] = node.get("id", "")
    obj["merkin_node_name"] = node.get("name", "")
    obj["merkin_kind"] = "collision"
    obj["merkin_parent_id"] = node.get("id", "")
    obj["merkin_collision_shape"] = collision.get("shape", "")
    obj["merkin_collision_intent"] = collision.get("intent", "")
    obj["merkin_collision_channel"] = collision.get("channel", "")
    obj["merkin_collision_enabled"] = collision.get("enabled", True) is not False
    obj["merkin_collision_sensor"] = bool(collision.get("sensor", False))
    obj["merkin_collision_friction"] = float(collision.get("friction", 0.7) or 0.7)
    obj["merkin_collision_restitution"] = float(collision.get("restitution", 0.0) or 0.0)
    obj["merkin_collision_collider_url"] = collision.get("colliderUrl", "")
    obj["merkin_collision_metadata_url"] = collision.get("colliderMetadataUrl", "")
    obj["merkin_collision_source_asset_url"] = collision.get("sourceAssetUrl", "")
    obj["merkin_collision_triangle_budget"] = int(collision.get("triangleBudget", 0) or 0)
    obj["merkin_collision_triangle_count"] = int(collision.get("triangleCount", 0) or 0)
    obj["merkin_collision_vertex_count"] = int(collision.get("vertexCount", 0) or 0)
    obj["merkin_export_mode"] = "collision"


def set_transform_locks(obj, locked):
    obj.hide_select = False
    for index in range(3):
        obj.lock_location[index] = bool(locked)
        obj.lock_rotation[index] = bool(locked)
        obj.lock_scale[index] = bool(locked)


def lock_child_to_node_root(obj, root, child_kind):
    obj["merkin_node_id"] = root.get("merkin_node_id", "")
    obj["merkin_node_name"] = root.get("merkin_node_name", root.name)
    obj["merkin_node_root"] = root.name
    obj["merkin_child_kind"] = child_kind
    obj["merkin_linked_to_node_root"] = True
    set_transform_locks(obj, True)


def is_merkin_node_root(obj):
    return bool(obj and obj.get("merkin_export_mode") == "transform-only")


def find_merkin_node_root(obj):
    current = obj
    while current:
        if is_merkin_node_root(current):
            return current
        current = current.parent
    return None


def set_node_children_locked(root, locked):
    if not root:
        return 0

    count = 0
    for child in walk_descendants(root):
        if child.get("merkin_linked_to_node_root"):
            set_transform_locks(child, locked)
            count += 1
    root["merkin_children_locked"] = bool(locked)
    return count


@persistent
def merkin_selection_redirect_handler(scene, depsgraph=None):
    global SELECTION_REDIRECT_ACTIVE
    if SELECTION_REDIRECT_ACTIVE:
        return

    selected = list(bpy.context.selected_objects)
    roots = []
    child_selected = False
    for obj in selected:
        if not obj.get("merkin_linked_to_node_root"):
            continue
        root = find_merkin_node_root(obj)
        if root and root.get("merkin_children_locked", True):
            child_selected = True
            if root not in roots:
                roots.append(root)

    if not child_selected:
        return

    SELECTION_REDIRECT_ACTIVE = True
    try:
        for obj in selected:
            if obj.get("merkin_linked_to_node_root"):
                obj.select_set(False)
        for root in roots:
            root.select_set(True)
        if roots:
            bpy.context.view_layer.objects.active = roots[0]
    finally:
        SELECTION_REDIRECT_ACTIVE = False


def get_package_directory(package_path):
    return Path(package_path).resolve().parent


def find_repo_root_from_addon():
    current = Path(__file__).resolve()
    for parent in current.parents:
        if (parent / "apps" / "blender").exists() and (parent / "apps" / "game").exists():
            return parent
    return None


def find_repo_root_from_path(filepath=""):
    path_text = str(filepath or "").replace("\\", "/")
    marker_index = path_text.find(BLENDER_APP_MARKER)
    if marker_index < 0:
        return None

    repo_path = path_text[:marker_index].rstrip("/") or "/"
    candidate = Path(repo_path).resolve()
    if (candidate / "apps" / "blender").exists() and (candidate / "apps" / "game").exists():
        return candidate
    return None


def get_scene_packages_directory(filepath=""):
    repo_root = find_repo_root_from_path(filepath) or find_repo_root_from_addon()
    if not repo_root:
        return None

    scene_packages = repo_root / "apps" / "blender" / "scene-packages"
    scene_packages.mkdir(parents=True, exist_ok=True)
    return scene_packages


def find_latest_scene_package_manifest(scene_packages):
    if not scene_packages or not scene_packages.exists():
        return None

    manifests = [
        candidate
        for candidate in scene_packages.glob(f"*/{PACKAGE_FILE_NAME}")
        if candidate.is_file()
    ]
    if not manifests:
        return None
    return max(manifests, key=lambda candidate: candidate.stat().st_mtime)


def resolve_scene_package_manifest_path(filepath):
    package_path = Path(filepath).resolve()
    if package_path.is_dir():
        direct_manifest = package_path / PACKAGE_FILE_NAME
        if direct_manifest.exists():
            return direct_manifest

        latest_manifest = find_latest_scene_package_manifest(
            get_scene_packages_directory(filepath),
        )
        return latest_manifest or direct_manifest

    if package_path.name != PACKAGE_FILE_NAME and not package_path.exists():
        latest_manifest = find_latest_scene_package_manifest(
            get_scene_packages_directory(filepath),
        )
        if latest_manifest:
            return latest_manifest

    return package_path


def get_default_scene_package_browser_path():
    scene_packages = get_scene_packages_directory()
    if not scene_packages:
        return ""
    latest_manifest = find_latest_scene_package_manifest(scene_packages)
    return str(latest_manifest or scene_packages)


def is_scene_package_manifest(package):
    return (
        isinstance(package, dict)
        and package.get("schema") == "merkin.scenePackage.v1"
        and isinstance(package.get("nodes"), list)
    )


def clear_merkin_collection(collection_name):
    existing = bpy.data.collections.get(collection_name)
    if not existing:
        return

    def remove_collection_tree(collection):
        for child in list(collection.children):
            remove_collection_tree(child)
        for obj in list(collection.objects):
            bpy.data.objects.remove(obj, do_unlink=True)
        bpy.data.collections.remove(collection)

    remove_collection_tree(existing)


def link_object_to_collection(obj, collection):
    for current_collection in list(obj.users_collection):
        current_collection.objects.unlink(obj)
    collection.objects.link(obj)


def create_collection(name):
    collection = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(collection)
    return collection


def get_or_create_child_collection(parent, name):
    collection = parent.children.get(name)
    if collection:
        return collection

    collection = bpy.data.collections.new(name)
    parent.children.link(collection)
    return collection


def create_scene_collections(level_id):
    root = bpy.data.collections.get(f"Merkin Level - {level_id}") or create_collection(
        f"Merkin Level - {level_id}"
    )
    return {
        "root": root,
        "nodes": get_or_create_child_collection(root, "Node Roots"),
        "visuals": get_or_create_child_collection(root, "Visual Meshes"),
        "collisions": get_or_create_child_collection(root, "Collision Proxies"),
    }


def create_node_root(node, collection):
    empty = bpy.data.objects.new(node.get("name") or node.get("id") or "Merkin Node", None)
    empty.empty_display_type = "CUBE"
    empty.empty_display_size = 1.0
    empty.show_name = True
    empty.show_in_front = True
    set_merkin_props(empty, node)
    set_transform_locks(empty, False)
    collection.objects.link(empty)
    return empty


def number_arg(args, index, fallback):
    try:
        return float(args[index])
    except (IndexError, TypeError, ValueError):
        return float(fallback)


def int_arg(args, index, fallback):
    return max(3, int(round(number_arg(args, index, fallback))))


def parse_hex_color(value, fallback="#ffffff"):
    text = value if isinstance(value, str) and value else fallback
    text = text.strip()
    if text.startswith("#"):
        text = text[1:]
    if len(text) == 3:
        text = "".join(character * 2 for character in text)
    if len(text) != 6:
        text = fallback.lstrip("#")
    try:
        red = int(text[0:2], 16) / 255.0
        green = int(text[2:4], 16) / 255.0
        blue = int(text[4:6], 16) / 255.0
    except ValueError:
        return (1.0, 1.0, 1.0)
    return (red, green, blue)


def create_primitive_material(node):
    primitive = node.get("primitive") or {}
    material_data = node.get("material") or {}
    color = material_data.get("color") or primitive.get("color") or "#ffffff"
    opacity = float(material_data.get("opacity", primitive.get("opacity", 1.0)) or 1.0)
    transparent = bool(material_data.get("transparent", primitive.get("transparent", opacity < 0.999)))
    red, green, blue = parse_hex_color(color)

    material = bpy.data.materials.new(f"{node.get('name') or node.get('id') or 'Primitive'} Material")
    material.diffuse_color = (red, green, blue, opacity)
    material.use_nodes = True
    if transparent or opacity < 0.999:
        material.blend_method = "BLEND"
        if hasattr(material, "use_screen_refraction"):
            material.use_screen_refraction = True

    principled = material.node_tree.nodes.get("Principled BSDF")
    if principled:
        if "Base Color" in principled.inputs:
            principled.inputs["Base Color"].default_value = (red, green, blue, opacity)
        if "Alpha" in principled.inputs:
            principled.inputs["Alpha"].default_value = opacity
        if "Metallic" in principled.inputs:
            principled.inputs["Metallic"].default_value = float(
                material_data.get("metalness", primitive.get("metalness", 0.5)) or 0.0
            )
        if "Roughness" in principled.inputs:
            principled.inputs["Roughness"].default_value = float(
                material_data.get("roughness", primitive.get("roughness", 0.5)) or 0.5
            )

        emissive = material_data.get("emissive", primitive.get("emissive"))
        emissive_intensity = float(
            material_data.get(
                "emissiveIntensity",
                primitive.get("emissiveIntensity", 0.0),
            )
            or 0.0
        )
        if emissive and "Emission Color" in principled.inputs:
            er, eg, eb = parse_hex_color(emissive)
            principled.inputs["Emission Color"].default_value = (er, eg, eb, 1.0)
        if "Emission Strength" in principled.inputs:
            principled.inputs["Emission Strength"].default_value = emissive_intensity

    return material


def get_collision_material():
    material = bpy.data.materials.get("Merkin Collision Proxy Material")
    if material:
        return material

    material = bpy.data.materials.new("Merkin Collision Proxy Material")
    material.diffuse_color = (0.1, 0.65, 1.0, 0.22)
    material.use_nodes = True
    material.blend_method = "BLEND"

    principled = material.node_tree.nodes.get("Principled BSDF")
    if principled:
        if "Base Color" in principled.inputs:
            principled.inputs["Base Color"].default_value = (0.1, 0.65, 1.0, 0.22)
        if "Alpha" in principled.inputs:
            principled.inputs["Alpha"].default_value = 0.22
        if "Metallic" in principled.inputs:
            principled.inputs["Metallic"].default_value = 0.0
        if "Roughness" in principled.inputs:
            principled.inputs["Roughness"].default_value = 0.35

    return material


def create_polyhedron_mesh(name, vertices, faces, radius):
    mesh = bpy.data.meshes.new(name)
    normalized_vertices = []
    for vertex in vertices:
        vector = Vector(vertex)
        if vector.length > 0:
            vector.normalize()
        normalized_vertices.append((vector.x * radius, vector.y * radius, vector.z * radius))
    mesh.from_pydata(normalized_vertices, [], faces)
    mesh.update()
    return bpy.data.objects.new(name, mesh)


def create_octahedron_object(name, radius):
    vertices = [
        (radius, 0.0, 0.0),
        (-radius, 0.0, 0.0),
        (0.0, radius, 0.0),
        (0.0, -radius, 0.0),
        (0.0, 0.0, radius),
        (0.0, 0.0, -radius),
    ]
    faces = [
        (0, 2, 4),
        (2, 1, 4),
        (1, 3, 4),
        (3, 0, 4),
        (2, 0, 5),
        (1, 2, 5),
        (3, 1, 5),
        (0, 3, 5),
    ]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    return bpy.data.objects.new(name, mesh)


def create_tetrahedron_object(name, radius):
    vertices = [
        (1.0, 1.0, 1.0),
        (-1.0, -1.0, 1.0),
        (-1.0, 1.0, -1.0),
        (1.0, -1.0, -1.0),
    ]
    faces = [
        (0, 1, 2),
        (0, 3, 1),
        (0, 2, 3),
        (1, 3, 2),
    ]
    return create_polyhedron_mesh(name, vertices, faces, radius)


def create_icosahedron_object(name, radius):
    phi = (1.0 + math.sqrt(5.0)) / 2.0
    vertices = [
        (-1.0, phi, 0.0),
        (1.0, phi, 0.0),
        (-1.0, -phi, 0.0),
        (1.0, -phi, 0.0),
        (0.0, -1.0, phi),
        (0.0, 1.0, phi),
        (0.0, -1.0, -phi),
        (0.0, 1.0, -phi),
        (phi, 0.0, -1.0),
        (phi, 0.0, 1.0),
        (-phi, 0.0, -1.0),
        (-phi, 0.0, 1.0),
    ]
    faces = [
        (0, 11, 5),
        (0, 5, 1),
        (0, 1, 7),
        (0, 7, 10),
        (0, 10, 11),
        (1, 5, 9),
        (5, 11, 4),
        (11, 10, 2),
        (10, 7, 6),
        (7, 1, 8),
        (3, 9, 4),
        (3, 4, 2),
        (3, 2, 6),
        (3, 6, 8),
        (3, 8, 9),
        (4, 9, 5),
        (2, 4, 11),
        (6, 2, 10),
        (8, 6, 7),
        (9, 8, 1),
    ]
    return create_polyhedron_mesh(name, vertices, faces, radius)


def create_dodecahedron_object(name, radius):
    # A dodecahedron is the dual of an icosahedron. Build it from normalized
    # icosahedron face centers so Blender imports match the game primitive kind.
    phi = (1.0 + math.sqrt(5.0)) / 2.0
    ico_vertices = [
        Vector((-1.0, phi, 0.0)),
        Vector((1.0, phi, 0.0)),
        Vector((-1.0, -phi, 0.0)),
        Vector((1.0, -phi, 0.0)),
        Vector((0.0, -1.0, phi)),
        Vector((0.0, 1.0, phi)),
        Vector((0.0, -1.0, -phi)),
        Vector((0.0, 1.0, -phi)),
        Vector((phi, 0.0, -1.0)),
        Vector((phi, 0.0, 1.0)),
        Vector((-phi, 0.0, -1.0)),
        Vector((-phi, 0.0, 1.0)),
    ]
    ico_faces = [
        (0, 11, 5),
        (0, 5, 1),
        (0, 1, 7),
        (0, 7, 10),
        (0, 10, 11),
        (1, 5, 9),
        (5, 11, 4),
        (11, 10, 2),
        (10, 7, 6),
        (7, 1, 8),
        (3, 9, 4),
        (3, 4, 2),
        (3, 2, 6),
        (3, 6, 8),
        (3, 8, 9),
        (4, 9, 5),
        (2, 4, 11),
        (6, 2, 10),
        (8, 6, 7),
        (9, 8, 1),
    ]
    vertices = []
    for face in ico_faces:
        center = (ico_vertices[face[0]] + ico_vertices[face[1]] + ico_vertices[face[2]]) / 3.0
        center.normalize()
        vertices.append((center.x * radius, center.y * radius, center.z * radius))

    faces_by_vertex = [[] for _ in ico_vertices]
    for face_index, face in enumerate(ico_faces):
        for vertex_index in face:
            faces_by_vertex[vertex_index].append(face_index)

    faces = []
    for vertex_index, face_indices in enumerate(faces_by_vertex):
        normal = ico_vertices[vertex_index].normalized()
        center = sum(
            (Vector(vertices[index]) for index in face_indices),
            Vector((0.0, 0.0, 0.0)),
        ) / len(face_indices)
        tangent = normal.cross(Vector((0.0, 0.0, 1.0)))
        if tangent.length < 0.0001:
            tangent = normal.cross(Vector((0.0, 1.0, 0.0)))
        tangent.normalize()
        bitangent = normal.cross(tangent).normalized()
        ordered = sorted(
            face_indices,
            key=lambda index: math.atan2(
                (Vector(vertices[index]) - center).dot(bitangent),
                (Vector(vertices[index]) - center).dot(tangent),
            ),
        )
        faces.append(tuple(ordered))

    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    return bpy.data.objects.new(name, mesh)


def create_primitive_object(node, name):
    primitive = node.get("primitive") or {}
    args = primitive.get("args") or []
    geometry = primitive.get("geometry", "box")

    if geometry == "box":
        width = number_arg(args, 0, 1.0)
        height = number_arg(args, 1, 1.0)
        depth = number_arg(args, 2, 1.0)
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.0, 0.0, 0.0))
        child = bpy.context.object
        child.name = name
        child.scale = (width, depth, height)
        return child

    if geometry == "cylinder":
        radius_top = number_arg(args, 0, 0.5)
        radius_bottom = number_arg(args, 1, 0.5)
        height = number_arg(args, 2, 1.0)
        segments = int_arg(args, 3, 32)
        bpy.ops.mesh.primitive_cone_add(
            vertices=segments,
            radius1=radius_bottom,
            radius2=radius_top,
            depth=height,
            location=(0.0, 0.0, 0.0),
        )
        child = bpy.context.object
        child.name = name
        return child

    if geometry == "octahedron":
        return create_octahedron_object(name, number_arg(args, 0, 0.5))

    if geometry == "tetrahedron":
        return create_tetrahedron_object(name, number_arg(args, 0, 0.5))

    if geometry == "icosahedron":
        return create_icosahedron_object(name, number_arg(args, 0, 0.5))

    if geometry == "dodecahedron":
        return create_dodecahedron_object(name, number_arg(args, 0, 0.5))

    if geometry == "torus":
        radius = number_arg(args, 0, 0.5)
        tube = number_arg(args, 1, 0.2)
        radial_segments = int_arg(args, 2, 12)
        tubular_segments = int_arg(args, 3, 48)
        arc = number_arg(args, 4, math.pi * 2.0)
        bpy.ops.mesh.primitive_torus_add(
            major_segments=tubular_segments,
            minor_segments=radial_segments,
            major_radius=radius,
            minor_radius=tube,
            abso_major_rad=1.0,
            abso_minor_rad=0.5,
            generate_uvs=True,
            location=(0.0, 0.0, 0.0),
        )
        child = bpy.context.object
        child.name = name
        if arc < math.pi * 2.0 - 0.0001:
            child["merkin_partial_torus_arc"] = arc
        return child

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.0, 0.0, 0.0))
    child = bpy.context.object
    child.name = name
    return child


def apply_node_local_transform(root, node):
    root.matrix_local = matrix_from_game_transform(
        node.get("position", [0.0, 0.0, 0.0]),
        node.get("rotation", [0.0, 0.0, 0.0]),
        node.get("scale", [1.0, 1.0, 1.0]),
    )


def create_primitive_child(node, root, collection):
    child_name = f"{node.get('name', node.get('id', 'primitive'))} Mesh"
    child = create_primitive_object(node, child_name)
    child.data.materials.append(create_primitive_material(node))
    child.parent = root
    child.matrix_parent_inverse.identity()
    child.location = (0.0, 0.0, 0.0)
    child.rotation_euler = (0.0, 0.0, 0.0)
    if child.type == "MESH":
        child["merkin_primitive_geometry"] = (node.get("primitive") or {}).get("geometry", "box")
    child["merkin_export_mode"] = "ignore"
    lock_child_to_node_root(child, root, "visual")
    link_object_to_collection(child, collection)
    return child


def finite_number(value, fallback):
    try:
        number = float(value)
    except (TypeError, ValueError):
        return float(fallback)
    if not math.isfinite(number):
        return float(fallback)
    return number


def finite_vec3(value, fallback):
    if not isinstance(value, list) or len(value) != 3:
        return list(fallback)
    return [finite_number(value[index], fallback[index]) for index in range(3)]


def clamp_size(value):
    return max(MIN_COLLISION_SIZE, abs(finite_number(value, 1.0)))


def slugify_filename(value, fallback="collision"):
    text = str(value or fallback).strip().lower()
    output = []
    previous_dash = False
    for character in text:
        if character.isalnum():
            output.append(character)
            previous_dash = False
        elif not previous_dash:
            output.append("-")
            previous_dash = True
    return "".join(output).strip("-") or fallback


def safe_scale_vec3(value):
    scale = finite_vec3(value, [1.0, 1.0, 1.0])
    return [
        abs(component) if abs(component) > 0.0001 else 1.0
        for component in scale
    ]


def get_collision_world_size(node):
    collision = node.get("collision") or {}
    if isinstance(collision.get("size"), list):
        return [
            clamp_size(component)
            for component in finite_vec3(collision.get("size"), [1.0, 1.0, 1.0])
        ]

    primitive = node.get("primitive") or {}
    geometry = primitive.get("geometry")
    args = primitive.get("args") or []
    scale = safe_scale_vec3(node.get("scale", [1.0, 1.0, 1.0]))

    if geometry == "box":
        return [
            clamp_size(number_arg(args, 0, 1.0) * scale[0]),
            clamp_size(number_arg(args, 1, 1.0) * scale[1]),
            clamp_size(number_arg(args, 2, 1.0) * scale[2]),
        ]

    if geometry == "cylinder":
        radius = max(abs(number_arg(args, 0, 0.5)), abs(number_arg(args, 1, 0.5)))
        return [
            clamp_size(radius * 2.0 * scale[0]),
            clamp_size(number_arg(args, 2, 1.0) * scale[1]),
            clamp_size(radius * 2.0 * scale[2]),
        ]

    return [clamp_size(component) for component in scale]


def local_collision_size_from_game_size(world_size, node_scale):
    scale = safe_scale_vec3(node_scale)
    return [
        clamp_size(world_size[0] / scale[0]),
        clamp_size(world_size[1] / scale[1]),
        clamp_size(world_size[2] / scale[2]),
    ]


def set_collision_proxy_display(obj):
    obj.display_type = "WIRE"
    obj.show_wire = True
    obj.show_in_front = True
    if obj.type == "MESH":
        obj.data.materials.append(get_collision_material())


def resolve_package_child_path(package_directory, package_path):
    if not package_path:
        return None
    candidate = (package_directory / package_path).resolve()
    if candidate.exists():
        return candidate
    return None


def import_trimesh_collision_proxy_child(node, root, collection, package_directory):
    collision = node.get("collision") or {}
    name = f"{node.get('name', node.get('id', 'node'))} Collision"
    proxy_root = bpy.data.objects.new(name, None)
    proxy_root.empty_display_type = "CUBE"
    proxy_root.empty_display_size = 1.0
    proxy_root.parent = root
    proxy_root.matrix_parent_inverse.identity()
    set_merkin_collision_proxy_props(proxy_root, node)
    lock_child_to_node_root(proxy_root, root, "collision")
    collection.objects.link(proxy_root)

    collider_path = resolve_package_child_path(
        package_directory,
        collision.get("colliderPackagePath", ""),
    )

    if not collider_path:
        return [proxy_root]

    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(collider_path))
    imported = [obj for obj in bpy.data.objects if obj not in before]
    mesh_index = 0
    node_index = 0

    for obj in imported:
        if obj.type == "MESH":
            mesh_index += 1
            obj.name = f"{name} Mesh" if mesh_index == 1 else f"{name} Mesh {mesh_index:02d}"
            obj.data.name = f"{obj.name} Data"
            set_collision_proxy_display(obj)
        else:
            node_index += 1
            obj.name = f"{name} Node" if node_index == 1 else f"{name} Node {node_index:02d}"

        obj["merkin_export_mode"] = "ignore"
        if obj.parent is None:
            obj.parent = proxy_root
            obj.matrix_parent_inverse.identity()
        lock_child_to_node_root(obj, root, "collision-mesh")
        link_object_to_collection(obj, collection)

    return [proxy_root, *imported]


def create_collision_proxy_child(node, root, collection, package_directory=None):
    collision = node.get("collision") or {}
    shape = collision.get("shape")
    if collision.get("enabled") is False or collision.get("intent") == "none":
        return None
    if shape == "trimesh":
        return import_trimesh_collision_proxy_child(
            node,
            root,
            collection,
            package_directory or Path("."),
        )
    if shape not in {"cuboid", "cylinder"}:
        return None

    local_size = local_collision_size_from_game_size(
        get_collision_world_size(node),
        node.get("scale", [1.0, 1.0, 1.0]),
    )
    name = f"{node.get('name', node.get('id', 'node'))} Collision"

    if shape == "cylinder":
        radius = max(local_size[0], local_size[2]) / 2.0
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=32,
            radius=radius,
            depth=local_size[1],
            location=(0.0, 0.0, 0.0),
        )
        child = bpy.context.object
        child.scale.x = max(
            local_size[0] / max(radius * 2.0, MIN_COLLISION_SIZE),
            MIN_COLLISION_SIZE,
        )
        child.scale.y = max(
            local_size[2] / max(radius * 2.0, MIN_COLLISION_SIZE),
            MIN_COLLISION_SIZE,
        )
    else:
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.0, 0.0, 0.0))
        child = bpy.context.object
        child.scale = (local_size[0], local_size[2], local_size[1])

    child.name = name
    set_collision_proxy_display(child)
    child.parent = root
    child.matrix_parent_inverse.identity()
    child.location = (0.0, 0.0, 0.0)
    child.rotation_euler = (0.0, 0.0, 0.0)
    set_merkin_collision_proxy_props(child, node)
    lock_child_to_node_root(child, root, "collision")
    link_object_to_collection(child, collection)
    return child


def get_object_collection(obj):
    if obj and obj.users_collection:
        return obj.users_collection[0]
    return bpy.context.scene.collection


def build_default_collision_node_from_object(obj):
    transform = game_transform_from_matrix(obj.matrix_local)
    return {
        "id": obj.get("merkin_node_id", ""),
        "name": obj.get("merkin_node_name", obj.name),
        "scale": transform.get("scale", [1.0, 1.0, 1.0]),
        "collision": {
            "shape": "cuboid",
            "intent": obj.get("merkin_collision_intent", "blocker") or "blocker",
            "channel": obj.get("merkin_collision_channel", "worldStatic") or "worldStatic",
            "enabled": True,
            "size": [
                clamp_size(component)
                for component in transform.get("scale", [1.0, 1.0, 1.0])
            ],
            "friction": 0.7,
            "restitution": 0.0,
            "sensor": False,
            "colliderUrl": "",
            "colliderMetadataUrl": "",
            "sourceAssetUrl": obj.get("merkin_asset_url", ""),
        },
    }


def get_object_local_dimensions(obj):
    if not obj or not getattr(obj, "bound_box", None):
        return [1.0, 1.0, 1.0]

    points = [Vector(point) for point in obj.bound_box]
    minimum = Vector(
        (
            min(point.x for point in points),
            min(point.y for point in points),
            min(point.z for point in points),
        )
    )
    maximum = Vector(
        (
            max(point.x for point in points),
            max(point.y for point in points),
            max(point.z for point in points),
        )
    )
    size = maximum - minimum
    return [
        clamp_size(size.x * abs(obj.scale.x)),
        clamp_size(size.y * abs(obj.scale.y)),
        clamp_size(size.z * abs(obj.scale.z)),
    ]


def walk_descendants(obj):
    for child in obj.children:
        yield child
        yield from walk_descendants(child)


def get_collision_owner_root(obj):
    current = obj
    while current and current.parent:
        if current.parent.get("merkin_node_id") == obj.get("merkin_node_id"):
            return current.parent
        current = current.parent
    return obj.parent


def export_trimesh_collision_package(obj, package_directory, node_id):
    mesh_sources = [
        candidate
        for candidate in [obj, *walk_descendants(obj)]
        if candidate.type == "MESH"
    ]
    if not mesh_sources:
        return ""

    collision_directory = package_directory / "collision-delta"
    collision_directory.mkdir(parents=True, exist_ok=True)
    output_path = collision_directory / f"{slugify_filename(node_id)}.collider.glb"

    owner_root = get_collision_owner_root(obj)
    basis = owner_root.matrix_world.inverted() if owner_root else Matrix.Identity(4)
    duplicates = []
    previous_active = bpy.context.view_layer.objects.active
    previous_selected = list(bpy.context.selected_objects)

    try:
        bpy.ops.object.select_all(action="DESELECT")
        for source in mesh_sources:
            duplicate = bpy.data.objects.new(source.name, source.data.copy())
            duplicate.matrix_world = basis @ source.matrix_world
            bpy.context.scene.collection.objects.link(duplicate)
            duplicate.select_set(True)
            duplicates.append(duplicate)

        if duplicates:
            bpy.context.view_layer.objects.active = duplicates[0]
        bpy.ops.export_scene.gltf(
            filepath=str(output_path),
            export_format="GLB",
            use_selection=True,
        )
    finally:
        bpy.ops.object.select_all(action="DESELECT")
        for duplicate in duplicates:
            mesh = duplicate.data
            bpy.data.objects.remove(duplicate, do_unlink=True)
            if mesh and mesh.users == 0:
                bpy.data.meshes.remove(mesh)
        for selected in previous_selected:
            if selected.name in bpy.data.objects:
                selected.select_set(True)
        if previous_active and previous_active.name in bpy.data.objects:
            bpy.context.view_layer.objects.active = previous_active

    return output_path.relative_to(package_directory).as_posix()


def import_asset_child(node, root, collection, package_directory):
    asset_path = node.get("assetPackagePath") or ""
    if not asset_path:
        return []

    absolute_asset_path = (package_directory / asset_path).resolve()
    if not absolute_asset_path.exists():
        return []

    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(absolute_asset_path))
    imported = [obj for obj in bpy.data.objects if obj not in before]
    base_name = node.get("name") or node.get("id") or absolute_asset_path.stem
    mesh_index = 0
    node_index = 0

    for obj in imported:
        if obj.type == "MESH":
            mesh_index += 1
            obj.name = f"{base_name} Mesh" if mesh_index == 1 else f"{base_name} Mesh {mesh_index:02d}"
            obj.data.name = f"{obj.name} Data"
        elif obj.type != "ARMATURE":
            node_index += 1
            obj.name = f"{base_name} Imported Node" if node_index == 1 else f"{base_name} Imported Node {node_index:02d}"

        if obj.parent is None:
            obj.parent = root
            obj.matrix_parent_inverse.identity()
        obj["merkin_export_mode"] = "ignore"
        lock_child_to_node_root(obj, root, "visual")
        link_object_to_collection(obj, collection)

    return imported


class MERKIN_OT_import_scene_package(bpy.types.Operator):
    bl_idname = "merkin.import_scene_package"
    bl_label = "Import Merkin Scene Package"
    bl_options = {"REGISTER", "UNDO"}

    filepath: StringProperty(
        name="Merkin Scene Package Manifest",
        subtype="FILE_PATH",
        default="",
    )
    filter_glob: StringProperty(
        default=PACKAGE_FILE_NAME,
        options={"HIDDEN"},
    )
    clear_existing: BoolProperty(
        name="Clear Existing Merkin Collection",
        default=True,
    )

    def execute(self, context):
        package_path = resolve_scene_package_manifest_path(self.filepath)
        if not package_path.exists():
            self.report({"ERROR"}, f"Package file not found: {package_path}")
            return {"CANCELLED"}

        with package_path.open("r", encoding="utf-8") as handle:
            package = json.load(handle)
        if not is_scene_package_manifest(package):
            self.report(
                {"ERROR"},
                f"Select the whole-scene manifest named {PACKAGE_FILE_NAME}, not an individual asset file.",
            )
            return {"CANCELLED"}

        level_id = package.get("levelId", "level")
        collection_name = f"Merkin Level - {level_id}"
        if self.clear_existing:
            clear_merkin_collection(collection_name)

        collections = create_scene_collections(level_id)
        package_directory = get_package_directory(package_path)
        nodes = package.get("nodes", [])
        roots_by_id = {}

        for node in nodes:
            root = create_node_root(node, collections["nodes"])
            roots_by_id[node.get("id")] = root

            kind = node.get("kind")
            if kind == "asset":
                import_asset_child(
                    node,
                    root,
                    collections["visuals"],
                    package_directory,
                )
            elif kind == "primitive":
                create_primitive_child(node, root, collections["visuals"])
            create_collision_proxy_child(
                node,
                root,
                collections["collisions"],
                package_directory,
            )

        for node in nodes:
            parent_id = node.get("parentId")
            if not parent_id:
                continue
            root = roots_by_id.get(node.get("id"))
            parent = roots_by_id.get(parent_id)
            if root and parent:
                root.parent = parent
                root.matrix_parent_inverse.identity()

        for node in nodes:
            root = roots_by_id.get(node.get("id"))
            if root:
                apply_node_local_transform(root, node)

        context.scene["merkin_scene_package_path"] = str(package_path)
        context.scene["merkin_level_id"] = level_id
        self.report({"INFO"}, f"Imported Merkin scene package: {level_id}")
        return {"FINISHED"}

    def invoke(self, context, event):
        self.filepath = self.filepath or get_default_scene_package_browser_path()
        context.window_manager.fileselect_add(self)
        return {"RUNNING_MODAL"}


class MERKIN_OT_export_scene_delta(bpy.types.Operator):
    bl_idname = "merkin.export_scene_delta"
    bl_label = "Export Merkin Scene Delta"
    bl_options = {"REGISTER"}

    filepath: StringProperty(
        name="Delta Output",
        subtype="FILE_PATH",
        default="",
    )

    def execute(self, context):
        package_path = context.scene.get("merkin_scene_package_path", "")
        if not package_path:
            self.report({"ERROR"}, "No Merkin package path is stored on this scene.")
            return {"CANCELLED"}

        package_path = str(Path(package_path).resolve())
        output_path = (
            Path(self.filepath).resolve()
            if self.filepath
            else Path(package_path).with_name(DELTA_FILE_NAME)
        )

        changes_by_node_id = {}
        for obj in bpy.data.objects:
            node_id = obj.get("merkin_node_id")
            export_mode = obj.get("merkin_export_mode", "transform-only")
            if not node_id or export_mode == "ignore":
                continue

            change = changes_by_node_id.setdefault(
                node_id,
                {
                    "nodeId": node_id,
                    "name": obj.get("merkin_node_name", obj.name),
                    "exportMode": export_mode,
                },
            )

            if export_mode == "collision":
                shape = obj.get("merkin_collision_shape", "")
                if shape in {"cuboid", "cylinder", "trimesh"}:
                    owner = obj.parent
                    collision = {
                        "shape": shape,
                        "intent": obj.get("merkin_collision_intent", ""),
                        "channel": obj.get("merkin_collision_channel", ""),
                        "enabled": bool(obj.get("merkin_collision_enabled", True)),
                        "sensor": bool(obj.get("merkin_collision_sensor", False)),
                        "friction": round(
                            float(obj.get("merkin_collision_friction", 0.7) or 0.7),
                            6,
                        ),
                        "restitution": round(
                            float(
                                obj.get("merkin_collision_restitution", 0.0) or 0.0
                            ),
                            6,
                        ),
                    }
                    if shape in {"cuboid", "cylinder"}:
                        owner_scale = (
                            game_transform_from_matrix(owner.matrix_local)["scale"]
                            if owner
                            else [1.0, 1.0, 1.0]
                        )
                        dimensions = get_object_local_dimensions(obj)
                        collision["size"] = [
                            round(clamp_size(dimensions[0] * abs(owner_scale[0])), 6),
                            round(clamp_size(dimensions[2] * abs(owner_scale[1])), 6),
                            round(clamp_size(dimensions[1] * abs(owner_scale[2])), 6),
                        ]
                    if shape == "trimesh":
                        collision["colliderUrl"] = obj.get("merkin_collision_collider_url", "")
                        collision["colliderMetadataUrl"] = obj.get("merkin_collision_metadata_url", "")
                        collision["sourceAssetUrl"] = obj.get("merkin_collision_source_asset_url", "")
                        collider_package_path = export_trimesh_collision_package(
                            obj,
                            output_path.parent,
                            node_id,
                        )
                        if collider_package_path:
                            collision["colliderPackagePath"] = collider_package_path
                        triangle_budget = int(obj.get("merkin_collision_triangle_budget", 0) or 0)
                        triangle_count = int(obj.get("merkin_collision_triangle_count", 0) or 0)
                        vertex_count = int(obj.get("merkin_collision_vertex_count", 0) or 0)
                        if triangle_budget > 0:
                            collision["triangleBudget"] = triangle_budget
                        if triangle_count > 0:
                            collision["triangleCount"] = triangle_count
                        if vertex_count > 0:
                            collision["vertexCount"] = vertex_count

                    change["collision"] = collision
                    change["exportMode"] = (
                        "transform-and-collision"
                        if "position" in change
                        else "collision"
                    )
                continue

            transform = game_transform_from_matrix(obj.matrix_local)
            change.update(transform)
            change["exportMode"] = (
                "transform-and-collision" if "collision" in change else export_mode
            )

        output = {
            "schema": "merkin.sceneDelta.v1",
            "levelId": context.scene.get("merkin_level_id", ""),
            "sourcePackagePath": package_path,
            "changes": sorted(changes_by_node_id.values(), key=lambda item: item["nodeId"]),
        }
        output_path.write_text(json.dumps(output, indent=2), encoding="utf-8")
        self.report({"INFO"}, f"Exported Merkin scene delta: {output_path}")
        return {"FINISHED"}

    def invoke(self, context, event):
        package_path = context.scene.get("merkin_scene_package_path", "")
        if package_path:
            self.filepath = str(Path(package_path).with_name(DELTA_FILE_NAME))
        context.window_manager.fileselect_add(self)
        return {"RUNNING_MODAL"}


class MERKIN_OT_add_collision_proxy(bpy.types.Operator):
    bl_idname = "merkin.add_collision_proxy"
    bl_label = "Add Collision Proxy"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        selected = context.object
        if not selected or not selected.get("merkin_node_id"):
            self.report({"ERROR"}, "Select a Merkin node or collision proxy first.")
            return {"CANCELLED"}

        owner = find_merkin_node_root(selected)
        if not owner or not owner.get("merkin_node_id"):
            self.report({"ERROR"}, "Could not resolve the selected Merkin node root.")
            return {"CANCELLED"}

        node = build_default_collision_node_from_object(owner)
        proxy = create_collision_proxy_child(node, owner, get_object_collection(owner))
        if not proxy:
            self.report({"ERROR"}, "Could not create collision proxy.")
            return {"CANCELLED"}

        context.view_layer.objects.active = owner
        owner.select_set(True)
        self.report({"INFO"}, f"Added collision proxy for {node.get('id')}")
        return {"FINISHED"}


class MERKIN_OT_unlock_node_children(bpy.types.Operator):
    bl_idname = "merkin.unlock_node_children"
    bl_label = "Unlock Selected Node Children"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        root = find_merkin_node_root(context.object)
        if not root:
            self.report({"ERROR"}, "Select a Merkin node root or linked child first.")
            return {"CANCELLED"}

        count = set_node_children_locked(root, False)
        self.report({"INFO"}, f"Unlocked {count} linked child object(s) for {root.name}.")
        return {"FINISHED"}


class MERKIN_OT_lock_node_children(bpy.types.Operator):
    bl_idname = "merkin.lock_node_children"
    bl_label = "Lock Selected Node Children"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        root = find_merkin_node_root(context.object)
        if not root:
            self.report({"ERROR"}, "Select a Merkin node root or linked child first.")
            return {"CANCELLED"}

        count = set_node_children_locked(root, True)
        self.report({"INFO"}, f"Locked {count} linked child object(s) to {root.name}.")
        return {"FINISHED"}


class MERKIN_PT_scene_bridge_panel(bpy.types.Panel):
    bl_label = "Merkin Scene Bridge"
    bl_idname = "MERKIN_PT_scene_bridge_panel"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "Merkin"

    def draw(self, context):
        layout = self.layout
        package_path = context.scene.get("merkin_scene_package_path", "")
        level_id = context.scene.get("merkin_level_id", "")

        layout.operator(MERKIN_OT_import_scene_package.bl_idname, icon="IMPORT")
        layout.operator(MERKIN_OT_export_scene_delta.bl_idname, icon="EXPORT")
        layout.operator(MERKIN_OT_add_collision_proxy.bl_idname, icon="MOD_PHYSICS")
        layout.operator(MERKIN_OT_unlock_node_children.bl_idname, icon="UNLOCKED")
        layout.operator(MERKIN_OT_lock_node_children.bl_idname, icon="LOCKED")
        layout.label(text=f"Import file: {PACKAGE_FILE_NAME}")

        if level_id:
            layout.label(text=f"Level: {level_id}")
        if package_path:
            layout.label(text=f"Package: {os.path.basename(package_path)}")

        obj = context.object
        if obj and obj.get("merkin_node_id"):
            box = layout.box()
            box.label(text="Selected Merkin Node")
            box.label(text=f"ID: {obj.get('merkin_node_id')}")
            box.label(text=f"Kind: {obj.get('merkin_kind', '')}")
            box.prop(obj, '["merkin_export_mode"]', text="Export Mode")
            if obj.get("merkin_export_mode") == "collision":
                box.prop(obj, '["merkin_collision_shape"]', text="Shape")
                box.prop(obj, '["merkin_collision_intent"]', text="Intent")
                box.prop(obj, '["merkin_collision_channel"]', text="Channel")
                box.prop(obj, '["merkin_collision_enabled"]', text="Enabled")
                box.prop(obj, '["merkin_collision_sensor"]', text="Sensor")
                box.prop(obj, '["merkin_collision_friction"]', text="Friction")
                box.prop(obj, '["merkin_collision_restitution"]', text="Restitution")
                if obj.get("merkin_collision_shape") == "trimesh":
                    box.prop(obj, '["merkin_collision_collider_url"]', text="Collider URL")
                    box.prop(obj, '["merkin_collision_metadata_url"]', text="Metadata URL")
                    box.prop(obj, '["merkin_collision_source_asset_url"]', text="Source URL")
                    box.prop(obj, '["merkin_collision_triangle_budget"]', text="Triangle Budget")
                    box.prop(obj, '["merkin_collision_triangle_count"]', text="Triangle Count")
                    box.prop(obj, '["merkin_collision_vertex_count"]', text="Vertex Count")


classes = (
    MERKIN_OT_import_scene_package,
    MERKIN_OT_export_scene_delta,
    MERKIN_OT_add_collision_proxy,
    MERKIN_OT_unlock_node_children,
    MERKIN_OT_lock_node_children,
    MERKIN_PT_scene_bridge_panel,
)


def register():
    for cls in classes:
        bpy.utils.register_class(cls)
    if merkin_selection_redirect_handler not in bpy.app.handlers.depsgraph_update_post:
        bpy.app.handlers.depsgraph_update_post.append(merkin_selection_redirect_handler)


def unregister():
    if merkin_selection_redirect_handler in bpy.app.handlers.depsgraph_update_post:
        bpy.app.handlers.depsgraph_update_post.remove(merkin_selection_redirect_handler)
    for cls in reversed(classes):
        bpy.utils.unregister_class(cls)


if __name__ == "__main__":
    register()
