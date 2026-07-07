# Ainekio/Sesame Avatar Mesh Sources

The visible robot meshes for this avatar are generated from the Sesame simulator
URDF and Onshape mesh exports.

- Source project: `https://github.com/one-for-all/sesame-robot-sim`
- Local source used for the current export: `/tmp/sesame-robot-sim-current`
- Source files: `docs/robot.urdf` plus `onshape/assets/*.stl`
- Runtime output: `public/assets/player/avatars/ainekio-sesame/*.glb`
- Regeneration command:

```bash
pnpm --dir apps/game.megameal prepare:ainekio-sesame-assets -- --source=/path/to/sesame-robot-sim-current
```

The generator exports one GLB per simulated rigid body so the generic physics
rig runtime can attach visible robot parts directly to the existing chassis,
leg, and foot bodies.
