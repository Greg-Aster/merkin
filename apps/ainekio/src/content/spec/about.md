---
title: "About Ainekio"
description: "Technical documentation and architecture overview for Ainekio, a custom 3D-printed 12-servo quadruped robot paired with Ainekio OS for persistent memory, conversation, and local autonomy."
---

## Design goals

Most small hobby quadrupeds end up in one of two camps: cheap open-loop servo kits that perform scripted waving routines without knowing where their legs actually are, or multi-thousand-dollar research platforms built around industrial actuators. Meanwhile, most "AI desk companions" reset their personality every time a chat session closes.

Ainekio targets the middle ground using roughly **$85 in off-the-shelf parts**:

1. **A small physical body that knows what its joints are doing** ([`Greg-Aster/Ainekio-bot`](https://github.com/Greg-Aster/Ainekio-bot)): twelve inexpensive `MG90S` micro servos modified with a fourth potentiometer feedback wire so the onboard `ESP32-P4` microcontroller can verify joint positions, detect leg stalls, and run a trained neural walking policy right on the chip at `50 Hz`.
2. **A software mind that keeps its own history** ([`Greg-Aster/ainekio-os`](https://github.com/Greg-Aster/ainekio-os), formerly MetaHuman OS): a local-first AI runtime that stores episodic memories, maintains a consistent persona across days, consolidates memories overnight, and treats the robot body as one way of being in the room rather than its entire brain.

All mechanical parts and simulation meshes are modeled in Blender and printed on a desktop FDM printer. Repository source code is licensed under **PolyForm Noncommercial 1.0.0**, with CAD/STL files and model weights under **CC BY-NC-SA 4.0**.

## Two repositories, one companion

- **The Body (`Ainekio-bot`)** covers the `ESP32-P4` real-time firmware, wiring documentation, Blender-to-MuJoCo RL locomotion stack, hardware CAD/model assets, and the local Body Control web cockpit used to drive the robot, watch live camera and joint telemetry, and calibrate servos.
- **The Mind (`ainekio-os`)** runs standalone on a home PC or local server (and connects to the robot over Wi-Fi when the body is powered on). It handles voice transcription and speech synthesis, long-term memory, editable cognitive workflows, and optional delegation to heavier coding or reasoning models when a task calls for more than a fast local model.

## Hardware generations

- **[V1 (Active 8-Servo Quadruped & Clock-Spring Arm Upgrade)](/posts/ainekio-v1/)**: Functioning eight-servo `ESP32-S3` physical quadruped with dual `MINI560` `5 V` buck rails, an `OV3660` camera, `vadnet1_medium` neural VAD audio, 38 `.amot` keyframe motions, and a `0.96"` `SSD1306` OLED running all `59` procedural V2-derived expressions (`303` frames)—actively advancing in hardware and CAD (`Scene 'v1'`, `174.8 × 155.5 × 84.1 mm`, `174` active meshes) with squared `36.2 mm` vertical-knee `R2V10` arms, concentric 3-part under-arm 4-wire clock-springs, `Frame8` clock-spring bays, `21,216`-vert sculpted spiked lower legs, `683ZZ` hip counter-bearings, and an upgraded `ESP32-P4-WIFI6` + `PCA9685` + 8× 4th-wire feedback + `GY-LSM6DS3` IMU + `Arducam B0066` deck.
- **[V2 (Autumn 2026 — Twelve-Servo Closed-Loop Quadruped & Virtual Twin)](/posts/ainekio-v2/)**: A `650 g` four-legged rebuild around a `Waveshare ESP32-P4-WIFI6`. Each leg adds shoulder roll plus a compact `35/20/28/38 mm` four-bar knee linkage with fourth-wire analog feedback (`CD74HC4067`) and per-channel `I²t` thermal cutoff, running on-chip `50 Hz` MicroDuck walking, `50 Hz` `NeuralPose v8-calibrated` carpet recovery, and `50 Hz` `NeuralPosePresence`—and mirrored as an alpha virtual twin inside **[`game.megameal`](/posts/gateway-and-simulator/#game-megameal-simulator)** (`500 Hz` MuJoCo + compiled ESP32-P4 firmware in a browser 3D world).
- **[V3 (In Development — Heavy-Equipment Armored `DS3235` & Onboard Linux SBC)](/posts/ainekio-v3-preview/)**: A `537`-mesh armored `DS3235` Blender CAD assembly (`402.0 × 236.5 × 343.1 mm` neutral exported envelope with whip antenna) built on the **`Option A-1` compact 5-link pantograph (`54 / 22 / 46 / 56 / 135 mm`, `+120%` vertical lift, `0.93:1` dual-servo balance)**, combining a `3,860`-vert lap-jointed belly chassis tub, `Clip 26` leaf-spring clamshell latches, a `2.0 mm` rear piano hinge, recessed `AINEKIO V-003` front fender arches, a `2.8"` `MSP2807` (`ILI9341`) Cyclops vault TFT, `4× 21700` (`2S2P`) belly power, and **both a `Radxa Dragon Q6A` Linux SBC and `ESP32-P4-WIFI6` motor controller inside the hull**.

## Documentation index

- **[System Overview](/posts/project-overview/)** — How the physical robot, local control gateway, and Ainekio OS fit together.
- **[How Does Ainekio Stack Up?](/posts/how-does-ainekio-stack-up/)** — Engineering and BOM comparison against commercial and open-source quadrupeds.
- **[Build Journal](/updates/)** — Dated progress entries from single-leg linkage prints through carpet trials and on-chip neural walking.
- **[Photo, Video & Diagram Gallery](/gallery/)** — Floor walking videos, hardware photos, MuJoCo training rollouts, and pinout diagrams.
- **[Ainekio OS Guide](/posts/ainekio-os/)** & **[V2 Hardware Reference](/posts/ainekio-v2/)** — Architecture notes for the software mind and active physical body.
- **[Ainekio V1 Systems Guide](/posts/ainekio-v1/)** & **[V3 CAD & Linux PC Preview](/posts/ainekio-v3-preview/)** — Systems breakdown of the active 8-servo V1 robot ([plus early July 2026 planning notes](/posts/v1-original-posts/)) and the upcoming `DS3235` V3 build.

## Builder & contact

Ainekio and Ainekio OS are built by **Greg the Mechanic** ([`@Greg-Aster`](https://github.com/Greg-Aster)).

- **Email**: [greg@ainek.io](mailto:greg@ainek.io)
- **GitHub**: [github.com/Greg-Aster](https://github.com/Greg-Aster) · [Ainekio-bot](https://github.com/Greg-Aster/Ainekio-bot) · [ainekio-os](https://github.com/Greg-Aster/ainekio-os)
