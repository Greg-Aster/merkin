---
title: "About Ainekio"
description: "The robot project, its source code, design history, and concept artwork."
---

# About Ainekio

Ainekio is an owner-built robot familiar: a small four-legged companion connected
to MetaHuman OS. The project combines printed mechanics, embedded control,
camera and audio hardware, conversation, and limited autonomous behavior.

The working V1 has eight servos and an ESP32-S3. The
[V2 roadmap](/posts/ainekio-v2/) describes the planned twelve-servo body and
ESP32-P4 controller. The [MetaHuman redesign](/posts/metahuman-integration/)
adds saved workflows that retain a request through waits, results, and restarts.

## What the site documents

The guide covers hardware, firmware, commands, gateway, camera, speech, and
MetaHuman integration. [Dated status reports](/posts/current-status/) record
implementation, tests, physical results, failures, and remaining work.

A design is a plan. Code establishes implementation; a test establishes the
behavior it exercises. A running system accepting a request, a command finishing,
and the robot meeting an objective require their own evidence. For example, a
completed walk needs a fresh image before it can establish a visual goal.

## Software responsibilities

MetaHuman handles conversation, persona, memory, reasoning, and saved objectives.
Its Work Coordinator schedules finite jobs; Robot Operator controls autonomous
timing; Environment workflows choose actions; Environment Bridge handles the
external connection. Robot Status displays execution progress.

Ainekio translates commands, enforces body safety, runs the hardware, and returns
results. Models request supported actions; they cannot directly write servo PWM.
The two source repositories are linked below.

## Design history and artwork

V1 derives from the Apache-2.0-licensed
[Sesame Robot Project](https://github.com/dorianborian/sesame-robot). Owner-supplied
construction photos show its low open black chassis, red feet and face, cyan
OLED, camera, and exposed wiring. The tracked Frame8 CAD records enclosure work;
it does not establish which enclosure is installed.

V2 evaluates [OpenHarmony Puppy](https://oshwhub.com/pcbguy/shi-er-zi-you-du-hong-meng-si-zu-gou-gou)
leg geometry with an Ainekio-specific chassis. Current banners, article covers,
and the avatar are generated concept art: a shorter, broader body with serrated
red legs and a cyan face. The comparison keeps V1 on the left and prospective
V2 on the right. Geometry, materials, and electronics remain illustrative.

The dystopian science-fiction settings are visual humor and inspiration. They
do not depict hardware tests. Earlier artwork based on V1 remains with historical
material.

The simulator experiment was unsuccessful and is fully retired. Its
[motion notes](/posts/archive/motion-systems/) and the earlier
[virtual-environment notes](/posts/archive/first-steps-work-in-progress/) remain
as clearly dated history.

## Documentation and privacy

Current source and fresh results take precedence over older plans. Corrections
are dated; historical articles retain their context.

Examples omit personal profiles, memories, captured media, runtime logs,
credentials, tokens, model weights, and local state. Operational results are
summarized without publishing that private data.
