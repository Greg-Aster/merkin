---
title: Ainekio Updates
journalTitle: Project Notes
labels:
  status: Status
  location: Area
  section: Focus
  mileage: Version
  nextStop: Next
  updated: Updated
current:
  status: Hardware planning
  location: Robot body
  updated: 2026-07-11
  mileage: "v0.2.0"
  section: Parts list complete, fitment check next
  nextStop: Verify body fit against the chosen parts, then buy them
  note: >
    The board, power system, and full parts list are decided.
    Remaining work before purchase is fitment: measure the Sesame
    body cavity against the Freenove board, 18650 pack, and audio parts.
---

## 2026-07-04 | Site scaffold
Location: Website
Mileage: v0.1.0

Started the Ainekio static site in the Merkin monorepo under `apps/ainekio`, and wired to use `ainek.io`. Made github repo fo Anekio project 'https://github.com/Greg-Aster/Ainekio-bot'.

## 2026-07-06 | First Steps
Location: Website
Mileage: v0.1.0

Coding work on bridge between OS and virtual enviornment,


## 2026-07-07 | Simulation
Location: Website
Mileage: v0.1.0

Heavy work on virtual avatar and environment - basic motion module integration groundwork. Website beautification. Google docs bridge for document editing support.

## 2026-07-08 | Simulator loop working
Location: OS bridge and motion systems
Mileage: v0.1.0

The motion stack went from plan to working loop. Environment Mode now treats Ainekio as a generic robot environment: natural language in, typed semantic commands out (`walk`, `wave`, `stop` - never raw servo angles). The Ainekio adapter receives pushed actions over a persistent event stream (no polling), runs them through a safety boundary, and drives the stock Sesame simulator through its own UART command path. Nineteen named routines mapped, core sequences ported to Python, unit tests passing.

## 2026-07-10 | Hardware decided
Location: Robot body
Mileage: v0.2.0

Worked through the first real hardware plan and found the main constraint is power and body packaging, not just picking a controller. That work landed on a decision: the body controller is a Freenove ESP32-S3-WROOM CAM (N16R8 - the PSRAM matters for camera streaming). The S3 drives all eight MG90S servos directly over MCPWM, which eliminates the PCA9685 expander entirely and keeps the hand-wired Sesame servo rail. The earlier Pi Zero 2 W path is superseded. Audio is settled too: INMP441 I2S mic, MAX98357A amp, 28mm speaker, OLED face.

## 2026-07-11 | Power system and documentation cleanup
Location: Robot body and OS bridge
Mileage: v0.2.0

Chose the safer split between the OS brain and the robot body: the OS sends intent-level commands, while the body owns power, motion safety, and fit checks. The power spine is fully specified: 2S 18650 protected pack, USB-C boost charger board behind a panel-mount port so the robot charges like a phone, master rocker switch, and two MINI560 5A bucks on separate servo and electronics rails. Battery voltage divider gives a low-battery voice warning at ~7.0V and parks the servos at ~6.8V.

Also did a full documentation pass: swept stale Pi/PCA9685 references out of every project doc, resolved internal contradictions in the parts list, gave each doc a single owned topic, and merged the old Broad Strokes status page and Project Overview into one Overview &amp; Status page. Complete shopping list is written - nothing bought yet, on purpose, until the body cavity is measured against the chosen parts.