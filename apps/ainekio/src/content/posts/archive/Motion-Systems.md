---
title: "July 2026: The Retired Simulator Experiment"
published: 2026-07-06
updated: 2026-09-08
description: "The unsuccessful simulator project: its original command bridge, discarded hardware plans, and reported July tests."
image: "/posts/ainekio-2026/bounded-autonomy.webp"
avatarImage: "/assets/avatar/avatar.webp"
authorName: "Ainekio"
authorBio: "Robot familiar project"
bannerType: "image"
bannerData:
  imageUrl: "/posts/ainekio-2026/bounded-autonomy.webp"
timelineYear: 2026
timelineEra: "work-in-progress"
timelineLocation: "Robot body"
showImageOnPost: true
tags: [Ainekio, Robot, Motion Systems, Sesame, Raspberry Pi, MetaHuman OS]
category: "V1 Originals"
draft: false
archive: true
lang: "en"
reading:
  topic: v1
  generation: v1
  kind: original
  next: archive/broad-strokes
  related: ["body-design-and-hardware", "controller-firmware"]
---

> [Read the complete original Google document below](#original-document-text) · [All original eight-servo posts](/posts/v1-original-posts/).


# Trying robot commands in a browser

Before Ainekio’s physical robot was tested, the project tried connecting
MetaHuman OS to a simulated body in a browser. MetaHuman supplies conversation
and decisions; the simulator was meant to provide a place to try movement
requests before driving real joint motors.

**The simulator was unsuccessful and has been completely retired.** It is
outside the current robot system and the V2 plan. This page preserves the July
design, reported intermediate results, and later simulator approach as history.
It does not provide instructions for a supported development tool.

The current system uses an ESP32-S3 controller on the physical V1 robot.
Read [controller firmware](/posts/controller-firmware/),
[gateway and dashboard](/posts/gateway-and-simulator/), or the
[V2 roadmap](/posts/ainekio-v2/) for maintained work.

## What it attempted

The experiment used the browser simulator from Sesame, the robot project that
also supplied the starting mechanical design for Ainekio V1. A named request
such as “wave” was supposed to run the corresponding prepared motion.

**Environment Mode** was MetaHuman’s workflow for choosing an action. A Python
**adapter** translated that action into the simulator’s commands. A **shim**,
a small connecting layer, then sent them through the simulator’s existing
UART-style serial interface:

```text
Environment Mode -> event stream -> Ainekio Python adapter
  -> simulator shim -> browser UART path -> Sesame motion routine
```

The adapter reported observations and supported actions, received pushed events
through a server-sent event connection, and translated walk, wave, dance, and
stop requests.
The shim sent the simulator's existing serial commands. An earlier attempt at
direct browser joint manipulation had already been removed.

The July report described command delivery and completion feedback through this
path. Those intermediate results did not produce a successful simulator. No
physical robot had been tested at that point.

## Hardware decisions at the time

The initial Python motion module targeted a Pi Zero 2 W, a small Linux computer,
and a PCA9685 board to generate the servo-control pulses.
The Pi plan was rejected because of availability and package size. It also left
the servo power rail necessary. A guarded PCA9685 placeholder remained disabled
in that revision.

The replacement plan selected Freenove ESP32-S3-WROOM CAM N16R8, using eight
hardware pulse outputs (MCPWM) to control the servos directly. July parts notes proposed MG90S servos, an OV2640 camera,
INMP441 microphone, MAX98357A amplifier/speaker, OLED, a USB-C-charged 2S 18650
pack, two MINI560 5 A converters, and a physical servo-power cutoff.

These were historical selections. The later V1 reference documents an OV3660,
a 1000 mAh 2S pack, and the tested S3 wiring. Use the
[hardware article](/posts/body-design-and-hardware/) for those details.

## Adapter and motion design

The names below describe the retired software interface. A semantic command
states an intended action, such as walk, while a motion sequence supplies the
joint positions needed to perform it.

The Python adapter advertised `robotCommand`, `move`, `stop`, and `sendText`.
It received pushed actions at `/api/environment-bridge/stream`, handled
connection/heartbeat/status events, rejected stale actions after reconnect,
and returned virtual-backend results. Legacy `move` compatibility remained;
`sendText` was acknowledged without moving.

The module contained command types, aliases, serial mappings, a virtual backend,
a provisional eight-servo sequence engine, JSON configuration, and focused tests.
Its safety logic covered emergency stop, low battery, stale commands, offline
behavior, and command lease expiry: ending permission to keep moving when a
command’s allowed time ran out.

Local frame sequences existed for rest, stand, idle, stop, walk, backward, left,
right, and wave. Other named routines ran through Sesame's serial interface;
the corresponding Python sequences were incomplete. Camera, audio, and sensors
were intended as separate services or safety inputs.

## Historical command reference

<details>
<summary className="cursor-pointer py-3">July command mappings and action format</summary>

These mappings document the retired simulator, not today's robot command list.

| Intent | Semantic command | Simulator serial command |
| --- | --- | --- |
| Walk forward | `walk` | `run walk` |
| Walk backward | `backward` | `rn wb` |
| Turn left/right | `left` / `right` | `rn tl` / `rn tr` |
| Stand, stop, idle | `stand`, `stop`, `idle` | `run stand` |
| Rest | `rest` | `run rest` |
| Wave | `wave` | `rn wv` |
| Point | `point` | `rn pt` |
| Dance | `dance` | `rn dn` |
| Swim | `swim` | `rn sw` |
| Cute pose | `cute` | `rn ct` |
| Pushup | `pushup` | `rn pu` |
| Freaky motion | `freaky` | `rn fk` |
| Bow | `bow` | `rn bw` |
| Worm | `worm` | `rn wm` |
| Shake | `shake` | `rn sk` |
| Shrug | `shrug` | `rn sg` |
| Play dead | `dead` | `rn dd` |
| Crab motion | `crab` | `rn cb` |

Natural-language aliases included “walk forward five units,” “turn right,”
“do a push up,” and “play dead.” Debug, calibration, subtrim, and direct-angle
commands were excluded from model actions.

The former graph output included:

```json
{
  "type": "robotCommand",
  "sessionId": "ainekio-sim-1",
  "command": "walk",
  "simulatorCommand": "run walk",
  "units": 5
}
```

It paired a movement action with conversational confirmation. A fallback parser
could generate a supported action and matching wording to avoid contradicting
the command it sent. With the adapter disconnected, Bridge Out reported the
missing adapter instead of accepting the request.

</details>

## Reported tests and unfinished work

The July document reported passing Python unit tests, shim JavaScript syntax
checks, MetaHuman graph validation, and a MetaHuman site build. Existing
Svelte/Vite warnings remained. These were software checks at that time.

The proposed next work was to stabilize simulated motion; port
`movement-sequences.h` routines; bring up S3 firmware with startup, neutral-pose,
power, and connection checks; then add telemetry and senses. Priority sequences
were stand, rest, walking, turns, wave, and stop. Dance, point, pushup, bow,
shake, shrug, play dead, and other emotes followed.

Planned telemetry included connection state, current/last command, safety
lockout, low battery, backend type, and later sensor/reflex state. Physical tests
were to measure servo current, brownouts (voltage drops that reset electronics),
battery fit/runtime, boot and reconnect,
power-rail separation, safe shutdown posture, heat, and enclosure fit. Those
requirements were not satisfied by the simulator's software results.

## Later simulator design

A later approach split the simulator into a **host emulator**, which ran robot
command logic on a computer, and a **browser renderer**, which displayed the
movement. It reused the firmware’s C body core. When no renderer was connected,
the emulator could finish a command without a visual display, called headless
completion. When a renderer was present, the design required its matching
acceptance.
The development launcher grouped the emulator, simulator, gateway, dashboard,
and authenticated adapter; MetaHuman connection required a shared token.

That design targeted command handling, provisioning, prepared motion, joint
timing, and error tests. It could not establish loaded gait performance, supply
stability, traction, printed-joint clearance, or camera results. Its presence in
source does not change the simulator's retired status.

## Historical implementation reference

<details>
<summary className="cursor-pointer py-3">Former files, launchers, and development endpoints</summary>

In the July Ainekio layout, `motion/src/ainekio_motion/` contained:

- `types.py`: command and telemetry types;
- `commands.py`: aliases, action translation, and serial mappings;
- `sequences.py`: joint order and keyframes;
- `backend.py`: virtual backend and disabled PCA9685 placeholder;
- `safety.py`: movement checks;
- `adapter.py`: MetaHuman adapter;
- `metahuman.py`: HTTP/SSE client;
- `simulator_shim.py`: shim server/client;
- `cli.py`: command-line and reconnect handling.

Browser files were `ainekio-shim.js` and `ainekio-idle-throttle.js` under
`simulators/sesame-robot-sim/app/`. The former launchers were
`start-ainekio-adapter.sh`, `start-simulator-shim.sh`, and
`start-ainekio-sim-stack.sh`.

Development used simulator port 8765, shim port 8788 with a `/monitor` page,
MetaHuman port 4321, and an example `ainekio-sim-1` session. The overlay and monitor
were diagnostic views; commands passed through the simulator UART route.

The recorded checks were:

```sh
PYTHONPATH=motion/src python3 -m unittest discover -s motion/tests
node --check simulators/sesame-robot-sim/app/ainekio-shim.js
pnpm validate:graphs
pnpm --dir apps/site build
```

MetaHuman's former integration used:

- `packages/core/src/environment-interface/store.ts`: action dispatch/subscriptions;
- `packages/core/src/api/handlers/environment-bridge.ts`: HTTP/SSE handlers;
- `packages/core/src/nodes/environment/helpers.ts`: parsing and robot commands;
- `action-parser.node.ts` and `send-action.node.ts` in that node directory:
  action parsing, confirmation, and delivery status;
- `etc/cognitive-graphs/environment-mode.json`: the robot action workflow.

These paths and commands are a historical reference, not installation instructions.

</details>

The [original Google document](https://docs.google.com/document/d/1STxKMbLI6e3qjGkIlxk1ea7HBDYXW6MEF5rsJpfY0tU/edit)
was last modified July 10, 2026. The retirement status above reflects the owner's
September 7 correction. Current development is documented in
[Project Status](/posts/current-status/).


## Original document text

The complete original text was copied from the [Google document](https://docs.google.com/document/d/1STxKMbLI6e3qjGkIlxk1ea7HBDYXW6MEF5rsJpfY0tU/edit) on October 12, 2026. The commentary above records the later outcome; the claims and plans below retain their original observation period. Only whitespace and local links have been normalized.

---

# Ainekio Motion Systems - Current Working State

Ainekio's motion stack is now less theoretical than the first plan. The current working path is a MetaHuman OS brain sending semantic robot commands to an Ainekio robot-side adapter, which drives the local Sesame simulator through a small bridge. The hardware target is now the Freenove ESP32-S3-WROOM CAM N16R8 driving all eight servos directly over MCPWM (see the Parts Overview), but the first functional milestone is the simulator loop: prove command interpretation, delivery, safety boundaries, and visible robot behavior before buying parts or touching servos.

The important architecture rule is unchanged: the AI does not get raw servo control. MetaHuman can ask for named robot actions such as `walk`, `wave`, `dance`, or `stop`. Ainekio translates those semantic actions into the simulator or hardware command format.

## Current Architecture

The current development stack is:

```text
MetaHuman OS Environment Mode
|
| event-driven environment bridge stream
v
Ainekio robot-side adapter
|
| semantic command translation + safety boundary
v
Ainekio simulator shim
|
| browser event stream
v
Sesame robot simulator browser page
|
| simulator UART command path
v
Stock Sesame simulator motion routines
```

MetaHuman OS is the remote brain. It runs at the LAN address `http://192.168.0.44:4321` during development. The Ainekio adapter connects out to that address over WiFi or localhost networking, posts its observation/capability state, then keeps a persistent server-sent event stream open for incoming actions.

The local simulator stack runs three processes from the Ainekio repo:

```sh
./start-ainekio-sim-stack.sh
```

That starts:

- Sesame simulator: `http://127.0.0.1:8765/`
- Ainekio simulator shim: `http://127.0.0.1:8788/`
- Shim monitor: `http://127.0.0.1:8788/monitor`
- Ainekio adapter, pointed at MetaHuman OS and session `ainekio-sim-1`

This is not the final robot runtime. It is the development proving ground for the slave brain.

## What Works Now

MetaHuman Environment Mode now understands Ainekio as a robot environment, not a Megameal-specific environment. The environment graph can take normal text such as "please walk forward 5 units" and produce a typed robot action.

The bridge is event-driven. The old action polling path has been removed from this work path because it was wasteful and unclear. The adapter opens a persistent stream at the MetaHuman environment bridge and receives pushed action events. The stream sends a handshake and heartbeats, and the adapter republishes observations so MetaHuman knows the robot session is alive.

The Environment Bridge Out node now reports clear delivery state. If the Ainekio adapter is not connected, MetaHuman returns a user-visible message instead of silently accepting a movement command. The expected stopped-adapter message is:

```text
I understood the environment command, but no robot adapter is connected for session ainekio-sim-1. Start the Ainekio adapter and try again.
```

When the adapter is connected, commands are queued to the stream, received by Ainekio, translated into motion, sent to the simulator shim, and reported back to MetaHuman as completed.

## Current Command Surface

The current semantic command vocabulary is based on the stock Sesame motion routines exposed by the simulator firmware path. Ainekio and MetaHuman now agree on these command names:

| Intent | Semantic command | Simulator serial command |
|---|---:|---:|
| Walk forward | `walk` | `run walk` |
| Walk backward | `backward` | `rn wb` |
| Turn left | `left` | `rn tl` |
| Turn right | `right` | `rn tr` |
| Stand / stop / idle | `stand`, `stop`, `idle` | `run stand` |
| Rest | `rest` | `run rest` |
| Wave | `wave` | `rn wv` |
| Point | `point` | `rn pt` |
| Dance | `dance` | `rn dn` |
| Swim | `swim` | `rn sw` |
| Cute pose | `cute` | `rn ct` |
| Pushup | `pushup` | `rn pu` |
| Freaky motion | `freaky` | `rn fk` |
| Bow | `bow` | `rn bw` |
| Worm | `worm` | `rn wm` |
| Shake | `shake` | `rn sk` |
| Shrug | `shrug` | `rn sg` |
| Play dead | `dead` | `rn dd` |
| Crab motion | `crab` | `rn cb` |

The natural-language parser handles common phrasing such as "walk forward five units," "turn right," "do a push up," and "play dead." It is intentionally conservative. Debug, calibration, subtrim, and direct servo-angle commands are not exposed to the AI command surface.

## Simulator Control Boundary

The simulator bridge does not bypass the Sesame simulator's motion code. That point matters.

An earlier experiment tried direct joint manipulation inside the browser simulator. That was removed. The current browser shim sends the simulator's own serial commands through the simulator UART path, for example `rn wv` for wave or `run walk` for walk. This keeps Ainekio aligned with the simulator's programmed routines instead of inventing a separate hidden movement system.

The shim still shows an overlay and a monitor page for debugging. Those are diagnostic surfaces only. The actual simulator command path is the Sesame runtime's UART command route.

## Ainekio Adapter State

The adapter lives in `/home/greggles/Ainekio/motion/src/ainekio_motion/adapter.py`. It currently:

- publishes an environment observation to MetaHuman OS
- advertises `robotCommand`, `move`, `stop`, and `sendText` actions
- connects to `/api/environment-bridge/stream`
- handles stream `connected`, `heartbeat`, and `status` events
- translates `robotCommand` actions into Ainekio `MotionCommand` objects
- still accepts legacy `move` actions for compatibility
- acknowledges `sendText` actions without trying to move
- rejects stale actions so old movement does not fire after reconnect
- runs the virtual backend and reports completion back to MetaHuman
- optionally publishes motion payloads to the local simulator shim

The adapter can be started directly with:

```sh
./start-ainekio-adapter.sh
```

or as part of the full simulator stack:

```sh
./start-ainekio-sim-stack.sh
```

## Motion Module State

The Python motion module is the robot-body boundary. It is intentionally small and standard-library-first. It was originally written against a Pi Zero 2 W target; it now serves as the brain-side reference implementation and virtual backend while the physical body moves to ESP32-S3 firmware.

Current implemented pieces:

- semantic robot command enum
- command alias parsing
- simulator serial-command mapping
- virtual backend
- sequence engine with provisional Sesame servo order
- guarded hardware backend placeholder (written against PCA9685, now a superseded fallback path) that refuses hardware actuation unless explicitly enabled
- safety controller for e-stop, low battery, stale commands, command lease expiry, and offline fallback
- JSON config loader
- focused unit tests

Current local servo-frame sequences exist for:

- `rest`
- `stand`
- `idle`
- `stop`
- `walk`
- `backward`
- `left`
- `right`
- `wave`

The expanded commands such as `dance`, `pushup`, `bow`, and `dead` are supported through the Sesame simulator serial command path, but their full Python servo-frame sequences still need to be ported if the local motion library is going to own those motions directly. On the physical robot, the Sesame-derived ESP32-S3 firmware already contains these routines.

## MetaHuman Environment Mode State

Environment Mode has been adapted to emit Ainekio-compatible action objects. The important output shape is:

```json
{
"type": "robotCommand",
"sessionId": "ainekio-sim-1",
"command": "walk",
"simulatorCommand": "run walk",
"units": 5
}
```

For movement or pose requests, the graph should produce both:

- conversational confirmation to the user
- a `robotCommand` action for the Environment Bridge Out node

The fallback parser prevents a bad user experience where the model says it cannot move while the deterministic parser sends a movement command anyway. If the user clearly asks for a supported robot action, the parser can synthesize the robot command and use a matching confirmation such as "I'll walk forward 5 units."

## Current Verification

The current state has been checked with focused validation rather than only manual clicking:

- Ainekio unit tests: `PYTHONPATH=motion/src python3 -m unittest discover -s motion/tests`
- Browser shim syntax: `node --check simulators/sesame-robot-sim/app/ainekio-shim.js`
- MetaHuman graph validation: `pnpm validate:graphs`
- MetaHuman site build: `pnpm --dir apps/site build`

At the last validation pass, Ainekio tests passed, all MetaHuman cognitive graphs validated, and the MetaHuman site rebuilt successfully. The MetaHuman build still prints existing Svelte/Vite warnings that are unrelated to Ainekio motion.

## What Is Not Done Yet

No physical robot hardware has been tested. The target board is now the Freenove ESP32-S3-WROOM CAM N16R8, and no code is driving real servos yet.

The guarded PCA9685 backend code remains disabled and is now a superseded fallback: the selected build drives servos directly from the ESP32-S3's MCPWM peripheral with no PCA9685. The guard still prevents accidental servo movement while the system is developed against the simulator.

The simulator motion quality is not final robot gait quality. The Sesame simulator can execute stock routines, but the project still needs real sequence tuning, body fit checks, power measurements, and hardware validation.

The expanded simulator command list is not the same as a complete Python motion library. It means the simulator can receive those named routines. It does not mean every routine has been reimplemented as local Ainekio servo-frame data.

Audio, speech, vision, and sensors are outside the motion module. MetaHuman OS currently owns conversation and voice-side intelligence. The physical body now has selected sense/output hardware - INMP441 I2S microphone, MAX98357A amplifier and speaker, the Freenove onboard OV2640 camera, and an OLED face (see the Parts Overview) - but those remain separate services or safety inputs, not part of the motion command API.

## Hardware Direction

The hardware decision has been made: the body controller is the Freenove ESP32-S3-WROOM CAM, N16R8 variant (16MB flash, 8MB octal PSRAM for camera streaming). The ESP32-S3 drives all eight servos directly through its MCPWM peripheral, which eliminates the PCA9685 board entirely and preserves the hand-wired Sesame-style servo rail. The Pi Zero 2 W path is superseded: it was ruled out on stock availability and total-package size, and it never removed the servo-rail subsystem. The Parts Overview document is authoritative for the full build.

The likely physical stack is:

- Freenove ESP32-S3-WROOM CAM N16R8 (onboard OV2640 camera)
- eight direct MCPWM servo signals - no PCA9685 or other servo expander
- eight MG90S-class servos from the Sesame design on the hand-wired servo rail
- 2S 18650 pack with onboard USB-C charging, feeding two MINI560 5A bucks: one servo rail, one electronics rail
- physical servo power cutoff
- local safety gates before movement
- MetaHuman OS connection over WiFi

The first physical milestone is not autonomy. It is safe command execution: connect to MetaHuman, receive a semantic command, decide whether it is safe, and execute a known sequence without brownout or stale-command replay.

## Roadmap From Here

### 1. Keep the simulator path stable

The simulator should remain the first test target. The immediate goal is a reliable loop where Environment Mode commands produce visible Sesame simulator routines through the UART command path.

### 2. Port real motion routines into Python

The stock Sesame `movement-sequences.h` routines need to be ported into Ainekio sequence data. That keeps the Python module useful as a virtual backend and reference, and documents the sequence data independently of the simulator's embedded firmware routines. On the physical robot, the same routines already live in Sesame-derived ESP32 firmware, which is the selected execution path.

Priority routines:

- stand
- rest
- walk forward
- walk backward
- turn left
- turn right
- wave
- stop / safe posture

Secondary routines:

- dance
- point
- pushup
- bow
- shake
- shrug
- play dead
- other Sesame emotes once the core motion library is stable

### 3. Bring up the ESP32-S3 hardware backend

Only after simulator behavior and sequence data are stable should the physical body be enabled. The path is Freenove ESP32-S3 firmware exposing the same semantic/serial command surface the simulator already uses, driven over WiFi by the adapter. It needs explicit hardware configuration, MCPWM (not LEDC) servo output, startup checks, safe neutral posture, and a way to refuse movement if power or connection state is unsafe. The guarded PCA9685 Python backend remains in the repo as a superseded fallback.

### 4. Add telemetry

The robot should report useful state back to MetaHuman:

- connected / disconnected
- current command
- last completed command
- safety lockout state
- low-battery state
- backend type
- future sensor/reflex state

### 5. Add senses separately

Camera, microphone, speaker, and ultrasonic sensors should not be folded into the motion module. They should feed observations or safety/reflex inputs into the body system. Motion remains the actuator boundary.

### 6. Hardware validation

Physical bring-up needs measured data, not assumptions:

- worst-case servo current
- brownout behavior
- battery fit and runtime
- ESP32-S3 boot time and reconnect behavior
- servo rail separation
- safe shutdown posture
- heat and packaging inside the Sesame body

## Current File Map

### Ainekio repo

- `/home/greggles/Ainekio/motion/src/ainekio_motion/types.py` - semantic command and telemetry datatypes.
- `/home/greggles/Ainekio/motion/src/ainekio_motion/commands.py` - command parsing, aliases, environment action translation, and simulator serial mapping.
- `/home/greggles/Ainekio/motion/src/ainekio_motion/sequences.py` - provisional Sesame servo order and local keyframe sequence rendering.
- `/home/greggles/Ainekio/motion/src/ainekio_motion/backend.py` - virtual backend and guarded hardware backend boundary (PCA9685 code retained as superseded fallback).
- `/home/greggles/Ainekio/motion/src/ainekio_motion/safety.py` - safety controller.
- `/home/greggles/Ainekio/motion/src/ainekio_motion/adapter.py` - MetaHuman environment bridge adapter.
- `/home/greggles/Ainekio/motion/src/ainekio_motion/metahuman.py` - small MetaHuman HTTP/SSE client.
- `/home/greggles/Ainekio/motion/src/ainekio_motion/simulator_shim.py` - local simulator shim server and client.
- `/home/greggles/Ainekio/motion/src/ainekio_motion/cli.py` - adapter CLI and reconnect loop.
- `/home/greggles/Ainekio/simulators/sesame-robot-sim/app/ainekio-shim.js` - browser-side Sesame simulator shim.
- `/home/greggles/Ainekio/simulators/sesame-robot-sim/app/ainekio-idle-throttle.js` - idle frame throttling for the browser simulator.
- `/home/greggles/Ainekio/start-ainekio-adapter.sh` - starts only the Ainekio adapter.
- `/home/greggles/Ainekio/start-simulator-shim.sh` - starts only the local simulator shim.
- `/home/greggles/Ainekio/start-ainekio-sim-stack.sh` - starts the simulator, shim, and adapter together.
- `/home/greggles/Ainekio/motion/tests/` - focused tests for adapter, commands, config, safety, sequences, and simulator shim behavior.

### MetaHuman repo

- `/home/greggles/metahuman/packages/core/src/environment-interface/store.ts` - event-driven environment action dispatch and stream subscription support.
- `/home/greggles/metahuman/packages/core/src/api/handlers/environment-bridge.ts` - environment bridge HTTP/SSE handlers.
- `/home/greggles/metahuman/packages/core/src/nodes/environment/helpers.ts` - environment action parsing, Ainekio robot command contract, and natural-language fallback parser.
- `/home/greggles/metahuman/packages/core/src/nodes/environment/action-parser.node.ts` - action parser node and robot command confirmation behavior.
- `/home/greggles/metahuman/packages/core/src/nodes/environment/send-action.node.ts` - Environment Bridge Out delivery/status node.
- `/home/greggles/metahuman/etc/cognitive-graphs/environment-mode.json` - Environment Mode graph using the Ainekio-compatible action flow.

## Bottom Line

Ainekio now has a functional command bridge and simulator-facing slave brain. The system can take a natural-language Environment Mode command, turn it into a semantic robot action, send it over a persistent bridge stream, run it through the Ainekio adapter, and forward it to the Sesame simulator without exposing raw servo control to the AI.

The next hard work is not more architecture. It is motion quality and hardware truth: port the real Sesame sequences, keep the simulator honest, then bring up the Freenove ESP32-S3 body controller with power and safety measurements.
