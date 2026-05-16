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

OUTPUT_DIR = (
    base.REPO_ROOT / "apps/megameal/public/generated/style-lab/blender/hunyuan3d-paint-test"
)
SOURCE_GLB = base.SOURCE_GLB
TEXTURED_GLB = OUTPUT_DIR / "yggdrasil-world-tree-hunyuan3d-paint-reference-textured.glb"
OUTPUT_BLEND = OUTPUT_DIR / "yggdrasil-world-tree-hunyuan3d-paint-comparison.blend"
OUTPUT_RENDER = OUTPUT_DIR / "yggdrasil-world-tree-hunyuan3d-paint-comparison.png"


def main() -> None:
    if not TEXTURED_GLB.exists():
        raise FileNotFoundError(TEXTURED_GLB)

    base.clear_scene()
    base.import_glb(SOURCE_GLB, x_offset=-12.0, scale=8.0)
    base.import_glb(TEXTURED_GLB, x_offset=12.0, scale=8.0)
    bpy.context.view_layer.update()
    base.make_label("ORIGINAL GLB", (-12.0, 15.0, -15.0))
    base.make_label("HUNYUAN3D PAINT TEXTURED GLB", (12.0, 15.0, -15.0))
    bpy.context.view_layer.update()
    base.add_lighting_and_camera()
    base.render_settings()
    bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT_BLEND))
    bpy.context.scene.render.filepath = str(OUTPUT_RENDER)
    bpy.ops.render.render(write_still=True)
    print(f"Wrote {OUTPUT_BLEND}")
    print(f"Wrote {OUTPUT_RENDER}")


if __name__ == "__main__":
    main()
