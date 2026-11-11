---
title: "About Ainekio"
description: "Ainekio is a quadruped robot familiar combining a 3D-printed 12-servo closed-loop body (Ainekio-bot) with Ainekio OS (formerly MetaHuman OS) for conversation, episodic memory, 47 cognitive graphs, and autonomous agency."
---

# About Ainekio

Ainekio is a quadruped robot familiar project combining a custom 3D-printed, twelve-servo closed-loop body ([`Greg-Aster/Ainekio-bot`](https://github.com/Greg-Aster/Ainekio-bot)) with **[Ainekio OS (`Greg-Aster/ainekio-os`)](https://github.com/Greg-Aster/ainekio-os)** (formerly MetaHuman OS)—a local-first personal AI operating system for conversation, persistent memory, perception, personality, and task planning. All mechanical design and MuJoCo `MJCF` physics exports are authored in Blender.

## A companion with continuity — powered by Ainekio OS

[Ainekio OS](/posts/ainekio-os/) works both standalone as a personal digital counterpart (`Dual Consciousness`, `Agent`, and `Emulation` modes across Web, `mh` CLI, and Android) and embodied inside the physical quadruped (`Environment` mode). It is anchored by a persistent **Standing Persona** (`persona/core.json`), attributed episodic memory, a 14-table SQLite durable execution store (`executions.sqlite`), and **47 editable Svelte-Flow cognitive graphs** (`etc/cognitive-graphs/`). Rather than treating each prompt as an isolated turn, Ainekio carries context across conversations, physical movements, visual observations, and an 8-stage `02:00 AM` software **Sleep Cycle**—where memories are curated, LoRAs are trained, dreams are recorded with clear provenance, and the **Psychotherapist** agent reviews long-term identity.

Depending on the selected robot autonomy mode—**Reactive**, **Semi Mode** (5-minute signed drive deltas), or **Full Auto Mode** (continuous high-reasoning activity selection)—Ainekio can answer questions, react with varied dry wit to physical tip/shake/stall events (`fast-body-event-mode.json`), pursue multi-step goals, or delegate software and desktop workflows to **Big Brother** (`codex`, `claude-code`, and the warm 2-session `GeminiAcpServer` daemon).

## Two hardware generations

- **V1 (Eight-Servo Baseline)**: Built around a Freenove `ESP32-S3-WROOM CAM` (`N16R8`), eight `MG90S` servos in a Sesame-derived frame, an `OV3660` camera, and a `0.96"` OLED face.
- **V2 (Twelve-Servo Closed-Loop Body)**: A `650 g` (`245.85 × 182.79 × 109.06 mm`) quadruped controlled by a **`Waveshare ESP32-P4-WIFI6`** (`+ ESP32-C6`). Each leg combines shoulder roll with a compact `35/20/28/38/55 mm` linkage driven by `PCA9685` PWM and verified via 4th-wire potentiometer feedback through a `CD74HC4067` multiplexer. Onboard Core 1 executes a DAgger-distilled **`107.8 KB` `int8` MicroDuck neural gait policy** (`720 → 128 → 64 → 32 → 12`) natively at `50 Hz` inside the P4's `128 KB` L2 cache (`0.8.159-p4-microduck-v17`). The front carrier houses a **1.9-inch `ST7789` LCD** (59 animated expressions) and an **`OV5647` MIPI-CSI camera** (`10,000 µs` motion-safe exposure ceiling), paired with a `208 Hz` `LSM6DS3` IMU, onboard `ES8311` / `NS4150B` audio with **`WakeNet9s`**, and a redesigned battery-mounted **Wireless Keeper Bridge** (`2S` `8.4 V` + `Mini560` `5 V / 5 A` + `HiLetgo` USB-C).

## Current status (November 2026)

On-chip `50 Hz` `ESP32-P4` L2-cached MicroDuck neural walking (`+0.213 m/s` forward, `-0.179 m/s` reverse, `±60.9°/s` yaw turn), `600M–800M` Pupper V3 MJX physical hardwood/carpet-seam trials, the Body Control **Cockpit HUD** with optical-flow obstacle range, the `489`-row **Freestyle** motion-recovery dataset, and the consolidated **Ainekio OS** `ServerStatus` hybrid compute/voice runtime are active.

- [Project Overview & System Status](/posts/project-overview/#project-status)
- [Ainekio OS Architecture Guide (`Greg-Aster/ainekio-os`)](/posts/ainekio-os/)
- [How Does Ainekio Stack Up? (Robot Leaderboard & Comparison)](/posts/how-does-ainekio-stack-up/)
- [Ainekio as a Companion](/posts/ainekio-companion/)
- [V2 Hardware & Wiring Reference](/posts/ainekio-v2/)
- [Gait Development & Locomotion Guide](/posts/gait-development/)
- [Field Updates](/updates/)
- [Reference Library](/archive/?kind=reference) · [Original V1 Build Notes](/posts/v1-original-posts/)

## Builder & contact

Ainekio (`Ainekio-bot`) and **Ainekio OS** (`ainekio-os`) are built and maintained by **Greg the Mechanic** ([`@Greg-Aster`](https://github.com/Greg-Aster)). If you have questions about the 3D-printed hardware, closed-loop servo modifications, on-chip neural gait distillation, or Ainekio OS cognitive architecture—or want to get in touch regarding collaboration—reach out anytime:

- **Name**: Greg the Mechanic
- **Email**: [greg@ainek.io](mailto:greg@ainek.io)
- **GitHub**: [github.com/Greg-Aster](https://github.com/Greg-Aster)
- **Project Issues & Discussions**: [Greg-Aster/Ainekio-bot](https://github.com/Greg-Aster/Ainekio-bot) (hardware, firmware, simulator & RL) · [Greg-Aster/ainekio-os](https://github.com/Greg-Aster/ainekio-os) (Ainekio OS cognitive runtime & personal AI OS) · [Hosted Ainekio OS UI (`mh.ainek.io`)](https://mh.ainek.io)
