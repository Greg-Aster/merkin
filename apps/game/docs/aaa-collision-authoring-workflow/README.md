# AAA Collision Authoring Workflow

This packet coordinates the collision-authoring workflow upgrade for the game
engine and level editor.

Read in order:

1. `AGENT_00_COORDINATION.md`
2. `AGENT_01_BLOCKOUT_COLLISION_CONTRACT.md`
3. `AGENT_02_VISUAL_REPLACEMENT_PRESERVATION.md`
4. `AGENT_03_OVERLAY_AND_REVIEW_UI.md`
5. `AGENT_04_VALIDATION_SAVE_PUBLISH_GATES.md`
6. `AGENT_05_YGGDRASIL_COLLISION_REVIEW.md`

The packet is based on the current code state, not desired-state speculation.
The central correction is that the engine already has several collision pieces,
but the authoring workflow is not yet coherent enough for repeatable AAA-quality
level production.

Strict rule: do not add patches, compatibility bridges, legacy aliases, or
Yggdrasil-specific engine branches. Replace weak contracts with clear contracts,
then migrate content to those contracts.

