---
title: "Original Ainekio: the Eight-Servo Build Journal"
published: 2026-10-12
description: "The original Google Docs posts, restored in full: parts, firmware, software, design decisions, and the experiments that preceded the eight-servo robot."
image: "/posts/ainekio/wizard-lab-banner.webp"
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
  next: archive/project-overview
  related: ["body-design-and-hardware", "controller-firmware"]
---

## Original eight-servo notes

These are the original Google Docs articles behind the eight-servo Ainekio project, including the earlier virtual-environment experiments. The original robot used an ESP32-S3 and a Sesame-derived body, with two servos per leg. The later twelve-servo robot has its own [build record](/posts/ainekio-v2/) and [side-by-side comparison](/posts/v1-v2-comparison/).

Copied from Google Docs on October 12, 2026. Original source links are included.

Publication dates are from the original site. The documents include later additions, including early Generation 2 proposals.

## Journal

| Original publication | Article | Contents |
| --- | --- | --- |
| July 4, 2026 | [Robot Familiar Introduction](/posts/archive/project-overview/) | The original idea, the MetaHuman brain, the body, and the author's project ambitions. |
| July 6, 2026 | [First Steps: Virtual Environment](/posts/archive/first-steps-work-in-progress/#original-document-text) | The Megameal conversation bridge, what was attempted, and its reported results. |
| July 6, 2026 | [Motion Systems](/posts/archive/motion-systems/#original-document-text) | The semantic command path, simulator experiment, motion module, and eight-servo hardware direction. |
| July 7, 2026 | [Broad Strokes](/posts/archive/broad-strokes/) | The July 10 status snapshot and original project reading map. |
| July 7, 2026 | [Design Discussion](/posts/discussion/) | Hardware alternatives, controller choices, communications, power, fitment, and later provisional Generation 2 ideas. |
| July 10, 2026 | [Parts Overview](/posts/robot-familiar-parts-overview/) | The full parts list, power diagram, signal map, wiring targets, and assembly considerations. |
| July 15, 2026 | [Firmware](/posts/firmware/) | The ESP32-S3 control, motion, safety, startup, media, and cross-build record. |
| July 15, 2026 | [Software and MetaHuman OS](/posts/software/) | Cognition, memory, model routing, the robot bridge, validation results, and development plans. |

## Later V1 revisions

The early documents include proposals that changed. The older parts list specified a 2600 mAh pack; the V1 build later used a **1000 mAh** pack. The provisional GPIO33/34 assignments were superseded because GPIO33–37 are occupied by octal PSRAM on the delivered N16R8 board. The simulator was unsuccessful and retired.

- [V1 hardware and body design](/posts/body-design-and-hardware/) records the later eight-servo components and power arrangement.
- [Controller firmware](/posts/controller-firmware/) points to the maintained S3 firmware and pin map.
- [ESP32-S3 Build & Firmware Reference — local document copy](/posts/v1-originals/esp32-s3-build-reference.md) preserves the September 2 reference linked by those guides. [Original Google Doc](https://docs.google.com/document/d/1JZMMG3J96v6cnw2YupPp9OF9fiw0H4j0tS8t8fsplJk/edit).
- [System Specification v1.0 — local plain-text copy](/posts/v1-originals/system-specification-v1.txt) preserves the additional specification URL in the site's original source list. It is a historical protocol and implementation plan, not a current wiring authority. [Original Google Doc](https://docs.google.com/document/d/1TqrlbjaKIxkAuf-49KdEVl6QT0yXZnAPgf1siMnWOcg/edit).

[Current project status](/posts/current-status/) · [Development tracker](/project-guide/) · [Restoration sources and checksums](/posts/v1-originals/sources.json)
