---
title: "Original Ainekio V1: The July 2026 Build Journal Archive"
published: 2026-10-12
updated: 2026-11-13
description: "Preserved July 2026 Google Docs archive from the start of Ainekio V1—plus links to the complete V1 ESP32-S3 Systems Guide, CAD layout, and later V2/V3 generations."
image: "/posts/ainekio-v1/v1-cad-three-quarter.webp"
avatarImage: "/assets/avatar/avatar.webp"
authorName: "Ainekio"
showImageOnPost: true
showToc: true
tags: [Ainekio, V1, Build History]
category: "Build History"
draft: false
archive: true
lang: "en"
contentFormat: "report"
reading:
  topic: v1
  generation: v1
  kind: reference
  next: ainekio-v1
  related: ["ainekio-v1", "body-design-and-hardware", "controller-firmware", "v1-v2-comparison"]
---

> **Want a clear, up-to-date explanation of how Ainekio V1 actually works?** Start with the **[Ainekio V1 Systems Guide](/posts/ainekio-v1/)**, which explains V1's complete eight-servo mechanics, dedicated Blender CAD scene, dual-buck `2S` power system, `ESP32-S3` firmware, 38 `.amot` motions, 52 OLED expressions, and `protocol-v1` gateway loop in one place—alongside **[V1 Body & Hardware](/posts/body-design-and-hardware/)** and **[V1 Controller Firmware](/posts/controller-firmware/)**.

## Preserved July 2026 eight-servo notes

The pages indexed below are the **unedited July 2026 Google Docs working notes** written while Ainekio V1 was first being conceived, simulated, ordered, and wired around a Freenove `ESP32-S3-WROOM CAM` and an eight-servo quadruped chassis. For the active `650 g` twelve-servo robot and the upcoming ~1.7× `DS3235` + Linux PC build, see **[Ainekio V2](/posts/ainekio-v2/)**, **[V1 vs. V2 Comparison](/posts/v1-v2-comparison/)**, and **[Ainekio V3 Preview](/posts/ainekio-v3-preview/)**.

Copied verbatim from Google Docs on October 12, 2026 with original source links preserved. Publication dates reflect the original July 2026 posts.

## July 2026 archive index

| Original publication | Article | Contents |
| --- | --- | --- |
| July 4, 2026 | [Robot Familiar Introduction](/posts/archive/project-overview/) | The original idea, the MetaHuman (now Ainekio OS) mind, the body, and initial project ambitions. |
| July 6, 2026 | [First Steps: Virtual Environment](/posts/archive/first-steps-work-in-progress/#original-document-text) | The early Megameal conversation bridge, what was attempted, and its reported results. |
| July 6, 2026 | [Motion Systems](/posts/archive/motion-systems/#original-document-text) | The semantic command path, retired browser simulator experiment, motion module, and eight-servo direction. |
| July 7, 2026 | [Broad Strokes](/posts/archive/broad-strokes/) | The July 10 status snapshot and original project reading map. |
| July 7, 2026 | [Design Discussion](/posts/discussion/) | Hardware alternatives, controller choices, communications, power, fitment, and provisional Generation 2 ideas. |
| July 10, 2026 | [Parts Overview](/posts/robot-familiar-parts-overview/) | Early parts list, dual-buck power diagram, signal map, wiring targets, and assembly considerations. |
| July 15, 2026 | [Firmware](/posts/firmware/) | Initial `ESP32-S3` control, motion, safety, startup, media, and cross-build record. |
| July 15, 2026 | [Software and MetaHuman OS](/posts/software/) | Cognition, memory, model routing, the robot bridge, validation results, and development plans. |

## What changed between these July drafts and the finished V1 robot

Because these July documents were written before physical bring-up completed in August–September 2026, several provisional assumptions changed on the real bench:

- **Custom CAD, firmware & assets (zero external code or meshes retained):** Although early July planning notes referenced an external browser simulator and BOM while scoping ideas, that simulator was retired and the completed Ainekio V1 used 100% custom Blender CAD meshes (`Frame7`/`Frame8`, `R2V10` brackets, serrated lower legs), custom C11 ESP-IDF firmware, and custom motion/OLED assets.
- **Battery pack (`2600 mAh` → `1000 mAh` `2S`):** The `2600 mAh` `18650` pack in the early shopping list proved too bulky for the compact V1 cavity; the built V1 robot used a **Sea Jump `2S` `7.4 V` `1000 mAh` (`2× 14500`) Li-ion pack** with dual `MINI560 PRO` `5 V / 5 A` buck converters and telemetry-only ADC warnings (`7.2 V / 7.0 V / 6.8 V`, retiring the early deep-sleep auto-cutoff draft).
- **Octal PSRAM GPIO remap (`GPIO33/34` → `GPIO47/48`):** `GPIO33–37` are occupied internally by `8 MiB` octal PSRAM on the delivered `N16R8` module, so knee servos `R4/R3` moved to `GPIO47/48`.
- **Delivered camera & expanded asset set:** Delivered boards carried an **`OV3660`** sensor (`XGA` `1024×768` manual `1/60 s` exposure) rather than `OV2640`; LittleFS expanded to **38 `.amot` motions** and **52 `SSD1306` OLED expressions**, and the browser simulator experiment was retired.

### Authoritative V1 engineering references

- **[Ainekio V1 Systems Guide](/posts/ainekio-v1/)** — Complete mechanical, dedicated `'v1 -'` Blender CAD, power, firmware, perception, and `protocol-v1` walkthrough.
- **[V1 Eight-Servo Body & Hardware Reference](/posts/body-design-and-hardware/)** — Final V1 bill of materials, `Frame7`/`Frame8` CAD packaging, and dual-buck power isolation.
- **[V1 ESP32-S3 Controller Firmware Reference](/posts/controller-firmware/)** — Final `ESP32-S3` GPIO map, `MCPWM` servo drive, `vadnet1_medium` audio, and dual-OTA rollback.
- **[ESP32-S3 Build & Firmware Reference — local copy](/posts/v1-originals/esp32-s3-build-reference.md)** ([Original Google Doc](https://docs.google.com/document/d/1JZMMG3J96v6cnw2YupPp9OF9fiw0H4j0tS8t8fsplJk/edit)) · **[System Specification v1.0 — local plain-text copy](/posts/v1-originals/system-specification-v1.txt)** ([Original Google Doc](https://docs.google.com/document/d/1TqrlbjaKIxkAuf-49KdEVl6QT0yXZnAPgf1siMnWOcg/edit)).

[Project overview & status](/posts/project-overview/#project-status) · [Restoration sources and checksums](/posts/v1-originals/sources.json)
