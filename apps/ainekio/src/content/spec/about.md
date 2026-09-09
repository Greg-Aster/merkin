---
title: "About Ainekio"
description: "A small robot companion, the software behind it, and the work toward a new body."
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

The planned V2 adds a third joint to each leg for twelve servos in total, an
ESP32-P4 controller, and a new chassis. Experimental leg work is underway.
The [V2 roadmap](/posts/ainekio-v2/) explains what the extra joints are for and
how the design will be tested.

At the same time, the [MetaHuman redesign](/posts/metahuman-integration/) saves
a request’s objective and progress. That lets work wait for a robot result,
receive a correction, or resume after a restart without losing its place.
The integration remains under development.

## Finding your way around the guide

Start with the [project overview](/posts/project-overview/) for how the pieces
fit together, or [the dated status report](/posts/current-status/) for reported
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

V2 evaluates [OpenHarmony Puppy](https://oshwhub.com/pcbguy/shi-er-zi-you-du-hong-meng-si-zu-gou-gou)
leg geometry with an Ainekio-specific chassis. Current banners, covers, and the
avatar are generated concept art: a shorter, broader body with serrated red legs
and a cyan face. The comparison image keeps V1 on the left and prospective V2
on the right. Final geometry, materials, and electronics depend on testing.

The dystopian science-fiction settings are visual humor and inspiration; they
do not depict hardware tests. Earlier artwork based on V1 remains with
historical material.

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
