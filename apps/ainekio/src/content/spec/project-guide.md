---
title: "Ainekio Project Index"
description: "Working items, decisions, evidence, and direct links across Ainekio, MetaHuman OS, and the site."
---

# Project Index

**Updated 30 September 2026** · September 30 pushes reviewed; no live-system recheck.

[Latest field note: Q6A, chassis work, and a more active loop](/posts/q6a-chassis-and-active-loop/).

**Recheck** = dated finding, not a confirmed current blocker. **Proposed** = decision or contract still to settle. **Recorded complete** = done in the cited record.

## Working items

| State | Work / repo | Next action | Record |
| --- | --- | --- | --- |
| Proposed | Host takeover · **Both** | Set body-grant ownership and independent manual fallback; keep the distributed-runtime proposal separate from shipped behavior. | [Foundation][foundation] |
| In progress | Q6A transport · **Both** | Integrate direct P4–Q6A Wi-Fi, the current choice; USB remains an alternative. Measure concurrent latency. | [Sep 30 integration][integration] |
| Recheck | Chassis + loaded motion · **Body / v2** | Fit revised geometry and test it under load. Sep 29 motion regeneration and P4 build were offline, not flashed or powered-tested. | [Geometry validation][validation] |
| In progress | Active perception · **Both** | Connect a recognition backend and MetaHuman task producer to fresh-frame processing and bounded walk updates. YOLO remains research. | [Gateway foundations][gateway] |
| Recheck | Concurrent media/control · **Body / v2** | Measure frame age, memory, audio queues, and motion deadlines together before raising stream targets. | [System budget][budget] |
| Recheck | Q6A speech/perception · **Both** | Confirm installed services and cache placement; measure the intended concurrent workload. | [Host audit][host-budget] |
| In progress | IMU + display · **Body / v2** | Connect live IMU acquisition and local feedback; confirm display identity/pins. Portable estimation is source-tested only. | [IMU foundation][imu] · [Integration][integration] |
| Recheck | Active workflow acceptance · **MetaHuman** | Exercise saved waits, new-input steering, correlated results, and cancel/stop/reconnect on the assembled system. | [Workflow owners][surface] · [Input continuity][continuity] · [Observation history][observations] |

## Recorded complete

| Item | Evidence | Revisit when |
| --- | --- | --- |
| One-way profile + memory + conversation transfer · **MetaHuman** | [Sep 29 repair and live verification][profile-sync] | Login/manual-sync behavior changes |
| Body Control sessions + P4 network settings · **Body / v2** | [Sep 30 source and simulated-body coverage][body-push] | Recheck on the installed body and host |
| Motion-speed build + saved-speed readback · **Body / v2** | [Sep 25 flash/digest and readback][validation] | Build or calibration changes; loaded motion remains a separate check |

## Plans, audits, and code

| Repo | Start / code | Plans and evidence |
| --- | --- | --- |
| **[Body][body]** · `main` | [Repository map][map] · [Gateway][gateway] · [P4 firmware][p4] · [12-servo controller][controller] | [Integration][integration] · [Budget][budget] · [Budget evidence][budget-evidence] · [Validation][validation] · [IMU][imu] · [ROS setup][ros] |
| **[MetaHuman][meta]** · `main` | [Agent instructions][agents] · [Maintained surface][surface] | [Sep 1 roadmap (history)][roadmap] · [Motion progress][motion] · [Refactor plan][blueprint] · [Audit protocol][protocol] · [Consolidation][consolidation] |
| **[Site][web]** · `main` / `dev` | [Website source][web] | [Progress scratchpad][scratchpad] · [Image sources][images] |

Update the owning record first; then change this index's row or link. Rows are review candidates, not execution approvals. No next robot behavior is selected here.

## History

[Project overview](/posts/project-overview/) · [Current status](/posts/current-status/) · [Original body](/posts/body-design-and-hardware/) · [S3 firmware](/posts/controller-firmware/)

These guides retain their own revision dates. The [September 9 status review](/posts/archive/2026-09-09-project-status/) preserves an earlier observation period.

[Diary / updates](/updates/) · [Article archive](/archive/) · [Evidence policy](/about/)

## Original Ainekio and Ainekio v2

<details>
<summary>Design context</summary>

- **Original:** ESP32-S3, eight servos. It remains a supported design.
- **Ainekio v2:** twelve-servo exploration after using the available S3 pins; includes the P4 controller path. Multiple body styles are intended to remain supported.
- **Naming:** project, website, and wake word stay **Ainekio**. V2 is not a shipped or physically qualified claim. Dated S3 articles retain their original observation period.

</details>

[meta]: https://github.com/Greg-Aster/metahuman-os
[body]: https://github.com/Greg-Aster/Ainekio-bot
[web]: https://github.com/Greg-Aster/merkin/tree/main/apps/ainekio
[agents]: https://github.com/Greg-Aster/metahuman-os/blob/main/AGENTS.md
[surface]: https://github.com/Greg-Aster/metahuman-os/blob/main/docs/technical/MAINTAINED_SURFACE.md
[blueprint]: https://github.com/Greg-Aster/metahuman-os/blob/main/docs/technical/REFACTOR_BLUEPRINT.md
[protocol]: https://github.com/Greg-Aster/metahuman-os/blob/main/docs/technical/AUDIT_PROTOCOL.md
[consolidation]: https://github.com/Greg-Aster/metahuman-os/blob/main/docs/audits/consolidation-progress.md
[map]: https://github.com/Greg-Aster/Ainekio-bot/blob/main/docs/REPOSITORY_MAP.md
[gateway]: https://github.com/Greg-Aster/Ainekio-bot/blob/main/Master/gateway/README.md
[integration]: https://github.com/Greg-Aster/Ainekio-bot/blob/main/docs/BODY_CONTROL_INTEGRATION.md
[budget]: https://github.com/Greg-Aster/Ainekio-bot/blob/main/docs/v2-12servo/RESOURCE_BUDGET.md
[budget-evidence]: https://github.com/Greg-Aster/Ainekio-bot/blob/main/docs/v2-12servo/BUDGET_AUDIT_EVIDENCE.md
[roadmap]: https://github.com/Greg-Aster/metahuman-os/blob/main/docs/implementation-plans/robot-active-operator-roadmap.md
[motion]: https://github.com/Greg-Aster/metahuman-os/blob/main/docs/audits/robot-operator-motion-control-progress.md
[foundation]: https://github.com/Greg-Aster/metahuman-os/blob/main/docs/audits/2026-09-28-distributed-robot-foundation.md
[host-budget]: https://github.com/Greg-Aster/metahuman-os/blob/main/docs/audits/2026-09-28-robot-resource-budget.md
[profile-sync]: https://github.com/Greg-Aster/metahuman-os/blob/main/docs/audits/2026-09-29-profile-sync-repair.md
[scratchpad]: https://github.com/Greg-Aster/merkin/blob/main/apps/ainekio/PROGRESS_SCRATCHPAD.md
[images]: https://github.com/Greg-Aster/merkin/blob/main/apps/ainekio/IMAGE_SOURCES.md
[p4]: https://github.com/Greg-Aster/Ainekio-bot/blob/main/Slave/firmware/esp32p4-wifi6/README.md
[controller]: https://github.com/Greg-Aster/Ainekio-bot/blob/main/Slave/software/models/v2-12servo/README.md
[validation]: https://github.com/Greg-Aster/Ainekio-bot/blob/main/Slave/software/models/v2-12servo/CONTROLLER_VALIDATION.md

[imu]: https://github.com/Greg-Aster/Ainekio-bot/blob/main/Slave/software/imu/README.md
[ros]: https://github.com/Greg-Aster/Ainekio-bot/blob/main/docs/ROS2_SETUP.md
[observations]: https://github.com/Greg-Aster/metahuman-os/blob/main/docs/audits/robot-observation-history-review-2026-09-10.md
[body-push]: https://github.com/Greg-Aster/Ainekio-bot/commit/6437b24c0f91273aed160add0e42ac0ddbb5275c

[continuity]: https://github.com/Greg-Aster/metahuman-os/blob/main/docs/audits/environment-followup-context-review-2026-09-09.md
