---
title: "About Ainekio"
description: "Ainekio's continuing build journal: a working eight-servo robot, twelve-servo chassis and leg development, prototype printing and gait experiments."
---

# About Ainekio

Ainekio is an owner-built, four-legged robot companion with a camera, microphone,
speaker, and a face on a small display. The project combines printed mechanics
with MetaHuman OS, software for conversation, memory, and decisions.

The robot’s controller runs the hardware and checks movement limits. MetaHuman
chooses supported actions and reviews the results that come back. The aim is a
companion that can follow a request through several steps while keeping track
of what it was asked to do.

## What exists, and what is changing

The working V1 has eight joint motors, or servos, and an ESP32-S3 controller.
Motion commands and audible playback have been demonstrated. Reliable repeated
conversation and the revised software’s physical operation still need testing.

V2 adds a third joint to each leg for twelve servos in total, with an ESP32-P4
selected as the controller. Recent work has concentrated on modeling the
chassis and legs and printing prototype assemblies. The **September 21 review**
documents a chassis narrowed from 103 to 51.2 mm, compact 22/36/55 mm leg
geometry, a horn pocket revised after a failed printed fit, and a developing
pale outer shell. Those dimensions belong to dated iterations, not a final
parts specification.

The [V2 parts and assembly record](/posts/ainekio-v2/) connects the
[chassis](/posts/2026-09-21-chassis-packaging/),
[leg](/posts/2026-09-21-compact-leg-design/) and
[shell](/posts/2026-09-21-shell-design/) updates. The
[gait journal](/posts/gait-development/) now includes calculated motion studies
and compact single-leg probes. Fit, clearance, calibration and loaded motion
of the latest complete body still need validation.

At the same time, the [MetaHuman redesign](/posts/metahuman-integration/) saves
a request’s objective and progress. That lets work wait for a robot result,
receive a correction, or resume after a restart without losing its place.
The integration remains under development.

## Finding your way around the guide

Start with the [project overview](/posts/project-overview/) for how the pieces
fit together, or [current project status](/posts/current-status/) for reported
results and remaining work. The other articles cover hardware, firmware,
commands, the network connection, camera, speech, and autonomy modes.

The distinction between a plan, implemented code, and a physical result matters
throughout the guide. For example, software can correctly report that a walk
finished without establishing that the robot reached better light. That visual
goal would need a fresh image as evidence.

Source code is split between the [Ainekio robot repository](https://github.com/Greg-Aster/Ainekio-bot)
for the body and connection software, and [MetaHuman OS](https://github.com/Greg-Aster/metahuman-os)
for conversation, reasoning, and work scheduling.

## Design history and artwork

V1’s mechanics derive from the Apache-2.0-licensed
[Sesame Robot Project](https://github.com/dorianborian/sesame-robot). Construction
photos show its low open black chassis, red feet and face, cyan display, camera,
and exposed wiring. The repository’s Frame8 design files record enclosure work;
the files alone do not identify which enclosure is installed.

V2 began by evaluating [OpenHarmony Puppy](https://oshwhub.com/pcbguy/shi-er-zi-you-du-hong-meng-si-zu-gou-gou)
leg geometry with an Ainekio-specific chassis. The continuing journal records
the changes since that starting point, including alternative linkages and
compact printed parts.

The portal artwork interprets the September 20 CAD assembly: a narrow dark
chassis, pale layered shell and exposed red links. It is AI-generated concept
art in the site's dystopian science-fiction style. Technical posts separately
show dated CAD views, renders of the exported parts, and physical prototype
photographs. These images serve different purposes; artwork does not establish
a finished build or a hardware test. Earlier illustrations remain with the
design history they accompanied.

The simulator experiment was unsuccessful and is fully retired. Its
[motion notes](/posts/archive/motion-systems/) and the earlier
[virtual-environment notes](/posts/archive/first-steps-work-in-progress/) explain
what was attempted and how it relates to the project’s history.

## Documentation and privacy

Current source and fresh results take precedence over older plans. Corrections
are dated, and historical articles identify the period they describe.
Operational results are summarized without publishing personal profiles,
memories, captured media, runtime logs, credentials, tokens, model weights,
or local state.
