# MEGAMEAL Generated Asset Sprawl Triage

Date: 2026-04-22

## Current Footprint

Measured local footprint:

- `1.6G` in `apps/megameal/public/generated`
- `160M` in `apps/game/public/style-engine-ref`
- `180M` in `apps/megameal/public/models/snuggaliod`

Combined footprint for the tracked sprawl set:

- about `1.94 GB`
- about `1893` files

High-level split:

- `apps/megameal/public/generated/hunyuan3d`: `1.2G`
- `apps/megameal/public/generated/style-lab`: `470M`
- `apps/game/public/style-engine-ref`: `160M`

File-count split:

- `apps/megameal/public/...`: `1842` files
- `apps/game/public/...`: `51` files

## Largest Single Files

Top offenders:

| Size | File |
| --- | --- |
| `103M` | `apps/megameal/public/models/snuggaliod/Fur.blend` |
| `66M` | `apps/megameal/public/models/snuggaliod/Fur_.glb` |
| `7.6M` | `apps/megameal/public/models/snuggaliod/Fur.glb` |
| `7.7M` | `apps/game/public/style-engine-ref/Screenshot from 2025-01-16 11-08-22.png` |
| `7.1M` | `apps/megameal/public/generated/hunyuan3d/branch-se/branch-se-generated-2026-04-19T17-39-02-154Z.glb` |
| `7.0M` | `apps/megameal/public/generated/hunyuan3d/bifrost-approach/bifrost-approach-generated-2026-04-19T05-30-11-048Z.glb` |

Note:

- `Fur.blend` and `Fur_.glb` are now tracked through Git LFS so GitHub can accept them.
- That solves the push blocker, but it does not solve repository sprawl.

## Highest-Churn Generated Areas

The biggest repetition pattern is timestamped, near-duplicate generation output.

Largest subtrees by count:

| Files | Subtree |
| --- | --- |
| `205` | `hunyuan3d/references` |
| `40` | `hunyuan3d/weathered-monolith-pillar` |
| `30` | `hunyuan3d/shore-ring` |
| `26` | `hunyuan3d/island-shelf` |
| `20` | `hunyuan3d/world-root-basin` |
| `16` | `hunyuan3d/root-mound` |
| `14` | `hunyuan3d/well-dais` |
| `12` each | `trunk-upper`, `trunk-mid`, `trunk-lower`, `root-south`, `root-north`, `bifrost-approach` |

Interpretation:

- The sprawl is not one large library of unique assets.
- It is mostly iterative workspace output, references, and timestamped variants.

## Asset Classes

### 1. Probably canonical deliverables

Examples:

- final `.glb` or hand-authored model files that the live app actually references
- final packaged promo/reference images intentionally used by the site

### 2. Probably disposable or archivable generation workspace output

Examples:

- `apps/megameal/public/generated/style-lab/workspace/...`
- timestamped source/reference/request triplets
- repeated intermediate `.glb` variants for the same object

### 3. Research/reference packs

Examples:

- `apps/game/public/style-engine-ref`
- `apps/megameal/public/generated/hunyuan3d/references`

These are useful for art direction, but they are not obviously runtime assets and should not live indefinitely in public web roots by default.

## Cleanup Risks

### Runtime risk

- Deleting from `public/generated` blindly may break live asset references if some pages or scenes expect these exact paths.

### Repo hygiene risk

- Keeping all timestamped outputs in Git will continue to inflate clone size, review noise, and push time.

### Hosting risk

- Public web roots are being used as both runtime asset storage and creative workspace storage.
- That makes it hard to know what is actually required for production.

## Recommended Cleanup Tracks

### Track A. Inventory runtime references before deleting anything

Use code search to determine which generated paths are actually referenced from source.

Target:

- produce a keep-list of runtime-required files/directories

### Track B. Move creative workspace output out of public runtime paths

Candidate areas:

- `apps/megameal/public/generated/style-lab/workspace`
- `apps/megameal/public/generated/hunyuan3d/references`
- `apps/game/public/style-engine-ref`

Target:

- move these to a non-public workspace, artifact store, or external archive directory

### Track C. Collapse timestamped variants to canonical winners

Candidate areas:

- `branch-*`
- `root-*`
- `shore-ring`
- `island-shelf`
- `world-root-basin`
- `trunk-*`
- `well-*`

Target:

- one canonical output per asset family, plus optionally one source file

### Track D. Define asset retention policy

Needed rule:

- what stays in Git
- what stays in Git LFS
- what stays only locally
- what is exported to external storage

Without this, the same sprawl pattern will continue.

## Suggested Execution Order

1. search the codebase for references into `public/generated` and `public/models/snuggaliod`
2. mark runtime-required paths
3. move obvious reference/workspace directories out of `public`
4. collapse duplicate timestamped asset families
5. add policy documentation and ignore/archive rules

## Separation Rule

Do not combine this cleanup with `astro check` correctness fixes. Asset reduction changes should be reviewed as content/storage operations, not mixed with type and component correctness work.
