---
title: "Ainekio Field Updates"
journalTitle: "Milestones and field notes"
labels:
  status: "Status"
  location: "Layer"
  section: "Focus"
  mileage: "Baseline"
  nextStop: "Next gate"
  updated: "Updated"
maxEntries: 8
current:
  status: "Q6A integration, chassis work, and an active loop"
  location: "P4 + Q6A integration"
  updated: 2026-09-30
  mileage: "Ainekio 6437b24 · MetaHuman c3f56d4"
  section: "Body, perception, and saved workflows"
  nextStop: "Assembled tests under load"
  note: "Working on Q6A integration, the revised v2 chassis, and perception that can keep up with ongoing movement. Fresh-frame processing and bounded walk updates are in source; YOLO selection, task integration, and combined-load physical tests are still ahead."
entries:
  - title: "Q6A, chassis work, and a more active loop"
    date: 2026-09-30
    location: "Body + MetaHuman OS"
    mileage: "6437b24 · c3f56d4"
    summary: "Revised v2 geometry, Q6A integration, fresh-frame processing, and saved MetaHuman executions. YOLO and the connected active loop are still being worked out."
    url: "/posts/q6a-chassis-and-active-loop/"
  - title: "Progress site rebuilt around current owners"
    date: 2026-08-27
    location: "Documentation"
    mileage: "10-article field guide"
    summary: "Replaced five remote-doc pages and fantasy art with a local status-led field guide covering the body, controller, protocol, gateway, perception, voice, MetaHuman loop, and bounded autonomy."
    url: "/posts/current-status/"
  - title: "MetaHuman autonomy ownership consolidated"
    date: 2026-08-25
    location: "MetaHuman OS"
    mileage: "5191d6fc"
    summary: "Robot Operator is the tracked robot-autonomy admission owner; Environment Mode, Bridge, Task State, and the Work Coordinator retain their separate responsibilities."
    url: "/posts/bounded-autonomy/"
  - title: "Wake-word pilot contained for false triggers"
    date: 2026-08-23
    location: "Voice"
    summary: "Real-room events showed the pilot threshold and negative set were not production-ready. Wake operation remains a tuning and acceptance track, not a finished feature."
    url: "/posts/voice-loop/"
  - title: "Camera and semantic motion expansion published"
    date: 2026-08-04
    location: "Robot firmware"
    mileage: "6ad9051"
    summary: "The tracked controller gained the corrected OV3660 motion-capture profile alongside expanded semantic motions and simulator parity."
    url: "/posts/controller-firmware/"
  - title: "Five-second walk assets installed"
    date: 2026-07-31
    location: "Motion assets"
    summary: "Walk assets were regenerated to bounded roughly five-second sequences and installed with a LittleFS-only flash and digest readback."
    url: "/posts/protocol-and-safety/"
  - title: "Physical audio path exercised"
    date: 2026-07-29
    location: "Robot audio"
    summary: "Bounded pacing produced clean audible playback in one test while underrun and microphone transport counters remained explicitly open."
    url: "/posts/voice-loop/"
---

# Field updates

This journal records significant source, integration, and physical milestones.
Entries name the layer they actually prove. Detailed evidence and current open
gates live in the linked field-guide articles.
