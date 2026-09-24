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

V2 adds a third joint to each leg for twelve servos, with an ESP32-P4 body
controller. The **September 24 update** documents the red shell, compact mask
mounts, reinforced tabs and a modeling layout now 80 mm across the support
walls. The underside is being fitted around a removable 10,000 mAh Anker bank
with integrated charging, no separate buck converter and a planned plug-in Qi
add-on. Battery life has not been measured.

The new [V1/V2 comparison](/posts/v1-v2-comparison/) places motion ranges,
capabilities, processing and the two power arrangements side by side. The
[body and battery entry](/posts/2026-09-24-body-and-battery/) follows the fit
experiments. The [gait journal](/posts/gait-development/) includes a Blender
showcase and the current Walk, Run, Crawl and Crab controls, reviewed gestures
and September 24 firmware deployment. Flash and boot are verified in that
record; complete-body loaded walking remains unverified.

The [V2 assembly guide](/posts/ainekio-v2/) retains the earlier parts, geometry
alternatives, print exports and prototype photographs.

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

The portal now shows a September 23 CAD motion-export frame of the red body.
The dystopian science-fiction illustrations remain with the
[project overview](/posts/project-overview/) and earlier design articles.
They are labeled AI-generated concept art. Technical posts show dated CAD
views, renders of exported parts and physical prototype photographs; each has
its own evidence and date.

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
