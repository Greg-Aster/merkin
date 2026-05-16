from __future__ import annotations

import importlib.util
from pathlib import Path

import bpy


BASE_SCRIPT = Path(__file__).with_name("yggdrasil_world_tree_paint_system_gouache_test.py")
spec = importlib.util.spec_from_file_location("paint_system_gouache_test_base", BASE_SCRIPT)
if spec is None or spec.loader is None:
    raise RuntimeError(f"Could not load base script: {BASE_SCRIPT}")

base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)


def main() -> None:
    base.clear_scene()
    base.import_glb(base.SOURCE_GLB)
    bpy.context.view_layer.update()
    for obj in base.mesh_objects():
        print(f"OBJECT {obj.name} verts={len(obj.data.vertices)} polys={len(obj.data.polygons)}")
        print(f"  uv_layers={[layer.name for layer in obj.data.uv_layers]}")
        print(f"  materials={len(obj.data.materials)}")
        for index, material in enumerate(obj.data.materials):
            print(f"  MATERIAL[{index}] {material.name if material else '<none>'}")
            for node in base.base_color_texture_nodes(material):
                image = node.image
                print(
                    "    base_color_image "
                    f"name={image.name} size={tuple(image.size)} filepath={image.filepath}"
                )
            principled = base.first_principled_node(material)
            if principled and "Base Color" in principled.inputs:
                print(f"    base_color_value={tuple(principled.inputs['Base Color'].default_value)}")


if __name__ == "__main__":
    main()
