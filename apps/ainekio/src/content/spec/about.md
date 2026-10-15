---
title: "About Ainekio"
description: "Ainekio is a robot familiar in development: a physical companion with conversation, personality, memory, perception and reviewed learning."
---

# About Ainekio

Ainekio is my robot familiar project: a printed four-legged body connected to
[MetaHuman OS](https://github.com/Greg-Aster/metahuman-os) for conversation,
memory, perception, and task planning. The body controller handles motor timing
and movement limits. All mechanical design is done in Blender.

## A companion with continuity

The aim is a recognizable personality that carries experience from one
interaction to the next. Ainekio should be able to talk, notice its surroundings,
express itself, remember useful context, pursue goals and learn from reviewed
experience. Reflection, dreams and daydreams are intended to contribute internal
material for later interaction, with imagination distinguished from observations.

MetaHuman's editable node workflows connect these functions. Recent context,
persistent memory and model training each play a different role in continuity.
The complete companion experience is still under development, including reliable
recall and sustained autonomous activity. [The companion guide](/posts/ainekio-companion/)
explains the functions and their intended relationship.

## Building the body

The original robot uses eight MG90S servos and an ESP32-S3. The current build
uses twelve servos and an ESP32-P4, adding sideways leg placement.

V1 started from the [Sesame Robot Project](https://github.com/dorianborian/sesame-robot).
V2 began with [OpenHarmony Puppy](https://oshwhub.com/pcbguy/shi-er-zi-you-du-hong-meng-si-zu-gou-gou)
leg geometry, followed by my own chassis, compact linkages, and shell revisions.

## Current work

The lighter robot stood, walked, and responded to commands on October 8.
I have since begun printing the exterior, made further weight changes, and
switched to a 4 A supply. YOLOE tracking, trained Qwen 0.8B intent/task models,
and the MetaHuman node workflows are part of the ongoing software work. Later
October 14 reports add body events, adjustable self-leveling, SD recording and
Wi-Fi maintenance. The status page separates tested features from open work.

- [Build journal](/updates/)
- [Status and next steps](/posts/current-status/)
- [Parts and technical references](/archive/?kind=reference)
- [Original eight-servo notes](/posts/v1-original-posts/)

The [Ainekio repository](https://github.com/Greg-Aster/Ainekio-bot) contains the
body designs, firmware, motion assets, gateway, and adapter. MetaHuman OS contains
the conversation, memory, and task software.
