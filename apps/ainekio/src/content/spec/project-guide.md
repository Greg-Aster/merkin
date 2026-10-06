---
title: "Ainekio Project Index"
description: "Working items, decisions, evidence, and direct links across Ainekio, MetaHuman OS, and the site."
---

# Project Index

**Updated 6 October 2026** · Source review, recorded connection checks and the owner’s printed-chassis report. The lighter revision remains untested.

Current work across the robot, MetaHuman and website. [Project purpose](/posts/project-overview/#project-intent) · [Latest field note](/posts/2026-10-06-lighter-rebuild/).

## Current baseline

- **Physical build, October 6 owner report:** the printed chassis could not stand on its MG90 servos; LCD and shell pieces were not printed. The next revision keeps MG90 servos, removes material in Blender, shortens the leg carrier and replaces the heavy 10,000 mAh bank with separate batteries and onboard charging boards. Approximately 20% less weight and 20% more lifting force are owner estimates. New parts are still printing; the revised assembly is untested. [Lighter rebuild](/posts/2026-10-06-lighter-rebuild/) · [Linkage comparison](/posts/2026-10-06-compact-linkage/).
- **Q6A host, September 30–October 1 owner reports:** Radxa Ubuntu, local repo clones, llama.cpp with Qwen3.5 0.8B, and Kokoro. Cooling/throttling needs attention. The flashed P4 revision and concurrent service performance still need recording.
- **Connection evidence, reviewed October 6:** P4 hotspot association and authenticated Q6A readback were recorded with servo power off. The sustained-session test did not pass its continuous-connection target; this is not a connected walking or balance test. [Steering, sensing and connection record](/posts/2026-10-06-steering-sensing-connections/).
- **Decided:** Wireless with an offboard Q6A over direct Wi-Fi is the current priority; Wired with an onboard Q6A/native USB remains an alternative. ROS adapters are optional. **Current boundary:** one body-command owner; the gateway’s Environment endpoint accepts only local Bridge connections.
- **Implemented:** saved MetaHuman executions, input steering, visual history, bounded camera processing and same-action walk updates remain the active-loop foundations. Continuous steering and shared joint-speed controls now have source and software-check evidence; loaded turning, live IMU acquisition and physical balance feedback remain unverified. [September 30 active-loop history](/posts/q6a-chassis-and-active-loop/).

## Working items

**Open** = unfinished integration. **Review** = awaiting cross-repo review. **Hardware-gated** = requires assembly. Evidence is dated to its recorded setup.

| ID / state | Next action and owner | Dependency / acceptance |
| --- | --- | --- |
| **DOCS · Review** | Reconcile conflicting current plans and link the existing [body][integration] and [MetaHuman][surface] records. | Consistent current status and clearly dated history; independent of assembly. |
| **HOST · Open** | Record the actual Q6A deployment and local changes; stabilize the preferred Wi-Fi path. [Body integration][integration] · [Host evidence][host-budget] | Gateway/Bridge placement and installed services first. Record revisions, link behavior, and sustained speech/perception timing after cooling is checked; isolated desktop/host measurements are not concurrent robot acceptance. |
| **MOVE · Open** | Connect MetaHuman's task/Bridge producer and update acknowledgements to the existing active-walk boundary. [Gateway][gateway] · [Integration map][roadmap] | Preserve action, lease/epoch and revision. Pass expiry, uncertain-reply/no-replay, cancel and stop host tests; no new movement authority. |
| **VISION · Open** | Define and connect the recognition result, source-frame age and pose contract to the local task producer. [Gateway][gateway] · [Integration map][roadmap] | Reuse the bounded camera worker. Reject stale/uncorrelated results before visual motion control; compare YOLO or another backend on the assembled prototype; that comparison does not block contract work. |
| **REMOTE · Open** | Remove full remote-provider configuration logging and test safe metadata logging. [Integration map][roadmap] | Required before activating credentialed remote inference; independent of assembly. |
| **IMU · Open** | Add sensor acquisition/telemetry, then bounded local correction. [IMU owner][imu] · [Body integration][integration] | Confirm wiring, bus ownership and axes. Reuse the estimator; host tests precede powered feedback acceptance. |
| **BODY · Hardware-gated** | Assemble the lighter parts, repeat the standing test, then check loaded motion and concurrent camera/audio/control. [Validation][validation] · [Budget][budget] | Record actual weight, power arrangement, flashed revision and assembled configuration; measure tracking, balance, frame age, queues and deadlines. Independent of DOCS and host contracts. |

Automatic host takeover, continuous profile replication and higher media targets remain later design work in their owning records. None blocks consolidation.

## Recorded complete

| Item | Evidence / limit |
| --- | --- |
| Durable execution + visual history · **MetaHuman** | [Input continuity][continuity] · [Observation history][observations]. Source and isolated/mocked checks; connected physical acceptance remains in BODY. |
| One-way profile, memory + conversation transfer · **MetaHuman** | [Sep 29 repair and live verification][profile-sync]; not continuous replication. |
| Camera worker, active-walk updates, Body Control sessions + network settings · **Body** | [Sep 30 source and simulated-body coverage][body-push]. MOVE/VISION connect the existing pieces. |
| Motion regeneration, portable IMU estimator + desktop ROS toolchain · **Body** | [Geometry validation][validation] · [IMU][imu] · [ROS setup][ros]. Build/host evidence does not establish loaded motion or live sensing. |

## Plans, audits, and code

| Scope | Technical authority | Supporting records |
| --- | --- | --- |
| **[Body][body]** | [Body integration][integration] · [Gateway][gateway] | [Documentation map][body-docs] · [Controller][controller] · [Validation][validation] |
| **[MetaHuman][meta]** | [Maintained surface][surface] | [Integration/source map][roadmap] · [Distributed proposal][foundation] · [Host evidence][host-budget] |
| **[Site][web]** | [This queue's source][queue-source] | [Archived site-overhaul record][scratchpad] |

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
[surface]: https://github.com/Greg-Aster/metahuman-os/blob/main/docs/technical/MAINTAINED_SURFACE.md
[gateway]: https://github.com/Greg-Aster/Ainekio-bot/blob/main/Master/gateway/README.md
[integration]: https://github.com/Greg-Aster/Ainekio-bot/blob/main/docs/BODY_CONTROL_INTEGRATION.md
[budget]: https://github.com/Greg-Aster/Ainekio-bot/blob/main/docs/v2-12servo/RESOURCE_BUDGET.md
[roadmap]: https://github.com/Greg-Aster/metahuman-os/blob/main/docs/implementation-plans/robot-active-operator-roadmap.md
[foundation]: https://github.com/Greg-Aster/metahuman-os/blob/main/docs/audits/2026-09-28-distributed-robot-foundation.md
[host-budget]: https://github.com/Greg-Aster/metahuman-os/blob/main/docs/audits/2026-09-28-robot-resource-budget.md
[profile-sync]: https://github.com/Greg-Aster/metahuman-os/blob/main/docs/audits/2026-09-29-profile-sync-repair.md
[scratchpad]: https://github.com/Greg-Aster/merkin/blob/main/apps/ainekio/PROGRESS_SCRATCHPAD.md
[controller]: https://github.com/Greg-Aster/Ainekio-bot/blob/main/Slave/software/models/v2-12servo/README.md
[validation]: https://github.com/Greg-Aster/Ainekio-bot/blob/main/Slave/software/models/v2-12servo/CONTROLLER_VALIDATION.md
[imu]: https://github.com/Greg-Aster/Ainekio-bot/blob/main/Slave/software/imu/README.md
[ros]: https://github.com/Greg-Aster/Ainekio-bot/blob/main/docs/ROS2_SETUP.md
[observations]: https://github.com/Greg-Aster/metahuman-os/blob/main/docs/audits/robot-observation-history-review-2026-09-10.md
[body-push]: https://github.com/Greg-Aster/Ainekio-bot/commit/6437b24c0f91273aed160add0e42ac0ddbb5275c
[continuity]: https://github.com/Greg-Aster/metahuman-os/blob/main/docs/audits/environment-followup-context-review-2026-09-09.md
[body-docs]: https://github.com/Greg-Aster/Ainekio-bot/blob/main/docs/README.md
[queue-source]: https://github.com/Greg-Aster/merkin/blob/main/apps/ainekio/src/content/spec/project-guide.md
