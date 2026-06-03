# Agent 13: Feature Readiness And Capability Audit

## Mission

Inventory every visible editor feature and classify whether it works, is blocked,
is experimental, or should be hidden. This must happen before the UI can be made
trustworthy.

## Problem

The editor has accumulated capabilities quickly. Users cannot tell which buttons
are production-ready and which are local experiments. This creates the feeling
that "nothing works" even when some flows are solid.

## Deliverables

Create:

- `docs/level-editor-ux-refactor/EDITOR_FEATURE_INVENTORY.md`
- optional supporting JSON or markdown tables if useful

Do not implement large UI changes in this agent. This is an audit and labeling
contract for other agents.

## Inventory Fields

For every visible feature/control group, record:

- Feature name
- Current location
- Source component/file
- Owner workspace target
- User job it supports
- Status:
  - `core-ready`
  - `works-needs-ux`
  - `experimental`
  - `offline-service`
  - `blocked`
  - `duplicate`
  - `retire-candidate`
- Required selection/context
- Backend/API dependency
- Verification path
- Recommended UI treatment

## Features To Include

At minimum audit:

- Level switching
- New level creation
- Save level
- Save local recovery
- Load current/packaged/original/backup
- Copy/import JSON
- Select/clear/select similar
- Hide selected/hide unselected/show all
- Group/ungroup
- Transform mode/space/axis/snapping
- Outliner visibility/selectability/isolation
- Object inspector/details
- Quick create primitives
- Prefab library
- Imported models browser
- Generated assets browser
- AI generate/retexture
- ComfyUI workflow selection/editing
- Hunyuan service start/status/jobs
- Style studio
- Environment settings
- Player spawn settings
- Collision overlay
- Collision policy/budget
- Mesh collider bake
- Terrain collision/chunk cook
- World partition cook
- Publish readiness/publish build
- Runtime diagnostics/output

## Acceptance Criteria

- Every visible top-level button has an inventory row.
- Duplicate commands are identified.
- Offline-service actions are clearly marked.
- Experimental AI/style flows are separated from core editing.
- Retire candidates are named but not deleted.
- Follow-up agents can use the inventory to decide what appears by default.

## Verification

Run the editor, click through all workspaces/tabs, and update the inventory.

Recommended commands:

```bash
pnpm --dir apps/game smoke:editor-ux -- --no-server
```

No `type-check` is required if this agent only writes markdown, but run it if any
source files change.
