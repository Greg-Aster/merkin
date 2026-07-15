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
  status: Firmware and physical build
  location: Robot body
  updated: 2026-07-13
  mileage: "v0.2.0"
  section: Firmware started, first leg parts printed
  nextStop: Receive and inspect parts, then begin staged hardware bring-up
  note: >
    Firmware work is underway, the first leg parts are printed, and
    the selected hardware has been ordered. Physical assembly and
    hardware validation are still ahead.
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

Too much thinking and looking at tables. Am going for esp 32 chip mainly becasue cost and availability.

## 2026-07-11 | Power system and documentation cleanup
Location: Robot body and OS bridge
Mileage: v0.2.0

A full documentation pass: swept stale references out of every project doc, fixed contradictions in the parts list, gave each doc a single owned topic, and merged the old Broad Strokes status page and Project Overview into one Overview &amp; Status page. Complete shopping list is written - nothing bought yet, on purpose.

## 2026-07-13 | Firmware and first printed parts
Location: Robot body
Mileage: v0.2.0

Started the ESP32-S3 firmware, printed the first leg parts, and ordered the hardware.

## 2026-07-14 | Firmware and Software

Mileage: v0.2.1

Made 2 documents - Sofware, Firmware. Working on bridge and firmware systems.
