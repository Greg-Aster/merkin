---
title: "Ainekio Field Updates"
journalTitle: "Milestones and field notes"
labels:
  status: "Status"
  location: "System"
  section: "Focus"
  mileage: "Reference"
  nextStop: "Next step"
  updated: "Updated"
maxEntries: 8
current:
  status: "On-chip 50 Hz ESP32-P4 neural gait (107.8 KB L2-cached MicroDuck v17), Body Control Cockpit HUD, and Ainekio OS hybrid runtime active"
  location: "V2 / ESP32-P4 (0.8.159) · Body Control Cockpit · Ainekio OS"
  updated: 2026-11-11
  mileage: "107.8 KB L2-cached P4 neural gait · 600M–800M Pupper MJX · Ainekio OS"
  section: "On-chip microcontroller RL locomotion, DAgger L2-cache distillation, and Ainekio OS compute/voice consolidation"
  nextStop: "Validate untethered multi-room autonomous navigation combining on-chip MicroDuck v17 locomotion, Cockpit optical-flow obstacle range, and Ainekio OS Hybrid edge+ACP routing."
  note: "Neural walking now runs natively at 50 Hz on ESP32-P4 Core 1 with zero Wi-Fi round-trip dependency: 2-round DAgger distillation compressed the 720-input MicroDuck policy by 79.8% (547 KB → 107.8 KB int8) so it fits completely inside the P4's 128 KB L2 cache (+0.213 m/s forward, -0.179 m/s reverse, ±60.9°/s yaw turn). In parallel, MetaHuman OS publicly became Ainekio OS (Greg-Aster/ainekio-os) with a unified ServerStatus control plane, remote Whisper/Kokoro/llama.cpp targets, warm 2-session GeminiAcpServer inference, and 6-turn varied Fast Body Event reactions."
  areas:
    - label: "Body & firmware"
      status: "0.8.159-p4-microduck-v17 on-chip neural firmware & Wireless Keeper Bridge STLs"
      detail: "Waveshare ESP32-P4-WIFI6 running 50 Hz Core 1 int8×int16 MicroDuck inference in 128 KB L2 cache, 12× 4th-wire MG90S via PCA9685 + CD74HC4067 One-Euro filter, 208 Hz LSM6DS3 FusionAhrs IMU, 1.9\" ST7789 LCD (59 faces), OV5647 CSI camera, WakeNet9s audio, and 30 updated Red shell, LCD spacer, and battery-mounted Keeper Bridge STLs."
    - label: "Locomotion & Cockpit"
      status: "Distilled v17-p4 (+0.213 m/s, ±60.9°/s), 13 floor seam bouts, Cockpit HUD & 489 Freestyle rows"
      detail: "GPU hardware-twin RL (tensor_sensors.py + tensor_body.py across 4,096 envs, slick wood/carpet seams & ADC rail sag), parallel Pupper V3 MJX 600M–800M hardwood/seam floor trials (zero falls), full-viewport Cockpit HUD with Lucas-Kanade optical-flow obstacle range & no-login/hotspot fallback, and 489-row Freestyle native-Stand recovery."
    - label: "Ainekio OS (Mind)"
      status: "Greg-Aster/ainekio-os rebrand, 47 graphs, ServerStatus presets & warm Gemini ACP"
      detail: "Local-first personal AI OS (123 Core API handlers, 14-table executions.sqlite, 47 cognitive graphs, 24 Brain agents, 8-stage 02:00 Sleep Cycle), ServerStatus right drawer (Local / Hybrid / BB-Codex / BB-Gemini presets for 12 roles), toggleable local/remote CUDA Whisper & Kokoro + Piper fallback, warm 2-session GeminiAcpServer, and varied Fast Body Event wit."
entries:
  - title: "On-chip ESP32-P4 neural gait (110 KB L2-cached MicroDuck), Cockpit HUD, and Ainekio OS"
    date: 2026-11-11
    location: "ESP32-P4 Core 1, Body Control Cockpit, V2 Red CAD, and Ainekio OS"
    mileage: "0.8.159-p4-microduck-v17 · 107.8 KB L2-hot MLP · Greg-Aster/ainekio-os"
    summary: "Compiling and 2-round DAgger-distilling the 50 Hz MicroDuck policy (547 KB → 107.8 KB int8) into the ESP32-P4's 128 KB L2 cache (+0.213 m/s forward, ±60.9°/s yaw), 13 Pupper MJX hardwood/seam bouts, Cockpit HUD with optical-flow range, 30 Keeper Bridge & shell STLs, and the Ainekio OS rebrand with ServerStatus hybrid/remote routing and warm Gemini ACP."
    url: "/posts/2026-11-11-on-chip-neural-gait-and-ainekio-os/"
  - title: "Real-life neural walking, 200M-step MuJoCo/MJX gait training, and Big Brother"
    date: 2026-11-06
    location: "V2 physical robot, MuJoCo MJX, and MetaHuman OS"
    mileage: "Real-life neural walk · 200M centered-stride MJX · unified llama.cpp"
    summary: "First real-life neural network walking run on the 650 g physical V2 robot after fixing tiny-hop and 'scootybooty' reverse-dragging failure modes in a 200M-step MJX policy, plus onboard OV5647 carpet trials, 58 LCD expressions, and MetaHuman OS consolidation."
    url: "/posts/2026-11-06-carpet-trials-rl-and-big-brother/"
  - title: "Teaching Ainekio to walk: imitation, turns, and the execution path"
    date: 2026-11-01
    location: "Neural gait, completed V2 body, and Environment Bridge"
    mileage: "walk_nominal_v1 · 12-part body STLs · unified multi-host Bridge"
    summary: "Demonstration-trained five-command neural walking compared between direct simulation and the connected Body Control / P4 executor, alongside the completed 650 g V2 shell exports and consolidated Environment Bridge."
    url: "/posts/2026-11-01-neural-walking/"
  - title: "Freestyle motion library, 650 g power carrier, and task continuity"
    date: 2026-10-26
    location: "Freestyle model, rear 2S power carrier, and Full Auto"
    mileage: "SQLite motion library · 2S + Mini560 + HiLetgo · shaft-arrival checks"
    summary: "Finite Freestyle target programs with 4th-wire shaft-arrival verification and event-driven recovery, the reconciled 650 g assembly with rear two-level 2S power carrier and training stand STLs, and durable Full Auto goal continuity."
    url: "/posts/2026-10-26-freestyle-targets-and-training/"
  - title: "Rebuilt face, ground-repair Stand trial, gait learning, and Fast Body Events"
    date: 2026-10-21
    location: "Physical V2 assembly, Body Control, and MetaHuman workflows"
    mileage: "Repaired feedback ground · host gait learning · fast-body-event-mode.json"
    summary: "Reassembled V2 body with revised red face surround and 1.9\" LCD, ground-repaired closed-loop Stand verification, host Walk/Run policy comparison with depth odometry, and single-call Fast Body Event reactions."
    url: "/posts/2026-10-21-body-face-and-standing/"
  - title: "Fourth-wire servo feedback, CD74HC4067 multiplexer, and 2B specialists"
    date: 2026-10-18
    location: "V2 / ESP32-P4 hardware and MetaHuman model routing"
    mileage: "12 calibrated feedback channels · revised chassis mounts · 2B Intent/Task LoRAs"
    summary: "All twelve MG90S servos modified with 4th-wire potentiometer wiper feedback through a CD74HC4067 analog multiplexer, accompanied by revised chassis mounts and deployed Qwen3.5 2B Intent and Task adapters."
    url: "/posts/2026-10-18-servo-feedback-and-chassis/"
  - title: "Companion systems, goal-directed locomotion, and leveling diagnostics"
    date: 2026-10-15
    location: "MetaHuman OS, Active Task, and Body Control"
    mileage: "Standing Persona voice owner · locomotion endpoints · 0.8.52 leveling tools"
    summary: "Standing Persona becomes the single outward speech owner, Active Task connects distance/turn/approach/visual locomotion goals to measured progress and Finish receipts, and Body Control adds level-reference and gyro bias calibration."
    url: "/posts/2026-10-15-companion-systems/"
  - title: "Staged startup, IMU self-leveling, body events, and Wi-Fi OTA maintenance"
    date: 2026-10-14
    location: "ESP32-P4 firmware, Body Control, and Event Trigger"
    mileage: "Staged boot rise · LSM6DS3 leveling · SD video & staged OTA"
    summary: "Staged crouch-to-stand boot sequence, saved LSM6DS3 attitude self-leveling controls, body-event routing for wake/tilt/shake, and concurrent SD video recording with staged Wi-Fi firmware updates."
    url: "/posts/2026-10-14-startup-and-leveling/"
  - title: "Exterior shell printing, YOLOE tracking, and trained specialist workflows"
    date: 2026-10-12
    location: "Blender shell exports, desktop gateway, and MetaHuman OS"
    mileage: "27 shell STLs · YOLOE + ByteTrack · 0.8B Intent/Task specialists"
    summary: "Exterior shell printing begins alongside staged foot placement for Lay Down and Play Dead, live YOLOE/ByteTrack camera target tracking, and trained Qwen specialist routing."
    url: "/posts/2026-10-12-shell-power-and-motion/"
  - title: "First physical V2 standing, walking, LCD expressions, and command response"
    date: 2026-10-08
    location: "Physical 12-servo V2 prototype and P4 media stack"
    mileage: "First untethered V2 Stand & Walk · 58 LCD faces · task/chat split"
    summary: "The lightened twelve-servo V2 prototype stands, walks, and responds to commands on its MG90S actuators, accompanied by the illuminated wide LCD face renderer and responsive task/conversation routing."
    url: "/posts/2026-10-08-standing-walking/"
  - title: "Compact 35/20/28/38/55 mm linkage, weight reduction, and continuous steering"
    date: 2026-10-06
    location: "V2 leg geometry, chassis rebuild, and P4 controller"
    mileage: "35/20/28/38/55 mm linkage · 23 remapped motions · separate battery architecture"
    summary: "After the heavy power-bank build failed to stand, V2 switches to separate 2S cells and a compact 35/20/28/38/55 mm linkage across all 23 motions, adding continuous steering and portable IMU estimation."
    url: "/posts/2026-10-06-compact-linkage/"
  - title: "Q6A host integration, chassis work, and an active perception loop"
    date: 2026-09-30
    location: "Radxa Dragon Q6A, gateway, and MetaHuman OS"
    mileage: "Direct Wi-Fi P4 link · newest-frame camera pipeline · bounded walk updates"
    summary: "Integrating the Radxa Dragon Q6A with the P4 over Wi-Fi, processing newest camera frames outside the receive loop, and adjusting ongoing walk speed/stride while preserving the action lease."
    url: "/posts/q6a-chassis-and-active-loop/"
  - title: "Compact 82.5 mm Wireless body, gait leverage revision, and ROS 2 telemetry"
    date: 2026-09-28
    location: "Blender chassis, P4 motion controller, and Q6A"
    mileage: "82.5 mm frame · lowered gait references · saved Motion speed ×"
    summary: "Narrowed Wireless chassis with front-leg relocation and LCD carrier, lowered Walk/Run/Crab body references for improved linkage transmission angles, and Wired vs. Wireless Q6A architecture."
    url: "/posts/2026-09-28-compact-body/"
  - title: "Red shell refinements, battery packaging study, and continuous P4 gaits"
    date: 2026-09-24
    location: "V2 shell CAD, gait solver, and ESP32-P4 deployment"
    mileage: "Walk / Run / Crawl / 6-dir Crab · 33-chapter showcase · 0.7.0 P4 flash"
    summary: "Reinforced shell mounts and underside battery studies alongside continuous Walk, Run, Crawl, and six-direction Crab planners, 23 expressive gestures, and verified ESP32-P4 application deployment."
    url: "/posts/2026-09-24-body-and-battery/"
  - title: "Compact leg geometry, narrowed chassis, and independent stride/rate solver"
    date: 2026-09-21
    location: "Leg mechanism, 3D printing, and numerical gait planner"
    mileage: "Compact linkage STLs · horn-pocket fix · 14 s variable-gait animation"
    summary: "Transition to the compact direct-rod linkage with corrected 2.1 mm servo horn pockets, narrowed internal electronics packaging, and a four-leg continuous solver with independent Stride % and Motion rate controls."
    url: "/posts/2026-09-21-compact-leg-design/"
  - title: "First printed V2 leg prototypes and eight-vs-twelve servo kinematics baseline"
    date: 2026-09-15
    location: "Printed 3-DOF leg hardware and kinematic modeling"
    mileage: "Physical leg photos · 0.30 mm shell clearance · nonlinear FK/IK equations"
    summary: "First physical 3-DOF leg prints tested across folded and extended poses, mating-allowance and foot-tread refinements, and the mathematical baseline comparing V1's 8 channels with V2's 12-servo coupled linkages."
    url: "/posts/2026-09-15-leg-prototypes/"
  - title: "Assembling the four-leg V2 body and electronics in Blender"
    date: 2026-09-10
    location: "Blender CAD assembly and component packaging"
    mileage: "14 WIP revisions · ESP32-P4, PCA9685 & Q6A models · removable face carrier"
    summary: "Fourteen iterative Blender assembly steps combining four 3-DOF leg modules, center mounts, board envelopes, rounded servo housings, top/bottom covers, and a removable camera/LCD front carrier."
    url: "/posts/2026-09-10-v2-body-design/"
  - title: "Three ways to drive a knee with short rods"
    date: 2026-09-09
    location: "Leg linkage mechanism research"
    mileage: "Direct rod · supported relay yoke · offset cascade"
    summary: "Kinematic and collision comparison of three fixed-servo short-rod knee mechanisms in Blender, establishing the linkage transmission trade-offs that guided the V2 leg."
    url: "/posts/2026-09-09-leg-mechanism-study/"
  - title: "September 9 milestone: durable robot workflows, receipt recovery, and V2 plan"
    date: 2026-09-09
    location: "MetaHuman OS, gateway adapter, and V1/V2 transition"
    mileage: "207 durable workflow tests · 68 receipt/gateway checks · V2 12-servo brief"
    summary: "Consolidating LangGraph SQLite execution checkpoints, non-repeating command recovery across disconnects, finite Desire execution plans, and the initial 12-servo ESP32-P4 V2 specification."
    url: "/posts/archive/2026-09-09-project-status/"
---

# Field updates

These chronological build entries follow Ainekio's hardware, firmware, locomotion, and [Ainekio OS](https://github.com/Greg-Aster/ainekio-os) (formerly MetaHuman OS) development from the initial eight-servo `ESP32-S3` prototype to the `650 g`, twelve-servo closed-loop `ESP32-P4` quadruped running on-chip `50 Hz` neural locomotion.

For a structured system introduction and live component summary, start with the [Project Overview & Status](/posts/project-overview/#project-status), the [Ainekio OS Architecture Guide](/posts/ainekio-os/), and [Ainekio as a Companion](/posts/ainekio-companion/). Technical architecture guides are organized in the [Reference Library](/archive/?kind=reference), and the July–September 2026 eight-servo engineering documents are preserved in the [Original V1 Build Journal](/posts/v1-original-posts/).
