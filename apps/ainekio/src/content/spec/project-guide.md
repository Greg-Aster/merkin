---
title: "Ainekio Project Index"
description: "Working items, decisions, evidence, and direct links across Ainekio, MetaHuman OS, and the site."
---

# Project Index

**Updated 30 September 2026** · Selected published records; no live-system recheck.

**Recheck** = dated finding, not a confirmed current blocker. **Proposed** = decision or contract still to settle. **Recorded complete** = done in the cited record.

## Working items

| State | Work / repo | Next action | Record |
| --- | --- | --- | --- |
| Proposed | Host takeover · **Both** | Set body-grant ownership, cancellation, and independent manual fallback before implementation. | [Sep 28 foundation][foundation] |
| Recheck | Transport · **Both** | Reconcile the recorded wireless direction with the USB recommendation; locate the missing linked foundation document. | [Sep 28 integration][integration] |
| Recheck | Loaded motion · **Body / v2** | Confirm installed build; plan loaded tracking/balance, frame-time, and heap checks. Recorded timing used two unloaded servos. | [Sep 25 validation][validation] |
| Recheck | Concurrent media/control · **Body / v2** | Measure mic/media draining, frame age, RAM pools, and body deadlines before raising stream targets. | [Sep 28 budget][budget] |
| Recheck | Q6A speech/perception · **Both** | Confirm installed services and cache placement; measure the intended concurrent workload. | [Sep 28 host audit][host-budget] |
| Proposed | IMU + display · **Body / v2** | Confirm LCD identity/pins; scope IMU acquisition and local correction through existing P4 owners. | [Sep 28 integration][integration] |
| Recheck | Active Operator acceptance · **MetaHuman** | Recheck Reactive/Semi/Full outcomes, fresh correlated observations, and cancel/stop/reconnect on the selected build. | [Sep 1 roadmap][roadmap] |

## Recorded complete

| Item | Evidence | Revisit when |
| --- | --- | --- |
| Profile + chat-history sync · **MetaHuman** | [Sep 29 repair and live verification][profile-sync] | Login/manual-sync behavior changes |
| Motion-speed build + saved-speed readback · **Body / v2** | [Sep 25 flash/digest and readback][validation] | Build or calibration changes; loaded motion remains a separate check |

## Plans, audits, and code

| Repo | Start / code | Plans and evidence |
| --- | --- | --- |
| **[Body][body]** · `main` | [Repository map][map] · [Gateway][gateway] · [P4 firmware][p4] · [12-servo controller][controller] | [Integration][integration] · [Budget][budget] · [Budget evidence][budget-evidence] · [Validation][validation] |
| **[MetaHuman][meta]** · `main` | [Agent instructions][agents] · [Maintained surface][surface] | [Operator roadmap][roadmap] · [Motion progress][motion] · [Refactor plan][blueprint] · [Audit protocol][protocol] · [Consolidation][consolidation] |
| **[Site][web]** · `dev` | [Website source][web] | [Progress scratchpad][scratchpad] · [Image sources][images] |

Update the owning record first; then change this index's row or link. Rows are review candidates, not execution approvals. No next robot behavior is selected here.

## History

**August 27 snapshots:** [Overview](/posts/project-overview/) · [Status](/posts/current-status/) · [Body](/posts/body-design-and-hardware/) · [S3 firmware](/posts/controller-firmware/)

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
[web]: https://github.com/Greg-Aster/merkin/tree/dev/apps/ainekio
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
[scratchpad]: https://github.com/Greg-Aster/merkin/blob/dev/apps/ainekio/PROGRESS_SCRATCHPAD.md
[images]: https://github.com/Greg-Aster/merkin/blob/dev/apps/ainekio/IMAGE_SOURCES.md
[p4]: https://github.com/Greg-Aster/Ainekio-bot/blob/main/Slave/firmware/esp32p4-wifi6/README.md
[controller]: https://github.com/Greg-Aster/Ainekio-bot/blob/main/Slave/software/models/v2-12servo/README.md
[validation]: https://github.com/Greg-Aster/Ainekio-bot/blob/main/Slave/software/models/v2-12servo/CONTROLLER_VALIDATION.md
