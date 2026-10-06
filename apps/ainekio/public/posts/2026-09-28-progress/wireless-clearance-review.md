Captured September 28, 2026 at 13:04 PDT. Local machine path prefixes omitted.

# Wireless: original front carriers, relieved rear carriers

The chassis remains **82.5 mm wide**. Only the rear Part_003 carriers retain the battery reliefs and reduced **13.4° inward swing**. Both front Part_003 carriers have been restored to their exact original geometry, including their mounting holes, rails and original surface details.

The complete front leg and servo assemblies moved **4.1 mm forward on X**. Front-to-rear pivot spacing is now **151.8 mm**. The battery, rear assemblies, chassis width, boards and other body parts retain their current placements.

## Fit checks

- Original front carrier minimum battery gap is approximately **0.590 mm** over **0..17° inward swing**. The minimum occurs at17°. A conservative bound between0.1° samples remains above0.56 mm.
- The rear carriers and rear servo placement are unchanged. Their checked range remains0..13.4°; rear Part_006 is the limiting moving hardware at approximately0.523 mm sampled battery clearance.
- Fixed Part_002 bodies still nominally touch the battery sides. Its dimensions and placement were preserved.
- Both restored front carriers exactly match the original native geometry hash `66d20a0b4040ed20a727ba253e756d74ab6787cc36f1a3159452ba1c2f06566b`; they are closed solids with zero nonmanifold edges and zero zero-area faces. They share a new Wireless-only mesh copy with their original Wireless material retained.
- Ninety evaluated front-assembly objects move together. Four hidden boot references retain their local transforms and inherit the parent movement when evaluated. Rear assemblies, all71 animation actions, other scenes and unrelated geometry are preserved. Concurrent user work is retained.

The electronic bridge and tray were excluded from the fit decision. Center-support length, end-panel and shell fitting remain a subsequent body-refit step; this edit establishes the front/rear placement and battery clearance. No servo firmware limits or animation ranges were changed. These are mesh-clearance checks at the current alpha/theta poses, not a full gait or physical-print strength test.

## Files

Saved active project: `ainekio-variable-gait-Recovery.blend`.

The existing compressed rolling recovery was refreshed before this revision at `ainekio-variable-gait-Modeling-Recovery.blend`. It retains the preceding82.5 mm layout with the trimmed front carriers. No additional checkpoint or STL/GLB export was created.

Detailed measurements and reopen checks remain in the source review record; see sources.json for the captured source hash.
