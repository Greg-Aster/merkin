---
title: "About Ainekio"
description: "Ainekio is a quadruped robot familiar combining a 3D-printed 12-servo closed-loop body with MetaHuman OS for conversation, memory, perception, and autonomous agency."
---

# About Ainekio

Ainekio is a quadruped robot familiar project combining a custom 3D-printed, twelve-servo closed-loop body with [MetaHuman OS](https://github.com/Greg-Aster/metahuman-os) for conversation, persistent memory, perception, personality, and task planning. All mechanical design and MuJoCo `MJCF` physics exports are authored in Blender.

## A companion with continuity

Ainekio is built around a persistent **Standing Persona** (`persona/core.json`), attributed episodic memory, and editable cognitive node graphs (`environment-mode.json`). Rather than treating each prompt as an isolated turn, Ainekio carries context across conversations, physical movements, visual observations, and software Sleep maintenance cycles—where memories are curated, dreams and reflections are recorded with clear source attribution, and the **Psychotherapist** agent reviews long-term identity.

Depending on the selected autonomy mode—**Reactive**, **Semi Mode** (5-minute signed drive deltas), or **Full Auto Mode** (continuous high-reasoning activity selection)—Ainekio can answer questions, react immediately to physical tip/shake/stall events (`fast-body-event-mode.json`), pursue multi-step goals, or delegate software and desktop workflows to **Big Brother** (`TerminalChat.svelte` / `big-brother-tool-mode.json`).

## Two hardware generations

- **V1 (Eight-Servo Baseline)**: Built around a Freenove `ESP32-S3-WROOM CAM` (`N16R8`), eight `MG90S` servos in a Sesame-derived frame, an `OV3660` camera, and a `0.96"` OLED face.
- **V2 (Twelve-Servo Closed-Loop Body)**: A `650 g` (`245.85 × 182.79 × 109.06 mm`) quadruped controlled by a **`Waveshare ESP32-P4-WIFI6`** (`+ ESP32-C6`). Each leg combines shoulder roll with a compact `35/20/28/38/55 mm` linkage driven by `PCA9685` PWM and verified via 4th-wire potentiometer feedback through a `CD74HC4067` multiplexer. The front carrier houses a **1.9-inch `ST7789` LCD** (58 animated expressions) and an **`OV5647` MIPI-CSI camera** (`10,000 µs` motion-safe exposure ceiling), paired with a `208 Hz` `LSM6DS3` IMU, onboard `ES8311` / `NS4150B` audio with **`WakeNet9s`**, and a rear two-level `2S` (`8.4 V`) + `Mini560` (`5 V / 5 A`) + `HiLetgo` USB-C power carrier.

## Current status (November 2026)

Closed-loop `Stand` (`2 mm` settle) and `Walk` execution, `0.8.150` Cartesian workspace boundary projection, the 349-example SQLite **Freestyle** motion library, `50 Hz` neural gait streaming (`walk_nominal_v1`) on physical carpet, and **Stock Pupper V3 + full-CAD Ainekio MJCF reinforcement learning** in JAX/Brax/MuJoCo MJX are active alongside the unified `llama-cpp.service` MetaHuman OS runtime.

- [Project Overview & System Status](/posts/project-overview/#project-status)
- [Ainekio as a Companion](/posts/ainekio-companion/)
- [V2 Hardware & Wiring Reference](/posts/ainekio-v2/)
- [Gait Development & Locomotion Guide](/posts/gait-development/)
- [Field Updates](/updates/)
- [Reference Library](/archive/?kind=reference) · [Original V1 Build Notes](/posts/v1-original-posts/)

## Builder & contact

Ainekio and MetaHuman OS are built and maintained by **Greg the Mechanic** ([`@Greg-Aster`](https://github.com/Greg-Aster)). If you have questions about the 3D-printed hardware, closed-loop servo modifications, MuJoCo/MJX training, or cognitive architecture—or want to get in touch regarding collaboration—reach out anytime:

- **Name**: Greg the Mechanic
- **Email**: [greg@ainek.io](mailto:greg@ainek.io)
- **GitHub**: [github.com/Greg-Aster](https://github.com/Greg-Aster)
- **Project Issues & Discussions**: [Greg-Aster/Ainekio-bot](https://github.com/Greg-Aster/Ainekio-bot) (hardware, firmware, simulator & RL) · [Greg-Aster/metahuman-os](https://github.com/Greg-Aster/metahuman-os) (cognitive runtime & companion brain) · [Hosted MetaHuman UI (`mh.ainek.io`)](https://mh.ainek.io)
