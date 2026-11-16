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
  status: "3-system neural motion, per-joint jam thermal fuse & Cockpit live stream on V2; industrial armored V3 in Blender CAD"
  location: "650 g V2 floor robot · V3 Armored CAD (v3-2.blend) · Ainekio OS"
  updated: 2026-11-16
  mileage: "MicroDuck v19 + NeuralPose + 20 Hz Presence · I²t jam fuse · 440.8 mm Armored V3 CAD"
  section: "Cockpit live Ainekio OS stream, 3-tier servo jam & thermal protection, System 3 Living Presence, single-hop embodied curiosity, and V3 heavy-equipment CAD"
  nextStop: "Validate MicroDuck v19-snag-p4 and NeuralPose v3-jam-compliant on physical V2 floor runs while printing the first single-corner DS3235 + 87.7/40/93.6/158.4 mm shrouded leg assembly for Ainekio V3."
  note: "V2 now coordinates three specialized neural controllers—on-chip 50 Hz L2-cached MicroDuck v18/v19 locomotion (with ESP32-P4 RISC-V PIE vector fixes and swing-foot snag clearance), 50 Hz delay-tolerant NeuralPose over a 1,812-example Freestyle curriculum, and a 20 Hz System 3 Living Presence policy—protected by a 280 ms recoil, 1.8 s reverse unsnag, and 8–10 s per-joint I²t thermal fuse. In parallel, Ainekio Cockpit streams live Ainekio OS thoughts and voice transcripts directly over the camera HUD, and Ainekio V3 has been redesigned into a watertight 293-mesh heavy-equipment armored quadruped in Blender."
  areas:
    - label: "Body, safety & V3 CAD"
      status: "650 g V2 w/ per-joint I²t jam fuse & 440.8 mm armored V3 CAD"
      detail: "V2 adds full-span [1..4094] ADC jam sensing, 800 ms deadlock-bounded arrival waits, selective single-channel PCA9685 thermal cutoff (8–10 s above 7° deadband while 11 healthy servos hold stance), RISC-V PIE build fixes, and 17 updated Red STLs. V3 (v3-2.blend) packages 12 waterproof DS3235 servos, 87.7/40/93.6/158.4 mm shrouded crawler legs, a recessed 2.8\" MSP2807 vault display, Radxa Q6A SBC, ESP32-P4, and 4× 21700 cells."
    - label: "3-system neural & Cockpit"
      status: "MicroDuck v18/v19, 50 Hz NeuralPose, 20 Hz Presence & Cockpit stream"
      detail: "MicroDuck v18 (+1.3246 10-scenario score, 0 falls) and v19-snag-p4 pair with 1.8 s reverse unsnag; System 2 runs 1,812-row Freestyle + 280 ms recoil; System 3 drives 20 Hz speech-RMS gestures & chatter-relief trims while staying silent during VAD. Cockpit adds Tap-to-Talk, 10 instant toggles, and a live 7-graph Ainekio OS stream overlay."
    - label: "Ainekio OS (The Mind)"
      status: "8-sector Embodied Curiosity, ExecutionStore v2 & VRAM-aware voice"
      detail: "Single-hop System 1 / System 2 Embodied Curiosity driven by 8×45° spatial sectors, MoGe-2 8×8 (<0.30 m) forward corridor braking, durable Body Control Text Out across 7 graphs, synchronous JsonPlus checkpointer, pre-warmed GeminiAcpServer (gemini-4-hydrogen-low), and CUDA↔CPU auto-switching Kokoro TTS."
entries:
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

# About the build archive

These dated workbench entries follow Ainekio from the earliest eight-servo `ESP32-S3` experiments in summer 2026 through the twelve-servo `ESP32-P4` rebuild and [Ainekio OS](https://github.com/Greg-Aster/ainekio-os) (formerly MetaHuman OS).

If you want a high-level picture before reading individual bench logs, start with the [System Overview](/posts/project-overview/), [How Does Ainekio Stack Up?](/posts/how-does-ainekio-stack-up/), or the [Ainekio OS Guide](/posts/ainekio-os/). Early summer 2026 notes from the first eight-servo prototype remain preserved in the [Original V1 Archive](/posts/v1-original-posts/).
