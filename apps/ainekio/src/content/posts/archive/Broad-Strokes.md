---
title: "V1: Broad Strokes — July Status"
published: 2026-07-07
description: "The original July 10 progress snapshot and reading map, preserved as an early project record."
image: "/posts/ainekio/city-battle-banner.webp"
avatarImage: "/assets/avatar/avatar.webp"
authorName: "Ainekio"
authorBio: "Robot familiar project"
showImageOnPost: true
showToc: true
tags: [Ainekio, V1, Original Documents, Build History]
category: "V1 Originals"
draft: false
archive: true
lang: "en"
contentFormat: "report"
reading:
  topic: v1
  generation: v1
  kind: original
  next: body-design-and-hardware
  related: ["body-design-and-hardware", "controller-firmware"]
---

> **Original eight-servo era document.** Copied from the [original Google Doc](https://docs.google.com/document/d/1uv5FAk8vwUOn8M2ttY6TtQT92P0Z5SP95sxKeCuTWRM/edit) on October 12, 2026. The text below retains its own historical status and later additions; “current” refers to the document’s observation period, not today. [All original posts](/posts/v1-original-posts/) · [Current project status](/posts/current-status/).

> The browser simulator described here was subsequently unsuccessful and retired. Its intermediate results and plans are preserved as history.

---

# Ainekio - Broad Strokes

Last verified: 2026-07-10

Ainekio is in the **virtual-first stage**. The current goal is to prove that MetaHuman OS can observe an environment, choose actions, send commands, and receive feedback before any real robot hardware moves.

Get involved: [Ainekio bot repository](https://github.com/Greg-Aster/Ainekio-bot)

## Snapshot

| Area | Progress | State | Read |
| --- | --- | --- | --- |
| Overall project | `███░░░░░░░` ~25% | Site, bridge, motion stack, and a complete parts plan exist. No physical robot yet. | [Overview](/posts/archive/project-overview/) |
| Virtual bridge | `██████░░░░` ~60-65% | Megameal: conversation works; movement routing exists, live in-room retest next. Robot simulator loop works (see motion systems). | [Data bridge](/posts/archive/first-steps-work-in-progress/) |
| Motion systems | `████░░░░░░` ~40% | Python motion module, adapter, and Sesame simulator loop work. Hardware backend not started. | [Motion systems](/posts/archive/motion-systems/) |
| Hardware | `████░░░░░░` ~40% | Board decided: Freenove ESP32-S3 CAM N16R8, direct MCPWM, no PCA9685. Parts list complete; fitment check open. | [Parts overview](/posts/robot-familiar-parts-overview/) |
| Physical build | `░░░░░░░░░░` 0% | No parts bought, chassis printed, or servos wired. Intentionally waiting. | - |

## What Is Happening Now

1. **Virtual environment bridge:** retest the live Megameal loop so the AI can move a player, not just chat.
2. **Motion systems:** port the stock Sesame movement sequences into Ainekio sequence data and keep the simulator loop stable.
3. **Hardware planning:** verify fitment - measure the Sesame body cavity against the Freenove board, 2S 18650 pack, charger, and audio parts before buying anything.

## Current Project Files

| File | Purpose |
| --- | --- |
| [Project overview](/posts/archive/project-overview/) | Broad concept, processing options, parts direction, and physical constraints. |
| [Data bridge](/posts/archive/first-steps-work-in-progress/) | Current virtual environment bridge between MetaHuman OS and Megameal. |
| [Motion systems](/posts/archive/motion-systems/) | Motion stack: semantic commands, adapter, simulator loop, and hardware roadmap. |
| [Parts overview](/posts/robot-familiar-parts-overview/) | Authoritative parts list and power/wiring plan for the physical build. |
| [Design discussion](/posts/discussion/) | Working deliberation: architecture options, hardware comparisons, and open questions. |
| [Broad strokes](/posts/archive/broad-strokes/) | This status index. |

## Key Decisions So Far

- MetaHuman OS is the intelligence layer.
- The robot body should receive semantic commands like `walk`, `stop`, or `speak`, not raw servo angles from a model.
- Safety and stop behavior must live on the body.
- Virtual testing comes before physical movement.
- The body controller is the Freenove ESP32-S3-WROOM CAM N16R8 driving all eight servos directly over MCPWM - no PCA9685, no Pi.
- Power is a 2S 18650 pack with onboard USB-C charging and two MINI560 5A bucks on separate servo and electronics rails.
