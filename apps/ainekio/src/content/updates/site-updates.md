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
  status: "Physical 650 g V2 quadruped walking under 200M-step MJX neural policy; closed-loop Stand/Walk and unified MetaHuman runtime active"
  location: "V2 / ESP32-P4 · Body Control · MetaHuman OS"
  updated: 2026-11-06
  mileage: "650 g closed-loop V2 · 200M-step MJX neural walk · Big Brother"
  section: "Real-world neural network walking, full-CAD MJX reinforcement learning, and unified companion agency"
  nextStop: "Complete the 200M-step rough-terrain and push-recovery MJX continuation run (7 mm carpet strips + kick disturbances) and validate sustained autonomous room navigation."
  note: "The 650 g twelve-servo V2 robot now walks forward and reverses cleanly on physical carpet under its 200M-step JAX/Brax/MJX neural policy after resolving early tiny-hop and 'scootybooty' reverse-dragging failure modes. Onboard, 4th-wire CD74HC4067 shaft verification and 0.8.150 Cartesian workspace projection pair with the unified llama-cpp.service + Big Brother MetaHuman runtime."
  areas:
    - label: "Body & firmware"
      status: "650 g closed-loop V2 hardware complete; 0.8.150 firmware verified"
      detail: "Waveshare ESP32-P4-WIFI6 + C6, 12× feedback-modified MG90S via PCA9685 and CD74HC4067 mux, 35/20/28/38/55 mm linkages, 1.9\" ST7789 LCD (58 faces), inverted OV5647 camera (10,000 µs cap), 208 Hz LSM6DS3 IMU, ES8311/NS4150B audio with WakeNet9s, and rear 2S + Mini560 + HiLetgo power carrier."
    - label: "Locomotion & learning"
      status: "Real-life 200M-step MJX neural walk, closed-loop Stand/Walk, and 349 Freestyle motions"
      detail: "Trained 200M-step full-CAD MJX policy (56.6–63.7 mm centered stride, upright reverse, 3.5× air-time credit) walking on the physical 650 g V2 robot; closed-loop Stand settles within 2 mm; Freestyle pairs 349 SQLite examples with jam/fall recovery and Big Brother inference."
    - label: "MetaHuman OS & companion"
      status: "Unified llama-cpp.service router, single bridge, Full Auto, and Big Brother"
      detail: "Single :8080 router (Qwen3.5 9B, Environment 0.8B/2B LoRAs, Freestyle Qwen, CPU-only embeddings, 5-min idle unload), multi-host environment-bridge, Standing Persona (Psychotherapist-edited), Semi (5-min drive deltas) & continuous Full Auto, fast-body-event-mode.json (be_ faces), and Big Brother terminal/delegation."
entries:
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

These chronological build entries follow Ainekio's hardware, firmware, locomotion, and [MetaHuman OS](https://github.com/Greg-Aster/metahuman-os) development from the initial eight-servo `ESP32-S3` prototype to the `650 g`, twelve-servo closed-loop `ESP32-P4` quadruped.

For a structured system introduction and live component summary, start with the [Project Overview & Status](/posts/project-overview/#project-status) and [Ainekio as a Companion](/posts/ainekio-companion/). Technical architecture guides are organized in the [Reference Library](/archive/?kind=reference), and the July–September 2026 eight-servo engineering documents are preserved in the [Original V1 Build Journal](/posts/v1-original-posts/).
