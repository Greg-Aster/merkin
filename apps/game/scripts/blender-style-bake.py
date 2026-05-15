#!/usr/bin/env python3
"""Headless Blender backend for Merkin style-baked runtime GLBs."""

import argparse
import hashlib
import json
import math
import os
import random
import sys
from datetime import datetime, timezone
from pathlib import Path

try:
    import bpy
    from mathutils import Vector
except ImportError as exc:  # pragma: no cover - only Blender provides bpy.
    raise SystemExit(
        "This script must be run by Blender: blender --background --python "
        "apps/game/scripts/blender-style-bake.py -- --input <source.glb> --output <styled.glb>"
    ) from exc


GENERATOR = "Merkin Blender headless geometry style bake"
VALID_TIERS = {"preview", "runtime", "hero"}


def parse_args(argv):
    if "--" in argv:
        argv = argv[argv.index("--") + 1 :]

    parser = argparse.ArgumentParser(description="Bake stylized runtime GLBs in headless Blender.")
    parser.add_argument("--input", required=True, help="Source GLB/GLTF path.")
    parser.add_argument("--output", required=True, help="Output GLB path.")
    parser.add_argument("--metadata-output", default="", help="Output metadata JSON path.")
    parser.add_argument("--profile-id", default="")
    parser.add_argument("--style-profile-name", default="")
    parser.add_argument("--texture-size", type=int, default=512)
    parser.add_argument("--ao-strength", type=float, default=0.8)
    parser.add_argument("--cavity-strength", type=float, default=0.65)
    parser.add_argument("--curvature-strength", type=float, default=0.45)
    parser.add_argument("--line-strength", type=float, default=0.35)
    parser.add_argument("--brush-strength", type=float, default=0.25)
    parser.add_argument("--geometry-simplification", type=float, default=0.0)
    parser.add_argument("--output-tier", default="runtime", choices=sorted(VALID_TIERS))
    parser.add_argument("--bevel-cleanup", action="store_true")
    parser.add_argument("--weighted-normal-cleanup", action="store_true", default=True)
    parser.add_argument("--no-weighted-normal-cleanup", dest="weighted_normal_cleanup", action="store_false")
    parser.add_argument("--line-geometry", action="store_true")
    parser.add_argument("--source-asset-url", default="")
    parser.add_argument("--asset-url", default="")
    parser.add_argument("--metadata-url", default="")
    parser.add_argument("--node-id", default="")
    parser.add_argument("--level-id", default="")
    return parser.parse_args(argv)


def clamp(value, low, high):
    return min(high, max(low, value))


def normalize_settings(args):
    texture_size = int(clamp(round(args.texture_size), 32, 2048))
    if args.output_tier == "preview":
        texture_size = min(texture_size, 512)
    elif args.output_tier == "runtime":
        texture_size = min(texture_size, 1024)

    profile_id = (args.profile_id or args.style_profile_name or "painterly-storybook").strip()
    return {
        "profileId": profile_id or "painterly-storybook",
        "textureSize": texture_size,
        "aoStrength": clamp(float(args.ao_strength), 0.0, 2.0),
        "cavityStrength": clamp(float(args.cavity_strength), 0.0, 2.0),
        "curvatureStrength": clamp(float(args.curvature_strength), 0.0, 2.0),
        "lineStrength": clamp(float(args.line_strength), 0.0, 1.0),
        "brushStrength": clamp(float(args.brush_strength), 0.0, 1.0),
        "geometrySimplification": clamp(float(args.geometry_simplification), 0.0, 0.95),
        "outputTier": args.output_tier,
        "bevelCleanup": bool(args.bevel_cleanup),
        "weightedNormalCleanup": bool(args.weighted_normal_cleanup),
        "lineGeometry": bool(args.line_geometry),
    }


def source_fingerprint(path):
    hasher = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def stable_seed(*parts):
    digest = hashlib.sha256("|".join(str(part) for part in parts).encode("utf8")).digest()
    return int.from_bytes(digest[:8], "big")


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    for collection in (
        bpy.data.meshes,
        bpy.data.materials,
        bpy.data.images,
        bpy.data.textures,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for item in list(collection):
            if item.users == 0:
                collection.remove(item)


def import_model(input_path):
    clear_scene()
    ext = Path(input_path).suffix.lower()
    if ext not in {".glb", ".gltf"}:
        raise RuntimeError("Only .glb and .gltf inputs are supported.")
    bpy.ops.import_scene.gltf(filepath=str(input_path))
    mesh_objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if not mesh_objects:
        raise RuntimeError("Input model has no mesh objects to style bake.")
    return mesh_objects


def object_bounds(obj):
    corners = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    mins = [min(corner[index] for corner in corners) for index in range(3)]
    maxs = [max(corner[index] for corner in corners) for index in range(3)]
    size = [maxs[index] - mins[index] for index in range(3)]
    return {
        "min": mins,
        "max": maxs,
        "size": size,
        "maxDimension": max(size) if size else 0.0,
    }


def gather_geometry_stats(mesh_objects):
    bounds = [object_bounds(obj) for obj in mesh_objects]
    max_dimension = max((item["maxDimension"] for item in bounds), default=1.0) or 1.0
    vertex_count = sum(len(obj.data.vertices) for obj in mesh_objects)
    triangle_count = sum(sum(max(0, len(poly.vertices) - 2) for poly in obj.data.polygons) for obj in mesh_objects)
    return {
        "meshObjectCount": len(mesh_objects),
        "vertexCount": vertex_count,
        "triangleCount": triangle_count,
        "maxDimension": max_dimension,
    }


def ensure_uvs(obj):
    if obj.data.uv_layers and len(obj.data.uv_layers) > 0:
        return False

    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    try:
        bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.02)
    except Exception:
        bpy.ops.uv.unwrap(method="ANGLE_BASED", margin=0.02)
    bpy.ops.object.mode_set(mode="OBJECT")
    return True


def apply_modifier(obj, modifier):
    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.modifier_apply(modifier=modifier.name)


def apply_geometry_cleanup(mesh_objects, settings):
    changed = {
        "simplifiedObjects": [],
        "beveledObjects": [],
        "weightedNormalObjects": [],
    }
    simplify_amount = settings["geometrySimplification"]

    for obj in mesh_objects:
        max_dimension = object_bounds(obj)["maxDimension"] or 1.0
        if simplify_amount > 0:
            modifier = obj.modifiers.new("merkin_style_simplify", "DECIMATE")
            modifier.ratio = clamp(1.0 - simplify_amount, 0.05, 1.0)
            apply_modifier(obj, modifier)
            changed["simplifiedObjects"].append(obj.name)

        if settings["bevelCleanup"]:
            modifier = obj.modifiers.new("merkin_style_bevel_cleanup", "BEVEL")
            modifier.width = max_dimension * 0.002
            modifier.segments = 1
            modifier.affect = "EDGES"
            apply_modifier(obj, modifier)
            changed["beveledObjects"].append(obj.name)

        if settings["weightedNormalCleanup"]:
            modifier = obj.modifiers.new("merkin_style_weighted_normals", "WEIGHTED_NORMAL")
            modifier.keep_sharp = True
            apply_modifier(obj, modifier)
            changed["weightedNormalObjects"].append(obj.name)

    return changed


def profile_palette(profile_id):
    key = profile_id.lower()
    if any(token in key for token in ("ink", "noir", "graphite", "charcoal", "line")):
        return {
            "label": "ink",
            "light": (0.86, 0.84, 0.76),
            "mid": (0.38, 0.35, 0.29),
            "dark": (0.055, 0.052, 0.048),
            "accent": (0.1, 0.085, 0.065),
            "roughness": 0.94,
            "metallic": 0.0,
        }
    if any(token in key for token in ("neon", "cosmic", "abyss", "surreal", "signal", "violet")):
        return {
            "label": "cosmic",
            "light": (0.55, 0.78, 1.0),
            "mid": (0.15, 0.22, 0.48),
            "dark": (0.035, 0.03, 0.12),
            "accent": (1.0, 0.24, 0.82),
            "roughness": 0.82,
            "metallic": 0.03,
        }
    return {
        "label": "storybook",
        "light": (1.0, 0.86, 0.62),
        "mid": (0.48, 0.36, 0.22),
        "dark": (0.14, 0.11, 0.09),
        "accent": (0.24, 0.42, 0.72),
        "roughness": 0.9,
        "metallic": 0.0,
    }


def mix_color(left, right, amount):
    return tuple(left[index] + (right[index] - left[index]) * amount for index in range(3))


def make_image(name, width, height, pixels, color_space="sRGB"):
    image = bpy.data.images.new(name=name, width=width, height=height, alpha=True)
    image.pixels.foreach_set(pixels)
    image.colorspace_settings.name = color_space
    image.pack()
    return image


def material_base_color(material):
    color = getattr(material, "diffuse_color", None)
    if color and len(color) >= 3:
        return (float(color[0]), float(color[1]), float(color[2]))
    return (0.72, 0.68, 0.58)


def create_style_textures(material, material_index, settings, geometry_stats, source_hash):
    size = settings["textureSize"]
    palette = profile_palette(settings["profileId"])
    rng = random.Random(stable_seed(source_hash, material.name, material_index, settings["profileId"]))
    base = material_base_color(material)
    max_dimension = max(geometry_stats["maxDimension"], 0.001)
    triangle_factor = clamp(math.log10(max(geometry_stats["triangleCount"], 1)) / 6.0, 0.1, 1.0)

    base_pixels = []
    rough_pixels = []
    normal_pixels = []
    line_strength = settings["lineStrength"]
    brush_strength = settings["brushStrength"]
    ao_strength = settings["aoStrength"]
    cavity_strength = settings["cavityStrength"]
    curvature_strength = settings["curvatureStrength"]

    phase_a = rng.random() * math.pi * 2
    phase_b = rng.random() * math.pi * 2
    for y in range(size):
        v = y / max(1, size - 1)
        for x in range(size):
            u = x / max(1, size - 1)
            sweep = math.sin((u * 5.5 + v * 2.25) * math.pi * 2 + phase_a)
            cross = math.sin((u * -2.0 + v * 7.0) * math.pi * 2 + phase_b)
            ring = math.sin((math.hypot(u - 0.5, v - 0.5) * (14.0 + triangle_factor * 10.0)) + phase_a)
            brush = (sweep * 0.45 + cross * 0.2 + ring * 0.18) * brush_strength
            ao = (1.0 - v) * 0.18 * ao_strength
            cavity = max(0.0, -ring) * 0.16 * cavity_strength
            curvature = abs(sweep - cross) * 0.08 * curvature_strength
            shade = clamp(0.58 + brush + ao - cavity + curvature, 0.0, 1.0)
            quantized = math.floor(shade * 5.0) / 5.0
            color = mix_color(palette["dark"], mix_color(base, palette["light"], 0.35), quantized)
            fleck = 0.18 if rng.random() > 0.997 else 0.0
            if fleck:
                color = mix_color(color, palette["accent"], fleck)
            line = abs(math.sin((u * 12.0 + v * 7.0 + phase_b) * math.pi))
            if line_strength > 0 and line < line_strength * 0.08:
                color = mix_color(color, palette["dark"], 0.72)

            base_pixels.extend([clamp(color[0], 0, 1), clamp(color[1], 0, 1), clamp(color[2], 0, 1), 1.0])

            roughness = clamp(palette["roughness"] - abs(brush) * 0.08 + cavity * 0.08, 0.05, 1.0)
            rough_pixels.extend([0.0, roughness, palette["metallic"], 1.0])

            dx = sweep * brush_strength * 0.22 + ring * curvature_strength * 0.1
            dy = cross * brush_strength * 0.22 - ring * curvature_strength * 0.1
            dz = 1.0
            length = math.sqrt(dx * dx + dy * dy + dz * dz) or 1.0
            normal_pixels.extend([dx / length * 0.5 + 0.5, dy / length * 0.5 + 0.5, dz / length * 0.5 + 0.5, 1.0])

    safe_name = "".join(char if char.isalnum() or char in "-_" else "-" for char in material.name or "material")
    prefix = f"merkin-{palette['label']}-{material_index:02d}-{safe_name[:32]}"
    return {
        "baseColor": make_image(f"{prefix}-basecolor", size, size, base_pixels, "sRGB"),
        "metallicRoughness": make_image(f"{prefix}-metalrough", size, size, rough_pixels, "Non-Color"),
        "normal": make_image(f"{prefix}-normal", size, size, normal_pixels, "Non-Color"),
        "profile": palette["label"],
    }


def connect_material(material, textures, settings):
    material.use_nodes = True
    tree = material.node_tree
    tree.nodes.clear()
    output = tree.nodes.new("ShaderNodeOutputMaterial")
    bsdf = tree.nodes.new("ShaderNodeBsdfPrincipled")
    tree.links.new(bsdf.outputs["BSDF"], output.inputs["Surface"])

    base = tree.nodes.new("ShaderNodeTexImage")
    base.name = "Merkin Style Base Color"
    base.image = textures["baseColor"]
    tree.links.new(base.outputs["Color"], bsdf.inputs["Base Color"])

    metalrough = tree.nodes.new("ShaderNodeTexImage")
    metalrough.name = "Merkin Style Metallic Roughness"
    metalrough.image = textures["metallicRoughness"]
    try:
        separate = tree.nodes.new("ShaderNodeSeparateColor")
        rough_output = separate.outputs["Green"]
        metal_output = separate.outputs["Blue"]
    except Exception:
        separate = tree.nodes.new("ShaderNodeSeparateRGB")
        rough_output = separate.outputs["G"]
        metal_output = separate.outputs["B"]
    tree.links.new(metalrough.outputs["Color"], separate.inputs[0])
    tree.links.new(rough_output, bsdf.inputs["Roughness"])
    tree.links.new(metal_output, bsdf.inputs["Metallic"])

    normal = tree.nodes.new("ShaderNodeTexImage")
    normal.name = "Merkin Style Normal"
    normal.image = textures["normal"]
    normal_map = tree.nodes.new("ShaderNodeNormalMap")
    normal_map.inputs["Strength"].default_value = 0.72
    tree.links.new(normal.outputs["Color"], normal_map.inputs["Color"])
    tree.links.new(normal_map.outputs["Normal"], bsdf.inputs["Normal"])

    material.diffuse_color = (1, 1, 1, 1)
    material["merkinStyleBake"] = {
        "mode": "blender-geometry",
        "profileId": settings["profileId"],
        "profile": textures["profile"],
        "textureSize": settings["textureSize"],
    }


def ensure_materials(mesh_objects):
    materials = list(bpy.data.materials)
    if materials:
        for obj in mesh_objects:
            if len(obj.data.materials) == 0:
                obj.data.materials.append(materials[0])
        return list(bpy.data.materials)

    material = bpy.data.materials.new("merkin-style-default")
    for obj in mesh_objects:
        obj.data.materials.append(material)
    return [material]


def bake_materials(mesh_objects, settings, geometry_stats, source_hash):
    materials = ensure_materials(mesh_objects)
    baked = []
    for index, material in enumerate(materials):
        textures = create_style_textures(material, index, settings, geometry_stats, source_hash)
        connect_material(material, textures, settings)
        baked.append({
            "materialIndex": index,
            "materialName": material.name,
            "profile": textures["profile"],
            "textures": [textures["baseColor"].name, textures["metallicRoughness"].name, textures["normal"].name],
        })
    return baked


def create_line_geometry(mesh_objects, settings, geometry_stats):
    if not settings["lineGeometry"] or settings["lineStrength"] <= 0:
        return []

    line_material = bpy.data.materials.new("merkin-style-line-geometry")
    line_material.diffuse_color = (0.025, 0.022, 0.018, 1.0)
    line_material.use_nodes = True
    bsdf = line_material.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (0.025, 0.022, 0.018, 1.0)
        bsdf.inputs["Roughness"].default_value = 1.0

    created = []
    thickness = max(geometry_stats["maxDimension"] * 0.0015 * settings["lineStrength"], 0.0001)
    for obj in list(mesh_objects):
        duplicate = obj.copy()
        duplicate.data = obj.data.copy()
        duplicate.name = f"{obj.name}-style-lines"
        duplicate.data.materials.clear()
        duplicate.data.materials.append(line_material)
        bpy.context.collection.objects.link(duplicate)
        modifier = duplicate.modifiers.new("merkin_style_line_wireframe", "WIREFRAME")
        modifier.thickness = thickness
        modifier.use_even_offset = True
        apply_modifier(duplicate, modifier)
        created.append(duplicate.name)
    return created


def purge_unused_source_textures(generated_image_names):
    removed = []
    keep = set(generated_image_names)
    for image in list(bpy.data.images):
        if image.name in keep:
            continue
        if image.users == 0:
            removed.append(image.name)
            bpy.data.images.remove(image)
    for texture in list(bpy.data.textures):
        if texture.users == 0:
            bpy.data.textures.remove(texture)
    return removed


def export_glb(output_path):
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    kwargs = {
        "filepath": str(output_path),
        "export_format": "GLB",
        "export_materials": "EXPORT",
        "export_animations": False,
        "export_apply": False,
        "export_unused_images": False,
    }
    try:
        bpy.ops.export_scene.gltf(**kwargs)
    except TypeError:
        kwargs.pop("export_unused_images", None)
        try:
            bpy.ops.export_scene.gltf(**kwargs)
        except TypeError:
            kwargs.pop("export_apply", None)
            bpy.ops.export_scene.gltf(**kwargs)


def product_metadata(args, settings, fingerprint, generated_at, diagnostics):
    return {
        "mode": "blender-geometry",
        "assetUrl": args.asset_url,
        "metadataUrl": args.metadata_url,
        "source": {
            "assetUrl": args.source_asset_url,
            "assetPath": str(Path(args.input).resolve()),
            "assetFingerprint": fingerprint,
            "nodeId": args.node_id,
            "levelId": args.level_id,
        },
        "settings": settings,
        "generator": GENERATOR,
        "generatedAt": generated_at,
        "status": "clean",
        "diagnostics": diagnostics,
    }


def main(argv):
    args = parse_args(argv)
    input_path = Path(args.input).resolve()
    output_path = Path(args.output).resolve()
    metadata_path = Path(args.metadata_output).resolve() if args.metadata_output else None

    if not input_path.is_file():
        raise RuntimeError(f"Input GLB not found: {input_path}")

    settings = normalize_settings(args)
    fingerprint = source_fingerprint(input_path)
    mesh_objects = import_model(input_path)
    uv_generated = [obj.name for obj in mesh_objects if ensure_uvs(obj)]
    cleanup = apply_geometry_cleanup(mesh_objects, settings)
    geometry_stats = gather_geometry_stats(mesh_objects)
    baked_materials = bake_materials(mesh_objects, settings, geometry_stats, fingerprint)
    line_geometry = create_line_geometry(mesh_objects, settings, geometry_stats)
    generated_images = [
        image_name
        for material in baked_materials
        for image_name in material["textures"]
    ]
    removed_images = purge_unused_source_textures(generated_images)

    scene = bpy.context.scene
    scene["merkinStyleBake"] = {
        "mode": "blender-geometry",
        "settings": settings,
        "sourceFingerprint": fingerprint,
        "generator": GENERATOR,
    }
    export_glb(output_path)

    generated_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    output_size = output_path.stat().st_size
    diagnostics = {
        "inputPath": str(input_path),
        "outputPath": str(output_path),
        "outputSizeBytes": output_size,
        "uvGeneratedObjects": uv_generated,
        "cleanup": cleanup,
        "lineGeometryObjects": line_geometry,
        "removedUnusedSourceImages": removed_images,
        "geometry": geometry_stats,
        "bakedMaterials": baked_materials,
    }
    product = product_metadata(args, settings, fingerprint, generated_at, diagnostics)
    result = {
        "success": True,
        "mode": "blender-geometry",
        "outputPath": str(output_path),
        "outputSizeBytes": output_size,
        "sourceFingerprint": fingerprint,
        "settings": settings,
        "generator": GENERATOR,
        "product": product,
        **diagnostics,
    }

    if metadata_path:
        metadata_path.parent.mkdir(parents=True, exist_ok=True)
        metadata_path.write_text(json.dumps(result, indent=2) + "\n", encoding="utf8")

    print(json.dumps(result))


if __name__ == "__main__":
    try:
        main(sys.argv)
    except Exception as error:
        print(f"Blender style bake failed: {error}", file=sys.stderr)
        raise
