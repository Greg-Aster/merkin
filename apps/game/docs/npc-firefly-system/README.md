# NPC Firefly System Agent Packets

Read `AGENT_00_COORDINATION.md` first. It is the source of truth for ordering,
ownership, and the final clean architecture.

Packet order:

1. `AGENT_01_NPC_CONTRACT_AND_VALIDATION.md`
2. `AGENT_02_RUNTIME_NPC_SYSTEM_AND_INTERACTION.md`
3. `AGENT_03_NPC_CONVERSATION_AND_STATE.md`
4. `AGENT_04_FIREFLY_NPC_PRESENTATION_AND_MIGRATION.md`
5. `AGENT_05_EDITOR_NPC_AUTHORING.md`
6. `AGENT_06_MANIFEST_COOK_AND_PUBLISH_GUARDRAILS.md`
7. `AGENT_07_LEGACY_CLEANUP_AND_CERTIFICATION.md`

Audit completion packets:

8. `AGENT_08_AUDIT_COMPLETION_COORDINATION.md`
9. `AGENT_09_RUNTIME_NPC_INTERACTION_COMPLETION.md`
10. `AGENT_10_RUNTIME_MANIFEST_RECOOK_AND_DRIFT.md`
11. `AGENT_11_EDITOR_BUDGET_AND_PROFILE_VALIDATION.md`
12. `AGENT_12_FINAL_ARCHITECTURE_CERTIFICATION.md`

Post-audit repair packets:

13. `AGENT_13_POST_AUDIT_REPAIR_COORDINATION.md`
14. `AGENT_14_CONVERSATION_EXPORT_AND_BUILD_GATE.md`
15. `AGENT_15_FIREFLY_HIT_TARGET_MOTION_OWNERSHIP.md`
16. `AGENT_16_GENERATED_DRIFT_AND_FINAL_CERTIFICATION.md`

The goal is not to patch fireflies back in as a one-off. The goal is a clean
NPC system that fireflies use as one archetype, with authored scene data,
runtime manifests, editor controls, validation, and generated outputs aligned.

Packets 8-12 exist because the first implementation passed scoped tests but
did not yet meet final architecture certification. They must be completed
before the NPC firefly system is considered done.

Packets 13-16 exist because the next implementation pass still left a broken
client build, a firefly hit-target motion ownership gap, and whole-repo
generated/collision certification blockers. Read packet 13 before assigning
packets 14-16.
