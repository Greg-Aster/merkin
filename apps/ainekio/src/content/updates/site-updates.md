---
title: "Ainekio Build Journal"
journalTitle: "Workbench milestones and field notes"
labels:
  status: "Status"
  location: "System"
  section: "Focus"
  mileage: "Highlights"
  nextStop: "Next on the bench"
  updated: "Updated"
maxEntries: 8
current:
  status: "All 3 robots (V1·V2·V3) + multiplayer live on simulator.ainek.io, unified ESP32-P4 firmware, V3 Cyclops optic & Body Control auto-calibration"
  location: "Active V1 & 650 g V2 floor robots · V3 DS3225 PRO (live in sim, print pending) · simulator.ainek.io · Ainekio OS"
  updated: 2026-11-23
  mileage: "V1/V2/V3 live on simulator.ainek.io · PeerJS multiplayer · Unified P4 firmware · Auto-calibration · V3 Cyclops optic"
  section: "Unified multi-model ESP32-P4 firmware (V1/V2/V3), all three robots + PeerJS multiplayer & 19 m Robotics Lab live on simulator.ainek.io, V3 DS3225 PRO self-leveling crawler feet & panoramic ILI9341 Cyclops face, Body Control automated 4th-wire + IMU servo calibration & Virtual Simulation Manager, and zero-pinning Ainekio OS auto-following"
  nextStop: "Print and assemble V1's under-arm clock-spring ESP32-P4 deck and V3's DS3225 PRO Option A-1 self-leveling crawler leg while completing V3 MicroDuck pass 7 training."
  note: "Over November 21–23, all three Ainekio generations converged onto a single unified ESP32-P4 firmware codebase (sdkconfig.v1-8servo with direct 8-channel ADC + SSD1306 OLED, default v2-12servo with ST7789 + CD74HC4067 mux, and sdkconfig.v3-12servo with 2.8-inch ILI9341 panoramic Cyclops optic) and went live together in the browser at https://simulator.ainek.io/—complete with trained MicroDuck & NeuralPose policies for V1, V2, and V3, PeerJS WebRTC multiplayer rooms, a 19 m multi-zone Robotics Lab obstacle course, and standalone @ainekio/engine v0.1.0. In parallel, Body Control shipped automated 4th-wire + IMU servo calibration (floor & legs_free modes with 25° tilt abort), a dedicated Virtual Simulation Manager (:8792, Quick Pair, 24/7 headless runner), and direct Cockpit text chat synced with Ainekio OS zero-pinning robot auto-following and AIKSPK01 spoken room-chat echo."
  areas:
    - label: "Unified P4 Firmware & V1·V2·V3"
      status: "One ESP32-P4 codebase across V1, V2 & V3 + V3 Cyclops optic"
      detail: "V1 compiles on P4 with 8 direct ADC channels (no mux), SSD1306 OLED, and v1-microduck-p4 (53.7 KB). V2 runs the 650 g floor build + NeuralPose v8 + I²t fuse. V3 (406.4 × 236.5 × 385.6 mm, 2.97 kg est.) runs DS3225 PRO HV servos, self-leveling double-parallelogram crawler feet (<= 0.27° error), panoramic ILI9341 Cyclops face, and v3-microduck-p4 (66.9 KB) + neural_pose_v3 live in MuJoCo."
    - label: "simulator.ainek.io & @ainekio/engine"
      status: "V1·V2·V3 live in browser + PeerJS multiplayer + 19 m Lab"
      detail: "Zero-install 500 Hz MuJoCo WASM + compiled P4 firmware at https://simulator.ainek.io/ with live V1/V2/V3 hot-switching, PeerJS WebRTC multiplayer rooms, 6 worlds (19 m Robotics Lab, Yggdrasil, Observatory, Miranda Wreck, Solitude, Sci Fi Room), unified Comms Feed, and extracted @ainekio/engine v0.1.0."
    - label: "Body Control & Ainekio OS"
      status: "Auto-calibration, Virtual Simulation Manager & zero-pinning bridge"
      detail: "Body Control adds automated floor/legs_free servo calibration (0.00° closure error, 25° tilt guard), Virtual Simulation Manager (:8792, ainekio-pair:, 24/7 headless runner), and Cockpit text input—paired with Ainekio OS zero-pinning auto-following (1,000/2,500 ms reconnect) and AIKSPK01 spoken text echo."
entries:
  - title: "Unified ESP32-P4 firmware (V1·V2·V3), all three robots & PeerJS multiplayer on simulator.ainek.io, V3 Cyclops optic & auto-calibration"
    date: 2026-11-23
    location: "Unified ESP32-P4 firmware, simulator.ainek.io (V1/V2/V3 + multiplayer), Body Control, Ainekio OS & @ainekio/engine"
    mileage: "V1/V2/V3 in simulator · PeerJS multiplayer · 19 m Robotics Lab · V3 Cyclops & self-leveling ankles · Auto-calibration"
    summary: "Unifying V1, V2, and V3 inside a single ESP32-P4 firmware tree and live 500 Hz MuJoCo WASM simulator at simulator.ainek.io; training V1 and V3 MicroDuck + NeuralPose policies; adding V3's DS3225 PRO self-leveling double-parallelogram crawler feet and panoramic ILI9341 Cyclops face; launching PeerJS multiplayer, the 19 m Robotics Lab obstacle course, and @ainekio/engine v0.1.0; and shipping Body Control automated servo calibration, the Virtual Simulation Manager, and zero-pinning Ainekio OS auto-following."
    url: "/posts/2026-11-23-unified-p4-firmware-v1-v3-simulator-multiplayer-and-auto-calibration/"
  - title: "V1 clock-spring arms, hunting phantom leg jams (NeuralPose v8), V3 Option A-1 legs, and the live simulator.ainek.io 3D web simulator"
    date: 2026-11-20
    location: "V1 & V3 CAD (v3-2.blend), V2 firmware/NeuralPose v8, and live simulator.ainek.io alpha"
    mileage: "simulator.ainek.io live alpha (6 worlds) · V1 4-wire clock-springs · NeuralPose v8 (0 phantom stalls) · V3 Option A-1 (+120% lift)"
    summary: "Redesigning Ainekio V1 around vertical-knee R2V10 arms and concentric under-arm 4-wire clock-springs; tracing and resolving seven interacting causes of phantom leg jams across ESP32-P4 firmware and four iterations of NeuralPose (v5→v8-calibrated + 50 Hz NeuralPosePresence); rescaling Ainekio V3 onto the Option A-1 compact 5-link pantograph (+120% lift, 0.93:1 dual-servo balance); and launching the live standalone browser 3D simulator alpha at simulator.ainek.io (evolved from game.megameal) across 6 worlds including Yggdrasil."
    url: "/posts/2026-11-20-clockspring-arms-phantom-jams-opt-a1-and-megameal-sim/"
  - title: "V1 ESP32-P4 CAD revisit, NeuralPose v5 adaptive recovery, V3 motion transfer, and interactive 3D studio"
    date: 2026-11-18
    location: "Modernized V1 CAD, physical V2 floor tests, 608-mesh V3 CAD, Ainekio OS, and 3D viewer"
    mileage: "NeuralPose v5 + 2,322 Freestyle rows · V1 P4/683ZZ CAD & 59 OLED faces · 608-mesh V3 + 1:1 3D studio"
    summary: "Modernizing Ainekio V1's Blender CAD around ESP32-P4, 4th-wire servos, 683ZZ bearings, coaxial torsion wiring, and 59 derived OLED faces; training NeuralPose v5-adaptive, a 2,322-row Freestyle LoRA, retrained 20 Hz Living Presence, and v26 specialist LoRAs with physical V2 floor capability videos; detailing V3 to 608 meshes with a 47-motion cross-body transfer study; and launching the interactive Three.js 1:1 3D CAD viewer."
    url: "/posts/2026-11-18-v1-p4-revisit-neuralpose-v5-and-3d-cad/"
  - title: "Cockpit live stream, 3-system neural motion, per-joint I²t jam fuse, and V3 armored CAD"
    date: 2026-11-16
    location: "Ainekio Cockpit, V2 firmware/RL, Ainekio OS, and Blender V3"
    mileage: "3 neural controllers · 8–10 s I²t thermal fuse · 293-mesh V3 armored CAD"
    summary: "Adding a translucent 7-graph Ainekio OS live stream and Tap-to-Talk to Cockpit, expanding motor control into System 1 (MicroDuck v18/v19 + RISC-V PIE fixes), System 2 (NeuralPose + 1,812-example Freestyle), and System 3 (20 Hz Living Presence), building a 3-tier jam & per-joint I²t thermal fuse, adding 8-sector single-hop Embodied Curiosity, and redesigning V3 into a heavy-equipment armored DS3235 quadruped in Blender."
    url: "/posts/2026-11-16-cockpit-stream-jam-fuse-and-v3-armor/"
  - title: "On-chip ESP32-P4 neural walking, Cockpit HUD, and Ainekio OS"
    date: 2026-11-11
    location: "V2 ESP32-P4 quadruped, Body Control Cockpit, and Ainekio OS"
    mileage: "107.8 KB L2-cached gait · 30 updated STLs · Greg-Aster/ainekio-os"
    summary: "Distilling the 50 Hz walking network down to 107.8 KB so it runs natively inside the ESP32-P4's L2 cache without Wi-Fi latency, testing wood-to-carpet seam RL policies, redesigning the rear 2S Keeper Bridge, adding a live camera Cockpit HUD, and consolidating the software mind as Ainekio OS."
    url: "/posts/2026-11-11-on-chip-neural-gait-and-ainekio-os/"
  - title: "First real-life neural walking on carpet, 200M-step RL debugging, and 59 LCD faces"
    date: 2026-11-06
    location: "Physical V2 prototype, MuJoCo/MJX training, and companion mind"
    mileage: "Physical carpet walk · centered 200M-step stride · 59 LCD faces"
    summary: "First physical neural-network walking run on the 650 g V2 robot after diagnosing and fixing 'tiny-hop' and 'scootybooty' reverse-dragging RL failure modes, paired with onboard camera carpet trials and an updated 59-expression LCD face sheet."
    url: "/posts/2026-11-06-carpet-trials-rl-and-big-brother/"
  - title: "Teaching Ainekio to walk: imitation, turns, and the 650 g shell"
    date: 2026-11-01
    location: "Imitation gait policy, completed V2 shell, and robot bridge"
    mileage: "5-command imitation gait · 12-part V2 shell STLs · Wi-Fi bridge"
    summary: "Comparing demonstration-trained five-command walking between MuJoCo simulation and the live ESP32-P4 controller, finishing the 650 g printed shell exports, and simplifying the host-to-robot bridge."
    url: "/posts/2026-11-01-neural-walking/"
  - title: "Freestyle motion library, rear 2S power carrier, and task continuity"
    date: 2026-10-26
    location: "Closed-loop Freestyle motions, rear power carrier, and autonomous goals"
    mileage: "349-motion library · 2S + 5V/5A carrier · 4th-wire arrival checks"
    summary: "Moving finite gestures and stances from open-loop timers to 4th-wire shaft-arrival checks with automatic stall recovery, printing the two-tier rear 2S power carrier and calibration stand, and keeping multi-step tasks alive across turns."
    url: "/posts/2026-10-26-freestyle-targets-and-training/"
  - title: "Rebuilt face surround, feedback ground repair, and fast body reactions"
    date: 2026-10-21
    location: "Physical V2 assembly, closed-loop Stand test, and reflex loop"
    mileage: "Repaired analog ground · closed-loop Stand · physical contact reflexes"
    summary: "Reassembling V2 with a cleaner red face surround for the 1.9\" LCD, fixing a noisy analog ground wire during floor Stand tests, comparing Walk and Run gaits with camera odometry, and wiring fast conversational reactions to physical bumps."
    url: "/posts/2026-10-21-body-face-and-standing/"
  - title: "Fourth-wire servo feedback, 16-channel multiplexer, and compact task models"
    date: 2026-10-18
    location: "Modified MG90S servos, CD74HC4067 mux, and local routing models"
    mileage: "12 calibrated pot channels · revised mounts · local 2B adapters"
    summary: "Modifying all twelve MG90S servos with fourth-wire potentiometer leads routed through a CD74HC4067 analog multiplexer, characterizing end-of-travel pot non-linearity, and testing small local intent-routing adapters."
    url: "/posts/2026-10-18-servo-feedback-and-chassis/"
  - title: "Single-voice companion persona, distance goals, and IMU leveling tools"
    date: 2026-10-15
    location: "Companion speech pipeline, goal-directed walking, and IMU calibration"
    mileage: "Unified outward voice · measured walk/turn goals · gyro bias tools"
    summary: "Ensuring all spoken replies come from one consistent persona voice, connecting 'walk forward' and 'turn' requests to measured progress, and adding bench calibration tools for IMU level reference and gyro bias."
    url: "/posts/2026-10-15-companion-systems/"
  - title: "Gentle crouch-to-stand startup, IMU self-leveling, and Wi-Fi firmware updates"
    date: 2026-10-14
    location: "ESP32-P4 boot sequence, LSM6DS3 attitude loop, and OTA updates"
    mileage: "Slew-limited startup · pitch/roll leveling · wireless OTA"
    summary: "Replacing abrupt power-on servo snaps with a staged crouch-to-stand rise, adding LSM6DS3 pitch/roll self-leveling, routing tilt and shake events, and setting up wireless firmware updates."
    url: "/posts/2026-10-14-startup-and-leveling/"
  - title: "Printing the exterior shell, live camera object tracking, and specialist routing"
    date: 2026-10-12
    location: "Printed red shell, YOLOE camera tracking, and local model routing"
    mileage: "27 shell STLs · live target tracking · staged Lay Down & Play Dead"
    summary: "Starting full exterior shell prints, smoothing out foot placement for Lay Down and Play Dead, and hooking up live camera object detection and tracking on the desktop gateway."
    url: "/posts/2026-10-12-shell-power-and-motion/"
  - title: "First untethered V2 standing and walking, wide LCD face, and voice split"
    date: 2026-10-08
    location: "Physical 12-servo V2 prototype and onboard LCD renderer"
    mileage: "First untethered V2 walk · procedural LCD faces · quick chat vs tasks"
    summary: "The lightened twelve-servo V2 prototype stands and walks untethered on its MG90S legs for the first time, debuting the procedural wide-screen LCD face and separating quick conversation from longer physical tasks."
    url: "/posts/2026-10-08-standing-walking/"
  - title: "Lighter 2S battery rebuild, compact 35/20/28/38/55 mm linkage, and steering"
    date: 2026-10-06
    location: "V2 weight-loss rebuild, four-bar geometry, and steering controller"
    mileage: "Dropped heavy USB power bank · compact four-bar leg · live steering"
    summary: "After an overweight USB power-bank build failed to stand up, V2 pivots to light 2S cells and a tighter 35/20/28/38/55 mm four-bar linkage across all 23 motions with continuous steering."
    url: "/posts/2026-10-06-compact-linkage/"
  - title: "Radxa Dragon Q6A onboard SBC study and newest-frame camera loop"
    date: 2026-09-30
    location: "Historical onboard-SBC packaging study and Wi-Fi camera pipeline"
    mileage: "Q6A bay study · low-latency frame queue · live stride updates"
    summary: "Exploring an onboard Radxa Dragon Q6A compute bay before the October weight-reduction pivot, alongside a non-blocking camera frame pipeline and mid-stride walk speed updates."
    url: "/posts/q6a-chassis-and-active-loop/"
  - title: "Narrowed 82.5 mm wireless chassis and improved knee leverage"
    date: 2026-09-28
    location: "Blender V2 frame layout and stance height tuning"
    mileage: "82.5 mm body width · relocated front shoulders · better knee angles"
    summary: "Narrowing the wireless chassis in Blender, moving the front shoulders clear of the LCD carrier, and lowering walking stance height to keep the four-bar linkages in their strongest leverage zone."
    url: "/posts/2026-09-28-compact-body/"
  - title: "Reinforced shell mounts, underside battery trials, and six-way Crab gaits"
    date: 2026-09-24
    location: "Shell CAD mounts, gait planner, and first ESP32-P4 flash"
    mileage: "Walk / Run / Crawl / Crab · 23 emotes · first ESP32-P4 deployment"
    summary: "Beefing up shell screw bosses, testing underside battery layouts, building continuous Walk, Run, Crawl, and six-direction Crab planners, and flashing the first V2 application onto the ESP32-P4."
    url: "/posts/2026-09-24-body-and-battery/"
  - title: "Compact direct-rod leg prints, servo horn clearances, and variable stride solver"
    date: 2026-09-21
    location: "3D-printed leg tolerances and four-leg inverse kinematics"
    mileage: "2.1 mm horn pocket fix · narrower bay · independent stride & rate"
    summary: "Fixing tight 3D-printed servo horn pockets on the compact direct-rod leg, narrowing the internal electronics bay, and decoupling stride length from step frequency in the gait solver."
    url: "/posts/2026-09-21-compact-leg-design/"
  - title: "First printed 3-DOF leg prototypes and V1-vs-V2 kinematics baseline"
    date: 2026-09-15
    location: "Bench-printed single leg and four-bar math"
    mileage: "First physical 3-DOF leg · 0.30 mm print clearances · FK/IK baseline"
    summary: "Printing and flexing the first physical three-servo leg module across folded and extended poses, dialing in print clearances, and writing down the forward/inverse kinematics for the coupled four-bar knee."
    url: "/posts/2026-09-15-leg-prototypes/"
  - title: "Laying out the four-leg V2 body and electronics bay in Blender"
    date: 2026-09-10
    location: "Blender full-body CAD packaging"
    mileage: "Four 3-DOF legs · ESP32-P4 & PCA9685 fitment · removable face bay"
    summary: "Fourteen Blender packaging iterations fitting four 3-DOF leg modules around the ESP32-P4, PCA9685 servo driver, rounded hip housings, and a removable front camera/LCD carrier."
    url: "/posts/2026-09-10-v2-body-design/"
  - title: "Three ways to drive a robot knee with short linkage rods"
    date: 2026-09-09
    location: "Blender four-bar mechanism study"
    mileage: "Direct rod · relay yoke · offset cascade"
    summary: "Comparing three fixed-servo short-rod knee linkages in Blender for mechanical advantage and shell collisions before committing to V2's direct four-bar geometry."
    url: "/posts/2026-09-09-leg-mechanism-study/"
  - title: "Early September V1 wrap-up: durable workflows and the case for a 12-servo V2"
    date: 2026-09-09
    location: "V1 wrap-up and V2 design brief"
    mileage: "SQLite workflow checkpoints · V1 lessons learned · 12-servo plan"
    summary: "Wrapping up early V1 command-recovery checkpoints and writing out why the eight-servo prototype needed to become a twelve-servo ESP32-P4 quadruped."
    url: "/posts/archive/2026-09-09-project-status/"
---

# About the build journal

These dated workbench entries cover ongoing development across the active eight-servo **Ainekio V1** quadruped (`ESP32-S3` floor build & unified `ESP32-P4` clock-spring / direct 8-ch ADC upgrade), the active `650 g` twelve-servo **Ainekio V2** floor robot, the armored `DS3225 PRO` **Ainekio V3** (Option A-1 self-leveling ankles, panoramic Cyclops optic & trained RL live in [`simulator.ainek.io`](https://simulator.ainek.io/), physical print pending), and [Ainekio OS](https://github.com/Greg-Aster/ainekio-os).

If you want a high-level picture before reading individual bench logs, start with the [System Overview](/posts/project-overview/), [What Ainekio Can Do](/posts/what-ainekio-can-do/), [How Does Ainekio Stack Up?](/posts/how-does-ainekio-stack-up/), [Ainekio V1 Guide](/posts/ainekio-v1/), or [Ainekio OS Guide](/posts/ainekio-os/). Pre-hardware planning drafts from July 2026 remain preserved in [July 2026 Early Planning Notes](/posts/v1-original-posts/).
