---
title: "About Ainekio"
description: "Personal build notes and technical documentation for Ainekio, a custom 3D-printed 12-servo quadruped robot paired with Ainekio OS for persistent memory, conversation, and local autonomy."
---

## Why I'm building Ainekio

Most small hobby quadrupeds end up in one of two camps: cheap open-loop servo kits that perform scripted waving routines without knowing where their legs actually are, or multi-thousand-dollar research platforms built around industrial actuators. Meanwhile, most "AI desk companions" reset their personality every time a chat session closes.

Ainekio is an experiment in building the middle ground at home for roughly **$85 in off-the-shelf parts**:

1. **A small physical body that knows what its joints are doing** ([`Greg-Aster/Ainekio-bot`](https://github.com/Greg-Aster/Ainekio-bot)): twelve inexpensive `MG90S` micro servos modified with a fourth potentiometer feedback wire so the onboard `ESP32-P4` microcontroller can verify joint positions, detect leg stalls, and run a trained neural walking policy right on the chip at `50 Hz`.
2. **A software mind that keeps its own history** ([`Greg-Aster/ainekio-os`](https://github.com/Greg-Aster/ainekio-os), formerly MetaHuman OS): a local-first AI runtime that stores episodic memories, maintains a consistent persona across days, consolidates memories overnight, and treats the robot body as one way of being in the room rather than its entire brain.

All mechanical parts and simulation meshes are modeled in Blender and printed on a desktop FDM printer. Source code across both repositories is available for personal, academic, and non-commercial use under the **PolyForm Noncommercial License 1.0.0**, with hardware CAD/STL files and trained model weights in [`Greg-Aster/Ainekio-bot`](https://github.com/Greg-Aster/Ainekio-bot) licensed under **CC BY-NC-SA 4.0**.

## Two repositories, one companion

- **The Body (`Ainekio-bot`)** covers the `ESP32-P4` real-time firmware, wiring documentation, Blender-to-MuJoCo RL locomotion stack, hardware CAD/model assets, and the local Body Control web cockpit used to drive the robot, watch live camera and joint telemetry, and calibrate servos.
- **The Mind (`ainekio-os`)** runs standalone on a home PC or local server (and connects to the robot over Wi-Fi when the body is powered on). It handles voice transcription and speech synthesis, long-term memory, editable cognitive workflows, and optional delegation to heavier coding or reasoning models when a task calls for more than a fast local model.

## Hardware generations

- **[V1 (Summer 2026 — Eight-Servo `ESP32-S3` Baseline)](/posts/ainekio-v1/)**: The original eight-servo `ESP32-S3` quadruped (`177.5 × 194.1 × 88.9 mm` in its dedicated Blender CAD scene) with dual `MINI560` `5 V` buck rails, a `0.96"` `SSD1306` OLED rendering 52 expressions, an `OV3660` camera, `vadnet1_medium` neural VAD audio, and 38 `.amot` keyframe motions. It proved out the complete `protocol-v1` + Ainekio OS loop and exposed every mechanical limit that drove V2.
- **[V2 (Autumn 2026 — Twelve-Servo Closed-Loop Quadruped)](/posts/ainekio-v2/)**: A `650 g` four-legged rebuild around a `Waveshare ESP32-P4-WIFI6`. Each leg adds shoulder roll plus a compact four-bar knee linkage with fourth-wire analog feedback through a `CD74HC4067` multiplexer. Up front sit a `1.9"` color LCD with 59 animated expressions and a chin-mounted `OV5647` camera, backed by an `LSM6DS3` IMU, onboard wake-word audio, and a rear `2S` battery carrier.
- **[V3 (In Development — ~1.7× Scale `DS3235` & Mobile Linux PC)](/posts/ainekio-v3-preview/)**: A shelled `337.9 × 200.2 × 176.8 mm` Blender CAD and hardware architecture built around waterproof high-torque `DS3235` servos, bearing-supported trussed four-bar legs, a `2S2P` `21700` battery floor cradle, and **both an `ESP32-P4` motor controller and a Wi-Fi/Bluetooth Linux SBC inside the chassis**—driving a **`5.0"` `1280×720` capacitive touchscreen face** that can switch from companion expressions straight into a full Linux desktop with a mouse and keyboard.

## Where to look around

If you just stumbled across the site, these pages give the clearest tour without requiring any background in the codebase:

- **[System Overview](/posts/project-overview/)** — How the physical robot, local control gateway, and Ainekio OS fit together today.
- **[How Does Ainekio Stack Up?](/posts/how-does-ainekio-stack-up/)** — Where an `$85` 3D-printed quadruped sits next to commercial and open-source robots, and why I picked these trade-offs.
- **[Build Journal](/updates/)** — Dated workbench entries from the first single-leg linkage prints through carpet trials and on-chip neural walking.
- **[Photo, Video & Diagram Gallery](/gallery/)** — Real floor walking videos, workbench photos, MuJoCo training rollouts, and complete pinout diagrams.
- **[Ainekio OS Guide](/posts/ainekio-os/)** & **[V2 Hardware Reference](/posts/ainekio-v2/)** — Deeper architectural notes for the software mind and active physical body.
- **[Ainekio V1 Systems Guide](/posts/ainekio-v1/)** & **[V3 CAD & Linux PC Preview](/posts/ainekio-v3-preview/)** — Full systems breakdown of the 8-servo `ESP32-S3` V1 robot ([plus its July archive](/posts/v1-original-posts/)) and the upcoming `DS3235` V3 build.

## Builder & contact

Ainekio and Ainekio OS are built by **Greg the Mechanic** ([`@Greg-Aster`](https://github.com/Greg-Aster)). If you're building something similar, modifying hobby servos for closed-loop control, or have a question about any part of the notes here, feel free to send an email or open a discussion on GitHub:

- **Email**: [greg@ainek.io](mailto:greg@ainek.io)
- **GitHub**: [github.com/Greg-Aster](https://github.com/Greg-Aster) · [Ainekio-bot](https://github.com/Greg-Aster/Ainekio-bot) · [ainekio-os](https://github.com/Greg-Aster/ainekio-os)
