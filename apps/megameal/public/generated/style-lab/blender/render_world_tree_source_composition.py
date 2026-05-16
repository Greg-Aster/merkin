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

OUTPUT_DIR = base.REPO_ROOT / "apps/megameal/public/generated/style-lab/blender/comfyui-flux-style-test"
OUTPUT_BLEND = OUTPUT_DIR / "yggdrasil-world-tree-source-composition.blend"
OUTPUT_RENDER = OUTPUT_DIR / "yggdrasil-world-tree-source-composition.png"


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    base.clear_scene()
    base.import_glb(base.SOURCE_GLB, scale=8.0)
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
