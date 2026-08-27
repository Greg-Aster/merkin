---
title: "About Ainekio"
description: "Project scope, evidence rules, source boundaries, visual provenance, and public-documentation policy."
---

# About Ainekio

Ainekio is an owner-built robot familiar: a small physical companion connected
to MetaHuman OS through a bounded, authenticated Environment interface.

The project combines printed mechanics, embedded firmware, camera and audio
hardware, a machine-checkable protocol, a gateway, simulation, speech services,
environment reasoning, and carefully limited autonomous behavior. This site is
the public field guide for that complete system.

## What this site records

- the current body and controller design;
- owner boundaries across Ainekio and MetaHuman OS;
- protocol, gateway, media, perception, and voice behavior;
- dated implementation and validation status;
- physical results and failures when they have real evidence;
- open acceptance gates without disguising them as future features.

## Evidence policy

The site keeps five claims separate: source implementation, focused validation,
live runtime admission, terminal robot completion, and physical or semantic
proof. A higher-level result is not inferred from a lower-level check.

This is why the current status can say both “the closed software loop is
implemented” and “the assembled companion loop is still pending acceptance.”

## Project boundaries

Ainekio accepts semantic robot commands through explicit capability and safety
gates. MetaHuman model output does not directly control raw servo angles.

The Work Coordinator owns finite work admission. Robot Operator owns robot-
autonomy timing. Environment Mode owns embodied decisions. Environment Bridge
owns external transport. Environment Task State owns bounded objective state and
completion. Ainekio owns protocol translation, body safety, hardware execution,
and correlated physical feedback.

## Source and design lineage

The current test body is derived from the Apache-2.0-licensed
[Sesame Robot Project](https://github.com/dorianborian/sesame-robot). Ainekio's
controller firmware, protocol, gateway, safety core, media paths, and MetaHuman
integration are maintained in the Ainekio repository.

The site's 2026 visual set was regenerated from the owner-supplied photographs
in `public/photos`. Those photos are the construction reference: low open black
chassis, red feet and face module, cyan OLED, camera, and exposed wiring. The
active `Frame8` CAD is documented separately as an uninstalled enclosure
revision.

The generated article art deliberately places the construction-faithful robot
in absurdly dramatic science-fiction and dystopian scenes. Those settings are
editorial humor and inspiration—not photographs, test evidence, or claims about
installed hardware.

## Public documentation boundary

Personal MetaHuman profiles, memories, captured media, runtime logs, credentials,
tokens, model weights, and machine-local state do not belong on this public site.
Examples stay sanitized, and operational results are summarized without
publishing private data.

## Corrections

This is a fast-moving prototype. Each status article is dated and tied to a
repository baseline. If a field note conflicts with current source, current
tracked owners and fresh evidence win.
