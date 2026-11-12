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
  status: "Untethered 50 Hz neural walking on the ESP32-P4, live Cockpit HUD, and Ainekio OS active"
  location: "650 g 12-servo V2 quadruped · Ainekio OS"
  updated: 2026-11-11
  mileage: "107.8 KB on-chip neural gait · 59 LCD expressions · local + hybrid AI mind"
  section: "On-chip neural gait distillation, rear battery carrier refinements, and Ainekio OS consolidation"
  nextStop: "Test longer untethered floor walks across room transitions combining on-chip neural locomotion, live camera obstacle estimates, and Ainekio OS voice interaction."
  note: "Walking no longer depends on streaming joint targets over Wi-Fi: two rounds of DAgger distillation compressed the 50 Hz walking network by ~80% (547 KB down to 107.8 KB int8) so it runs directly inside the ESP32-P4's 128 KB L2 cache. Alongside 30 updated shell and rear battery-carrier STLs and a unified live camera Cockpit HUD, the companion software mind is now published openly as Ainekio OS."
  areas:
    - label: "Body & firmware"
      status: "650 g 12-servo V2 frame with on-chip 50 Hz neural gait"
      detail: "Waveshare ESP32-P4-WIFI6 running the 107.8 KB int8 walking policy on Core 1, 12 modified MG90S servos with 4th-wire pot feedback via PCA9685 and CD74HC4067, 208 Hz LSM6DS3 IMU, 1.9\" ST7789 LCD (59 expressions), chin-mounted OV5647 camera, wake-word audio, and updated rear 2S Keeper Bridge STLs."
    - label: "Locomotion & controls"
      status: "L2-cached MicroDuck policy, floor-seam RL trials & Cockpit HUD"
      detail: "Hardware-twin reinforcement learning across wood/carpet seams and simulated rail sag (+0.213 m/s forward, -0.179 m/s reverse, ±60.9°/s yaw turns), 489-trajectory Freestyle fault-recovery dataset returning cleanly to Stand, and a single-screen camera Cockpit HUD with optical-flow obstacle range."
    - label: "Ainekio OS (The Mind)"
      status: "Local-first companion mind with persistent memory & hybrid voice"
      detail: "Published as Greg-Aster/ainekio-os (formerly MetaHuman OS): persistent Standing Persona, SQLite episodic memory and durable workflows, 47 visual cognitive graphs, nightly 02:00 memory consolidation, local/LAN Whisper and Kokoro voice routing, and varied conversational reactions to physical tips and stalls."
entries:
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
