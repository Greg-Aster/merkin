---
title: "Ainekio Development Tracker"
description: "Working items, decisions, evidence, and direct links across Ainekio, MetaHuman OS, and the site."
---

# Development tracker

**Updated 14 October 2026** · Body events, configurable self-leveling, SD recording, Wi-Fi maintenance and completed Task candidate qualification. Earlier physical observations retain their dates.

Current work across the robot, MetaHuman and website. [Companion functions](/posts/ainekio-companion/) explain the intended experience. [Project purpose](/posts/project-overview/#project-intent) · [Latest field note](/posts/2026-10-14-body-events/).

## Current baseline

- **Body events:** boot/wake, tipped and rapid-movement events reach a dedicated Event Trigger workflow, which delegates model-selected intentions to Environment Mode. Robot Status includes timestamped IMU data. Body Control saves thresholds and a rapid-event interval, default 10 seconds. Complete wake/stretch and repeated-reaction reliability remain unresolved. [Event report](/posts/2026-10-14-body-events/).
- **Startup and leveling:** local staged rise is separate from calibration Home. The October 14 record verifies installation of 0.8.46 and live saved On/Off, strength, damping and attitude-target controls. Loaded physical leveling remains unverified. [Motion and geometry report](/posts/2026-10-14-startup-and-leveling/).
- **Recording and Wi-Fi maintenance:** internal SD video, downloads, staged application updates and retained robot logs are implemented. The dated 0.8.37 controller test recorded 411 frames over 469 seconds without reconnecting; no powered gait or endurance claim follows. [Media and update report](/posts/2026-10-14-recording-and-updates/).
- **Task qualification:** two new 0.8B candidates completed training and evaluation; neither is deployed. The latest improves reference matches but introduces three historical missed actions. The existing Task refinement adapter remains selected. [Results and limitations](/posts/2026-10-14-speech-and-task-training/).

- **October 12 build report:** exterior shell printing has begun, with further weight modifications and a switch to a 4 A power supply. The October 13 owner report adds 566 g mass and 5 V supply for that assembly. Full shell attachment, measured current and final battery arrangement remain open. [Build and prototype exports](/posts/2026-10-12-shell-power-and-motion/).
- **October 12 vision integration:** real P4 camera data and selected-chair observations reached MetaHuman through the desktop gateway. A tighter reference retained one track in eight frames; the tested 0.8B-generated region produced none. Camera stalls/reconnects and full conversational acquisition remain open. [YOLOE record](/posts/2026-10-12-yoloe-tracking/).
- **Trained models and node workflows:** Qwen 0.8B intent/task specialists have dated activation records; tool routing and live Robot Status are implemented. The earlier goal candidate was rejected after regression failures. The October 14 report above records the newer speech/action candidates separately. [Training and comparison](/posts/2026-10-12-trained-specialists/).

- **Physical build, October 8 owner report:** the robot can stand, walk and respond to commands. The October 8 photograph shows the exposed assembly and illuminated LCD. At that report, the carapace was not attached and Active Operator had not been tested; no newer physical acceptance result is supplied. This supersedes the October 6 standing failure as current status; that earlier entry remains history. The later October 13 mass report is recorded above; lifting-force and battery-runtime measurements remain open. [Walking milestone](/posts/2026-10-08-standing-walking/).
- **Display and media:** dated firmware records include LCD/camera orientation, a working-speaker report and wake-capture checks. The local 59-name face library, workflow feedback and speech refinements have newer source changes; their exact deployed versions remain separate. [Face and media record](/posts/2026-10-08-face-and-media/).
- **Q6A host, September 30–October 1 owner reports:** Radxa Ubuntu, local repo clones, llama.cpp with Qwen3.5 0.8B, and Kokoro. Cooling/throttling needs attention. The flashed P4 revision and concurrent service performance still need recording.
- **Connection evidence, reviewed October 6:** P4 hotspot association and authenticated Q6A readback were recorded with servo power off. That sustained-session test failed its continuous-connection target. The later 469-second Wi-Fi recovery result is recorded above; neither establishes sustained loaded balance/network performance. [Steering, sensing and connection record](/posts/2026-10-06-steering-sensing-connections/).
- **Decided:** Wireless with an offboard Q6A over direct Wi-Fi is the current priority; Wired with an onboard Q6A/native USB remains an alternative. ROS adapters are optional. **Current boundary:** one body-command owner; the gateway’s Environment endpoint accepts only local Bridge connections.
- **Software progress, October 7–8:** task planning and conversation have separate paths; background interpretation preserves the existing active execution owner. Body Control and MetaHuman now expose saved connection choices. Local speech and person-detection refinements remain in progress. Paired software tests use a simulated body; the documented live-model stop/completion failure and physical Active Operator test remain open. [Responsive commands](/posts/2026-10-08-responsive-commands/).

## Working items

**Open** = unfinished integration. **Review** = awaiting cross-repo review. **Hardware-gated** = requires assembly. Evidence is dated to its recorded setup.

| ID / state | Next action and owner | Dependency / acceptance |
| --- | --- | --- |
| **DOCS · Review** | Reconcile conflicting current plans and link the existing [body][integration] and [MetaHuman][surface] records. | Consistent current status and clearly dated history; independent of assembly. |
| **HOST · Open** | Record the actual Q6A deployment and local changes; stabilize the preferred Wi-Fi path. [Body integration][integration] · [Host evidence][host-budget] | Gateway/Bridge placement and installed services first. Record revisions, link behavior, and sustained speech/perception timing after cooling is checked; isolated desktop/host measurements are not concurrent robot acceptance. |
| **MOVE · Open** | Qualify the paired task/Bridge producer, correlated updates and selected-track behavior on the assembled robot. [Gateway][gateway] · [Integration map][roadmap] | Preserve action, lease/epoch and revision. Pass expiry, uncertain-reply/no-replay, cancel and stop host tests; no new movement authority. |
| **VISION · Open** | Complete the deployed conversational acquisition workflow and selected-target continuity tests. [Gateway][gateway] · [Integration map][roadmap] | Exact-frame and live stationary YOLOE results are recorded. Test moving targets, ambiguity/loss/reacquisition, camera recovery and Q6A workloads through the existing camera/task owners. |
| **REMOTE · Open** | Remove full remote-provider configuration logging and test safe metadata logging. [Integration map][roadmap] | Required before activating credentialed remote inference; independent of assembly. |
| **IMU · Open** | Qualify installed self-leveling under load, including correction direction, tracking and recovery after gestures. [Leveling record](/posts/2026-10-14-startup-and-leveling/) · [IMU owner][imu] | Acquisition, Robot Status and saved response controls are implemented. Changing commanded pulses is not measured joint movement; preserve calibration while testing. |
| **EVENTS · Open** | Complete wake/photo/stretch/stand and repeated-motion-event tests through the dedicated Event Trigger workflow. [Event record](/posts/2026-10-14-body-events/) | Keep detection separate from model-selected behavior; validate selected actions and actual results, not just event delivery. |
| **MODELS · Open** | Resolve speech/action selection and historical missed-action regressions. [Qualification record](/posts/2026-10-14-speech-and-task-training/) | Two trained candidates remain undeployed. Preserve held-out comparisons and the current production assignment. |
| **MEDIA · Open** | Extend recording and Wi-Fi recovery checks to longer concurrent workloads and storage faults. [Controller record](/posts/2026-10-14-recording-and-updates/) | Preserve the 469-second result as short-run evidence; full-card reuse and power-loss recovery need their own physical qualification. |
| **BODY · Hardware-gated** | Check printed exterior and the reported 5 V / 4 A supply arrangement, document the complete assembly, then test Active Operator and concurrent camera/audio/control. [Validation][validation] · [Budget][budget] | The owner reports 566 g; document final shell mass, measured current and battery endurance. Installed firmware records do not qualify loaded startup or gait. |

Automatic host takeover, continuous profile replication and higher media targets remain later design work in their owning records. None blocks consolidation.

## Recorded complete

| Item | Evidence / limit |
| --- | --- |
| Durable execution + visual history · **MetaHuman** | [Input continuity][continuity] · [Observation history][observations]. Source and isolated/mocked checks; connected physical acceptance remains in BODY. |
| One-way profile, memory + conversation transfer · **MetaHuman** | [Sep 29 repair and live verification][profile-sync]; not continuous replication. |
| Camera worker, active-walk updates, Body Control sessions + network settings · **Body** | [Sep 30 source and simulated-body coverage][body-push]. MOVE/VISION connect the existing pieces. |
| IMU telemetry and configurable leveling · **Body** | [Dated controller installation and live settings](/posts/2026-10-14-startup-and-leveling/). Loaded leveling remains in IMU above; the desktop ROS toolchain does not establish a robot ROS adapter. |

## Plans, audits, and code

| Scope | Technical authority | Supporting records |
| --- | --- | --- |
| **[Body][body]** | [Body integration][integration] · [Gateway][gateway] | [Documentation map][body-docs] · [Controller][controller] · [Validation][validation] |
| **[MetaHuman][meta]** | [Maintained surface][surface] | [Integration/source map][roadmap] · [Distributed proposal][foundation] · [Host evidence][host-budget] |
| **[Site][web]** | [This queue's source][queue-source] | [Archived site-overhaul record][scratchpad] |

## History

[Original eight-servo build journal](/posts/v1-original-posts/): the restored Google Docs articles on parts, firmware, software, design choices, and early experiments. Full text is now stored on the site, with links to the original documents and the later V1 corrections.

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
