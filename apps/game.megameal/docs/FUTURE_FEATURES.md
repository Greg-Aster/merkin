# Future Features

Status: backlog reminders for planned work that is not part of the current
implemented foundation.

## Level Authoring Import Validation: Packet 4

Source plan: `docs/Done/LEVEL_AUTHORING_IMPORT_VALIDATION_PLAN.md`.

### Future Cook Ownership

- After validation is trustworthy, add explicit cook/import commands for
  durable generated outputs.
- The normal build may check drift, but it must not silently rewrite source or
  cooked files.

Acceptance:

- Generated outputs have one owner command.
- Generated files are reproducible.
- Runtime never repairs missing content.

Architecture requirements:

- Cook/import tooling must produce checked-in `PrefabDefinition`,
  `LevelDefinition`, and `RuntimeSceneManifest` data.
- Runtime scenes must continue to consume validated manifest data, not editor
  state or generated files repaired at load time.
- Normal app build may fail on stale cooked data, but must not silently bake or
  rewrite files.
- Future cook/import commands must be explicit, focused, and documented in
  `ENGINE_CONTRACT_REGISTER.md` before implementation.
