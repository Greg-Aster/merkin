# Style Bake Pipeline Agent Packet

This packet coordinates the next phase of the baked stylized asset system.

Start with:

- `AGENT_00_COORDINATION.md`

Focused work orders:

- `AGENT_01_STYLE_BAKE_CONTRACT_AND_MANAGER.md`
- `AGENT_02_BLENDER_HEADLESS_BAKE_BACKEND.md`
- `AGENT_03_EDITOR_UX_AND_CONTROLS.md`
- `AGENT_04_RUNTIME_ASSET_COOK_AND_PUBLISH_VALIDATION.md`
- `AGENT_05_BATCH_CACHE_AND_LEVEL_BAKE.md`
- `AGENT_06_TESTS_AUDIT_AND_CRUFT_REMOVAL.md`

The intended outcome is an editor-owned style bake pipeline that turns scene
objects into optimized stylized runtime GLBs, with metadata, stale detection,
publish validation, runtime cooking, and clear editor controls.

Runtime post-processing is not the goal. Manual per-mesh painting is not the
goal. The style must be baked into generated object assets before runtime.
