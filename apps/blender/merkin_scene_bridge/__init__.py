bl_info = {
    "name": "Merkin Scene Bridge",
    "author": "Merkin",
    "version": (0, 1, 0),
    "blender": (5, 0, 0),
    "location": "View3D > Sidebar > Merkin",
    "description": "Import Merkin scene packages and export transform deltas.",
    "category": "Import-Export",
}

import json
import os
import math
from pathlib import Path

import bpy
from bpy.props import BoolProperty, StringProperty
from mathutils import Euler, Matrix, Vector


PACKAGE_FILE_NAME = "merkin-scene-package.json"
DELTA_FILE_NAME = "merkin-scene-delta.json"
BLENDER_APP_MARKER = "apps/blender"


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

    for obj in list(existing.objects):
        bpy.data.objects.remove(obj, do_unlink=True)

    for child in list(existing.children):
        for obj in list(child.objects):
            bpy.data.objects.remove(obj, do_unlink=True)
        bpy.data.collections.remove(child)

    bpy.data.collections.remove(existing)


def link_object_to_collection(obj, collection):
    for current_collection in list(obj.users_collection):
        current_collection.objects.unlink(obj)
    collection.objects.link(obj)


def create_collection(name):
    collection = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(collection)
    return collection


def create_node_root(node, collection):
    empty = bpy.data.objects.new(node.get("name") or node.get("id") or "Merkin Node", None)
    empty.empty_display_type = "PLAIN_AXES"
    empty.empty_display_size = 0.6
    set_merkin_props(empty, node)
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
    link_object_to_collection(child, collection)
    return child


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

        collection = bpy.data.collections.get(collection_name) or create_collection(collection_name)
        package_directory = get_package_directory(package_path)
        nodes = package.get("nodes", [])
        roots_by_id = {}

        for node in nodes:
            root = create_node_root(node, collection)
            roots_by_id[node.get("id")] = root

            kind = node.get("kind")
            if kind == "asset":
                import_asset_child(node, root, collection, package_directory)
            elif kind == "primitive":
                create_primitive_child(node, root, collection)

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
        output_path = Path(self.filepath).resolve() if self.filepath else Path(package_path).with_name(DELTA_FILE_NAME)

        changes = []
        for obj in bpy.data.objects:
            node_id = obj.get("merkin_node_id")
            export_mode = obj.get("merkin_export_mode", "transform-only")
            if not node_id or export_mode == "ignore":
                continue

            transform = game_transform_from_matrix(obj.matrix_local)
            changes.append(
                {
                    "nodeId": node_id,
                    "name": obj.get("merkin_node_name", obj.name),
                    "exportMode": export_mode,
                    **transform,
                }
            )

        output = {
            "schema": "merkin.sceneDelta.v1",
            "levelId": context.scene.get("merkin_level_id", ""),
            "sourcePackagePath": package_path,
            "changes": sorted(changes, key=lambda item: item["nodeId"]),
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


classes = (
    MERKIN_OT_import_scene_package,
    MERKIN_OT_export_scene_delta,
    MERKIN_PT_scene_bridge_panel,
)


def register():
    for cls in classes:
        bpy.utils.register_class(cls)


def unregister():
    for cls in reversed(classes):
        bpy.utils.unregister_class(cls)


if __name__ == "__main__":
    register()
