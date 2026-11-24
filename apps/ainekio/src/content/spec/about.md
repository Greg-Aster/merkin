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

## Three repositories, one companion

- **The Body (`Ainekio-bot`)** covers the unified `ESP32-P4` real-time firmware (`body_v1.c`, `body_v2.c`, `body_v3.c`), wiring documentation, Blender-to-MuJoCo RL locomotion stack, hardware CAD/model assets, and the local Body Control web cockpit used to drive the robot, watch live camera and joint telemetry, and run automated 4th-wire + IMU servo calibration.
- **The Mind (`ainekio-os`)** runs standalone on a home PC or local server (and connects to the robot over Wi-Fi when the body is powered on). It handles voice transcription and speech synthesis, long-term memory, editable cognitive workflows, and optional delegation to heavier coding or reasoning models when a task calls for more than a fast local model.
- **The 3D Simulation Engine ([`@ainekio/engine`](https://github.com/Greg-Aster/ainekio-engine))** powers the live browser simulator at **[`simulator.ainek.io`](https://simulator.ainek.io/)**, compiling `500 Hz` MuJoCo WASM and real `ESP32-P4` C firmware client-side across V1, V2, and V3 in 6 playable 3D worlds with PeerJS multiplayer rooms and optional Body Control WebSocket bridging.

## Hardware generations

- **[V1 (Active 8-Servo Quadruped, Clock-Spring Arms & Unified P4 Firmware)](/posts/ainekio-v1/)**: Functioning eight-servo physical quadruped (`174.8 × 155.5 × 84.1 mm`, `174` active CAD meshes) with squared `36.2 mm` vertical-knee `R2V10` arms, concentric 3-part under-arm 4-wire clock-springs, `Frame8` clock-spring bays, `21,216`-vert sculpted spiked lower legs, and `683ZZ` hip counter-bearings—upgraded onto unified `ESP32-P4` firmware (`body_v1.c`, direct 8-channel ADC feedback, `0.96"` `SSD1306` OLED running all `59` procedural expressions), running trained `v1-microduck-p4` (`53.7 KB`) walking and `neural_pose_v1` emotes, and playable live in **[`simulator.ainek.io`](https://simulator.ainek.io/)**.
- **[V2 (Active 650 g 12-Servo Closed-Loop Quadruped & Live Sim Twin)](/posts/ainekio-v2/)**: A `650 g` four-legged rebuild around a `Waveshare ESP32-P4-WIFI6`. Each leg adds shoulder roll plus a compact `35/20/28/38 mm` four-bar knee linkage with fourth-wire analog feedback (`CD74HC4067`), automated 4th-wire + IMU servo calibration, and per-channel `I²t` thermal cutoff, running on-chip `50 Hz` MicroDuck walking, `50 Hz` `NeuralPose v8-calibrated` carpet recovery, and `50 Hz` `NeuralPosePresence`—and mirrored live as a `500 Hz` MuJoCo + compiled firmware digital twin inside **[`simulator.ainek.io`](https://simulator.ainek.io/)**.
- **[V3 (Live in 3D Simulator — Armored `DS3225 PRO` & Self-Leveling Ankles, Physical Print Pending)](/posts/ainekio-v3-preview/)**: An armored quadruped (`406.4 × 236.5 × 385.6 mm`) built around `12× DS3225 PRO HV` coreless servos and `Option A-1` 4-bar linkages paired with **2-stage double-parallelogram self-leveling pivoting crawler feet**, a `3,860`-vert lap-jointed belly chassis tub, `Clip 26` leaf-spring clamshell latches, recessed `AINEKIO V-003` front fender arches, a **panoramic `2.8"` `ILI9341` Cyclops eye (`face_cyclops.c`)**, `4× 21700` (`2S2P`) belly power, and **both a `Radxa Dragon Q6A` Linux SBC and unified `ESP32-P4-WIFI6` firmware (`body_v3.c`)**. Trained `v3-microduck-p4` (`66.9 KB`) walking and `neural_pose_v3` postures are already playable live in **[`simulator.ainek.io`](https://simulator.ainek.io/#model=v3)** while physical printing is pending.

## Documentation index

- **[3D Web Simulator (`simulator.ainek.io`)](https://simulator.ainek.io/)** & **[Gateway & Simulator Guide](/posts/gateway-and-simulator/)** — Drive V1, V2, and V3 live in your browser across 6 playable 3D worlds with PeerJS multiplayer or local Body Control WebSocket bridging.
- **[System Overview](/posts/project-overview/)** — How the physical robot, local control gateway, and Ainekio OS fit together.
- **[How Does Ainekio Stack Up?](/posts/how-does-ainekio-stack-up/)** — Engineering and BOM comparison against commercial and open-source quadrupeds.
- **[Build Journal](/updates/)** — Dated progress entries from single-leg linkage prints through carpet trials, on-chip neural walking, and unified P4 firmware.
- **[Photo, Video & Diagram Gallery](/gallery/)** — Floor walking videos, hardware photos, MuJoCo training rollouts, and pinout diagrams.
- **[Ainekio OS Guide](/posts/ainekio-os/)** & **[V2 Hardware Reference](/posts/ainekio-v2/)** — Architecture notes for the software mind and active physical body.
- **[Ainekio V1 Systems Guide](/posts/ainekio-v1/)** & **[V3 Armored CAD & Simulator Guide](/posts/ainekio-v3-preview/)** — Systems breakdown of the active 8-servo V1 robot ([plus early July 2026 planning notes](/posts/v1-original-posts/)) and the `DS3225 PRO` V3 platform.

## Builder & contact

Ainekio and Ainekio OS are built by **Greg the Mechanic** ([`@Greg-Aster`](https://github.com/Greg-Aster)).

- **Live Simulator**: [simulator.ainek.io](https://simulator.ainek.io/)
- **Email**: [greg@ainek.io](mailto:greg@ainek.io)
- **GitHub**: [github.com/Greg-Aster](https://github.com/Greg-Aster) · [Ainekio-bot](https://github.com/Greg-Aster/Ainekio-bot) · [ainekio-os](https://github.com/Greg-Aster/ainekio-os) · [ainekio-engine](https://github.com/Greg-Aster/ainekio-engine)
