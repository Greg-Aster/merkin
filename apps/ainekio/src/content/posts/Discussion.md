---
title: "V1: Original Design Discussion"
published: 2026-07-07
description: "Original design deliberations: controller alternatives, power, communications, fitment, and early Generation 2 candidates."
image: "/posts/ainekio/kaiju-battle-banner.webp"
avatarImage: "/assets/avatar/avatar.webp"
authorName: "Ainekio"
authorBio: "Robot familiar project"
showImageOnPost: true
showToc: true
tags: [Ainekio, V1, Original Documents, Build History]
category: "V1 Originals"
draft: false
archive: true
lang: "en"
contentFormat: "report"
reading:
  topic: v1
  generation: v1
  kind: original
  next: firmware
  related: ["body-design-and-hardware", "controller-firmware"]
---

> **Original eight-servo era document.** Copied from the [original Google Doc](https://docs.google.com/document/d/1W6tBv69McloKX-0O9Lbr3ebVgXQyvL2sXHQsEvOILTo/edit) on October 12, 2026. The text below retains its own historical status and later additions; “current” refers to the document’s observation period, not today. [All original posts](/posts/v1-original-posts/) · [Current project status](/posts/current-status/).

> **Later V1 correction:** the built robot used a 1000 mAh pack, not the proposed 2600 mAh pack. GPIO33–37 belong to octal PSRAM on the delivered N16R8; the provisional GPIO33/34 assignments below were superseded. Use the [V1 hardware guide](/posts/body-design-and-hardware/) and [maintained S3 pin map](https://github.com/Greg-Aster/Ainekio-bot/blob/main/Slave/firmware/esp32s3/components/ainekio_platform/include/ainekio/platform/pin_map.h) for the later build record.

---

# Ainekio - Design Discussion

**The working deliberation behind the project - architecture options, hardware comparisons, communication, power, parts, and open questions. The short version of what Ainekio is lives in the project overview.**

## Current status - July 13, 2026

Confirmed implementation facts:

- The portable C command, lifecycle, safety, protocol, and provisioning core is implemented and host-tested.
- The ESP-IDF v5.5.4 firmware scaffold cross-builds with the portable core and a validated partition layout. Hardware drivers and physical-board verification remain pending.
- The protocol-v1 body emulator and local gateway stub implement the initial control path. Broader negative-path and media work remains in progress.

Owner-reported physical progress:

- The first leg components have been printed.
- Parts from the selected parts list have been ordered. Arrival, inspection, installation, and testing are not yet claimed.
- Firmware work is underway.

Pending physical work:

- Hardware flashing and bring-up, remaining chassis printing, assembly, wiring, fit testing, single-joint testing, and hardware safety validation.

## Historical system architecture design options and considerations

Option 1

- Remote machine running heavy hardware broadcasting as a web server. The robot connects to a wifi network and communicates with the server. This option requires a wifi network, the robot could receive this from a local network or tethered to a network from a mobile device - the processing limits on this have fewer restrictions and the robot can be responsive and intelligent - ai models running the robot can be very large. Data for the ai models exchanged has limits if operating mobile - if the robot is using a camera higher quality video is something that must be considered, as well as the text to speech system - the current MetaHuman OS supports text to speech and speech to text, running these on the robot body would be difficult.

Option 2

- Historical proposal: AI software running on a mobile device such as a phone could broadcast commands to the robot. That would require a dedicated app, constrained on-device models, and reliable background services for persistent processes. This was previously considered for a later phase; phone-as-brain operation is outside the v1 scope.

Option 3

- Have a beefier onboard computer for the bot - modified cell phone, raspberry pi, orange pi have been considered - this causes more concern with power consumption, it has a higher buy in, and larger form factor for the boards - but this has the option of being a fully mobile system and is the most attractive for the all in one package.

Notes

Historical conclusion at the time was a hybrid of all three options. The v1 architecture is now narrower: MetaHuman OS runs on the remote computer, while Ainekio's ESP32-S3 body handles sensing, semantic commands, motion, and local safety. Cloud escalation, phone operation, and heavier onboard compute remain outside the v1 implementation.

## Chips and hardware considered (current and superseded)

- Basic ESP32 chips were considered but do not look like a good fit for full audio/video robot behavior. They may still be useful for low-data sensor/reflex work, but they are not enough for conversational audio, vision relay, and body control all at once.
- Earlier alternative — XIAO ESP32S3 Sense: this was a viable small robot-side bridge with WiFi/BLE, 8MB PSRAM, 8MB flash, camera support, and an onboard digital microphone. It was rejected for the current prototype because the complete design still required a PCA9685 servo-control board, adding board area, cost, wiring, and software complexity. The selected Freenove board needs an external microphone, but that can be useful because the microphone can be placed away from servo noise and the speaker; the Freenove also provides 16MB flash and a microSD slot.
- The XIAO alternative's main benefit was its onboard camera and microphone in a very small controller package. Its downside was that it did not remove the motor-power subsystem and added the PCA9685 to it. The controller looked small in isolation, but the complete XIAO + PCA9685 + servo rail package was not the smallest or simplest complete build.
- There are more exotic options such as ESP32-P4 plus ESP32-S3, but that starts becoming its own architecture rather than the smallest simple controller.
- Superseded first-step target: XIAO ESP32S3 Sense + PCA9685 + separate 5V servo rail. This remains a technically valid fallback, but it is no longer the selected build because the extra servo-control board works against the project's size, cost, and simplicity goals.
- Radxa ZERO 3W / Raspberry Pi Zero 2 W remain fallback Linux-body-controller options. Use them only if the ESP32S3 firmware becomes too limiting for camera/audio/network handling or if the robot body needs Linux services directly. They do not solve the servo-rail problem and are larger, higher-power, and more complex than the XIAO path.
- Next step up from the XIAO body controller: NVIDIA Jetson Orin Nano / Jetson Orin family or the existing RTX desktop as the nearby AI brain. This is the AI-specific branch, not a replacement for the servo/body controller. Treat Jetson as an external/backpack/nearby commander because the module/dev kit, carrier board, heatsink/fan, battery, wiring, and power draw are outside the original Sesame internal electronics scale.

Notes

The current first physical controller target is the Freenove ESP32-S3-WROOM CAM N16R8 with a hand-wired Sesame-style servo rail and eight direct MCPWM servo signals. This avoids the separate PCA9685 board. The Freenove supplies the camera, 16MB flash, 8MB octal PSRAM, and a microSD slot; audio uses an external INMP441 microphone and MAX98357A amplifier. The robot remains a body controller and sensor bridge rather than the main AI brain.

Above the Freenove body controller, the next serious branch is NVIDIA Jetson rather than another general SBC. Jetson Nano / Jetson Orin Nano remains an external or nearby AI-commander option for local vision, speech, perception, and small local-model experiments. It should communicate with the body controller over WiFi, USB, UART, or a local network link instead of replacing the internal servo controller.

## Current controller decision and prototype constraints

- Current body controller: Freenove ESP32-S3-WROOM CAM N16R8. It provides the onboard camera, 16MB flash, 8MB octal PSRAM, a microSD slot, WiFi, and the PWM peripherals needed for the current eight-servo design. Audio uses an external INMP441 microphone and MAX98357A amplifier.
- XIAO status: viable alternative, rejected for this prototype. Its onboard camera/microphone and tiny board are attractive, but the required PCA9685 adds another board, wiring, cost, and software complexity. The Freenove's external microphone can be placed deliberately away from servos and the speaker.
- PWM resource decision: the camera generates XCLK with one of the ESP32-S3's eight LEDC channels, leaving seven LEDC channels. The two MCPWM units provide twelve separate generator outputs, so putting all eight servos on MCPWM resolves the PWM-peripheral conflict. Firmware must explicitly use MCPWM; a servo library that silently uses LEDC would reintroduce the conflict.
- Current provisional MAP_B: servo MCPWM outputs on GPIO 1, 2, 14, 21, 33, 34, 45, and 46; battery ADC on GPIO 3; SD_MMC reserved on GPIO 38 (CMD), 39 (CLK), and 40 (DAT0); I2S BCLK on GPIO 41, WS on GPIO 42, microphone DIN on GPIO 19, and amplifier DOUT on GPIO 20; OLED I2C SDA on GPIO 47 and SCL on GPIO 48. GPIO 33 and GPIO 34 remain explicitly provisional and subject to hardware verification under gate H2. GPIO 3, 45, and 46 are strapping pins and must be tested with attached circuitry. This map follows System Specification v1.0 and is not yet hardware-validated.
- microSD reservation: Freenove assigns GPIO 38, 39, and 40 to SD_MMC CMD, CLK, and DAT0. MAP_B reserves those pins exclusively for the board-mounted microSD slot in 1-bit mode; they are not servo or accessory pins. Electrical pull-ups and concurrent camera, PSRAM, SD, and PWM operation remain subject to hardware verification.
- USB-C decision: the current prototype keeps two separate ports because the Freenove board and the charger already have soldered USB-C connectors. The Freenove USB-UART port is for programming; the charger port is charge-only. One-port charging plus data is paused because a proper solution likely needs a different charge/power-path controller or custom USB/power wiring, which adds effort and may add bulk.
- Packaging risk: the onboard charger, larger 2S 18650 pack, two buck converters, perfboard/servo rail, bulk capacitor, microphone, amplifier, and speaker may force an internal-frame change. The charger and larger battery solve usability and runtime problems but may still be the parts that break the original Sesame fit envelope.
- Selected power parts: HiLetgo 2S/3S/4S USB-C charger, ASIN B0CHS2DXKZ, configured for 2S; 7.4V 2600mAh 2S1P 18650 pack, ASIN B0DR33HLQ5. The battery is seller-listed as protected. Treat that as expected onboard protection, but verify the delivered pack; protection does not by itself prove cell balancing or TEMP/NTC compatibility.

## Sensors

Ainekio already has an OV2640 camera for vision and an external INMP441 microphone for sound. Because the body is extremely compact, additional sensors should provide several useful functions without adding another large subsystem.

The next likely sensor is a 6-axis IMU: an accelerometer and gyroscope. One small board can report body tilt, approximate pitch and roll, rotation, movement, falls, impacts, and whether the robot has been picked up. It will not measure individual servo angles or obstacle distance.

Leading options:

- Pololu LSM6DSO, 13 × 23 × 3mm — compact, simple, and the safest general choice## Wireless charging

Wireless charging is a feasible optional modification, but it should use a dedicated Qi receiver rather than a conventional RFID energy-harvesting antenna. RFID and ordinary NFC harvesting provide far too little power for the robot's approximately 19Wh 2S battery pack.

Proposed charging path:

- 10W Qi transmitter in the charging dock
- 5V Qi receiver inside the robot, rated for at least 1.5A continuous and preferably 2A
- Existing HiLetgo 2S boost charger, configured for an 8.4V battery
- Existing protected 2S1P battery pack

The Qi receiver replaces only the physical USB-C charging feed. The HiLetgo charger must remain because it converts the receiver's regulated 5V output into the correct 8.4V CC/CV charging profile for the 2S pack. The battery protection, two MINI560 buck converters, master switch, voltage divider, and capacitors are unaffected. If charging becomes wireless-only, the panel-mount USB-C extension can be removed. If USB-C is retained as a backup input, it must not simply be wired in parallel with the Qi receiver; the two inputs require isolation or deliberate source selection.

A representative 10W receiver uses a roughly 42mm-diameter, 1mm-thick coil, a receiver board around 35 × 20 × 2.5mm, and weighs about 8g. A realistic installed allowance is approximately 45 × 45 × 4-6mm and 8-12g after ferrite backing, insulation, wiring, and clearance. Removing the panel-mount USB-C extension may make the net weight change negligible. The transmitter, power supply, and most of the charging hardware remain in the dock and add no onboard bulk.

The coil's flat footprint is the main packaging constraint. The preferred location is against the inside of the underside or rear shell with no battery, screws, servo hardware, or other metal directly behind it. A shaped docking cradle can provide repeatable alignment without adding onboard magnets. Coil alignment, shell thickness, temperature rise, charge stability, and electromagnetic interaction with the assembled robot require bench validation.

With the existing conservative 2S charger and 2600mAh pack, estimated recharge time is approximately five to six hours. Wireless charging should occur with master power off and the servos inactive. This remains a proposed convenience modification rather than a committed v1 requirement until the 45mm coil footprint and thermal behavior are checked against the printed chassis.

## ESP32S3 interface app considerations

The first software tool to design is not the full AI brain. It is an ESP32S3 body interface app for setup, testing, calibration, and safety.

Likely app shape:

- A local web dashboard served by the nearby brain computer, with the Freenove body controller connecting over WiFi/WebSocket.
- Optional direct setup mode where the body controller exposes a temporary WiFi access point for first-time network/server configuration.
- Phone/laptop browser as the UI instead of a native app at first. This keeps the first version simple and cross-platform.

Core interface app functions:

- Connection status: robot online/offline, brain server reachable, WiFi strength, heartbeat age.
- Emergency stop: immediately drop movement commands and send neutral/safe pose.
- Manual movement controls: sit, stand, look left/right, look up/down, small step, stop.
- Servo calibration: center points, min/max limits, direction inversion, named poses.
- Camera panel: snapshot button first; low-FPS preview later if bandwidth allows.
- Microphone panel: audio level meter, record/send short test clip, microphone health check.
- Speaker panel: play test tone, play TTS sample, volume/gain testing if a speaker amp is added.
- Power panel: servo rail status if measurable, battery voltage if sensor added, brownout/restart counter.
- Logging: save command history, disconnects, movement faults, camera snapshots, and sensor events.
- Brain endpoint setup: server URL/IP, auth token if used, robot name/id.

Architecture rule:

The app should send intent-level commands, not raw servo spam. Examples: `sit`, `stand`, `look_left`, `neutral_pose`, `calibrate_servo_3`. The Freenove firmware maps those commands to MCPWM servo positions and refuses unsafe commands. This keeps AI weirdness and interface mistakes away from direct servo control.

First implementation target:

- Browser dashboard on the brain computer.
- Freenove body controller connects outward to the brain over WebSocket.
- JSON messages for commands, status, and telemetry.
- Snapshot/audio upload endpoints handled by the brain computer.
- Servo calibration is stored in internal NVS, with export/import through the dashboard. The board-mounted microSD pins are reserved by MAP_B; removable-media features remain later work.

## Communication considerations

- How the robot talks to the brain needs to be defined before hardware matters. Leaning toward the robot always dialing out (websocket or similar) to a known address rather than opening ports at home - a cloudflare worker or small relay could be the meeting point.
- Commands from the brain should probably be intent level (sit, stop, look around, speak this) and let the robot firmware figure out the servo work. Keeps latency and model weirdness from becoming physical problems.
- What happens to commands during a disconnect - queue them or drop them? Dropping stale commands seems safer. A move command from a minute ago firing on reconnect is a problem.
- Video bandwidth is the big unknown - full stream vs frames on request vs onboard motion detection that only sends when something happens. Need to test what the Freenove ESP32-S3 N16R8 and network can actually sustain while MCPWM, audio, and command handling are active. The practical test is WiFi reliability, camera snapshot/low-FPS behavior, audio chunk handling, servo timing, and latency inside the small body.
- Heartbeat both directions so each side knows the other is alive. I dislike polling systems as it is wasted processing. But may be needed for sleep systems and low power modes. :(

## Power considerations

- Servos stall and stall current is significant - servo power and logic power probably need to be on separate rails so a stall doesn't brown out the board mid-move.
- Need real numbers: measure worst case draw with legs loaded, not spec sheet numbers.
- Low battery behavior - warn threshold (refuse new movement), cutoff threshold (safe posture, shut down motion).
- Physical power switch that actually cuts servo power, not just software.
- Need to check what the Sesame design already handles here before buying parts - possible some of this is solved.

Earlier XIAO ESP32S3 Sense power note (superseded):

- The XIAO ESP32S3 Sense can handle the controller/sensor side, not the servo power side. It can be powered from 5V USB-C or a single-cell lithium battery input around 3.7V.
- Official Seeed numbers put webcam use around 5V/~140mA average and ~347mA peak during image capture. Microphone recording is much lighter, around 5V/54.58mA average and 86.7mA peak. WiFi active is listed around 110mA.
- Practical controller budget: reserve 5V 0.5A-1A for XIAO + camera + mic + WiFi, with extra margin if adding an I2S speaker amplifier.
- Do not treat the XIAO 5V pin as a motor rail. It is a board power input/output point, not a high-current servo distribution bus. The GPIO pins are control signals only.
- The onboard microphone uses PDM/I2S on GPIO42 clock and GPIO41 data in Seeed's example. The camera also consumes a set of dedicated camera pins. This makes direct 8-servo PWM from the XIAO unattractive even if it is technically possible.
- Better architecture: XIAO ESP32S3 Sense handles WiFi, mic, camera, command bridge, and safety logic; PCA9685 handles the 8 servo PWM outputs over I2C; a separate 5V servo rail powers the servos.
- This means the XIAO option should be judged as XIAO + PCA9685 + servo rail hardware, not as the XIAO board alone. Its advantage is sensor integration and small controller footprint, not eliminating the bulky power-distribution problem.

Servo rail note:

- The official Sesame BOM says Sesame needs at least 5V 3A available at the rails. Treat that as a minimum, not comfortable headroom.
- Practical Ainekio estimate: normal movement may be around 1A-3A total and heavy movement may approach the 5A design ceiling. Treat 5A as the high estimate until the assembled robot is measured.
- Recommended test target: 5V 5A buck converter for the servo rail, common ground with the controller, and a 1000uF or larger electrolytic capacitor near the servo rail.
- The servo rail is physically large compared with the microcontroller. It is not just a trace or a signal header: it means a 5A-capable buck converter, heavier power wiring, servo power distribution, connector space, a bulk capacitor, and a physical cutoff switch. This may dominate the internal packaging more than the controller board itself.
- Do not power the servo rail through the Freenove board. Wire the system as: battery to main switch, then to the servo buck and hand-wired servo 5V rail, with a separate electronics buck for the Freenove board and audio electronics. All grounds remain common.

Original Sesame rail compatibility:

- The original Sesame robot already uses a servo power rail. In the hand-wired S2 Mini build this is literally a 5V rail and ground rail across the servo headers. In the distro-board builds, the custom board acts as the organized rail and signal distribution system.
- A XIAO-based Ainekio controller could reuse the original Sesame servo rail concept, but it should not send servo current through the XIAO. The safe reuse is: Sesame rail powers servo V+ and servo ground, XIAO has its own clean logic power, and all grounds are common.
- The easiest XIAO prototype path is probably a hand-wired Sesame-style rail plus PCA9685, or a small servo breakout/distribution board plus PCA9685.
- rail architecture is now settled in the Parts Overview (hand-wired Sesame-style rail, two MINI560 branches, common ground). The remaining rail questions are validation, not architecture: measured worst-case current and physical fitment.

## Earlier XIAO/PCA9685 parts concept (superseded)

Historical modified Sesame BOM for the XIAO ESP32S3 Sense alternative. The current authoritative build is in the Parts Overview document.

Based on the [official Sesame BOM](https://github.com/dorianborian/sesame-robot) under `hardware/bom`. Keeping the mechanical and servo side stock, swapping the brain and adding senses.

Kept from stock BOM:

- MG90S all-metal micro servos ×8 (buy 10 for spares)
- 0.96" SSD1306 I2C OLED (face) - talks I2C, can share the bus with the servo board if addresses do not conflict (example: OLED 0x3C, PCA9685 often 0x40)
- KCD1 rocker power switch, panel mount
- 22AWG silicone wire (power bus), 30AWG silicone wire (signal), heat shrink, small zip ties
- M2 × 5mm self-threading screws (~40), M2.5 × 5mm machine screws (~10, servo horns - included horn screws are too short)
- XT30 female pigtail (never cut the factory battery connector)
- 11-part printed frame from the repo STLs

Controller package for first build:

- XIAO ESP32S3 Sense. This was the preferred body-controller alternative at this stage because it was tiny, WiFi-capable, and included camera/mic support. It was later superseded by the Freenove direct-MCPWM design.
- microSD card for the XIAO Sense expansion board if local image/audio logging is useful. This is optional for first motion tests.
- PCA9685 16-channel PWM/servo controller board or HAT wired over I2C - this is the servo signal bus. Only 8 of 16 channels are used at first, leaving headroom for a tail or head servo later. Servo power still enters the PCA9685 servo V+ rail/screw terminal separately and never flows through the XIAO.

Added / enabled senses and interface hardware:

- XIAO ESP32S3 Sense camera module / expansion camera - use for snapshots or low-FPS visual feed to the nearby brain
- Onboard digital microphone on the XIAO Sense expansion board for audio capture / wake detection / upstream speech chunks
- I2S amplifier (MAX98357A) + small speaker, 4 or 8 ohm, 1-2w, ~20-30mm - plan for a real speaker amp rather than assuming HDMI/USB audio is useful inside the robot

Power - upgraded from stock:

- Stock BOM calls for 5v 3a minimum at the rails for servos alone. Treat 5v 5a as the safer target for testing. Use separate power paths: one buck/rail for servo V+ into the PCA9685/servo distribution, and a clean controller power path for the XIAO. The XIAO must not be the path that powers the servos.
- If using the XIAO ESP32S3 Sense instead of the Linux SBC, still use a PCA9685 or equivalent servo controller and a separate 5v 5a servo rail. The XIAO may command the servos, but it must not be the path that powers them. Budget 5v 0.5a-1a for the XIAO/camera/mic/WiFi side, plus speaker-amp margin if used.
- The 5v 5a servo rail is a large physical subsystem: buck converter, heavier wire, connector/distribution space, capacitor, and switch. It needs a real packaging check, not just an electrical line item.
- 1000µF electrolytic cap on the servo rail (stock BOM has this for the V1 board, keep it)
- Battery - stock option is a 3S 450mah lipo with XT30, high discharge. XIAO uses far less power than a Linux SBC, but the servos dominate runtime. Look at 3S 650-850mah only if it fits the cavity and the added weight does not hurt motion.

## Size fitment

The numbers:

- Radxa ZERO 3W: 65 × 30mm, same footprint class as Pi Zero 2 W; height depends on header/camera/thermal setup
- Pi Zero 2 W: 65 × 30 × 5mm bare, ~13mm with header
- XIAO ESP32S3 Sense: 21 × 17.8mm board footprint, but taller with the Sense camera expansion installed
- PCA9685 board/HAT stacked or wired nearby: board footprint depends on exact model; total stack height with headers is likely the fitment problem, not the bare SBC
## Fitment checkpoint - original Sesame vs Ainekio electronics

Known / working dimensions:

- Original hand-wired Sesame controller: Lolin S2 Mini is 34.3 × 25.4mm. The hand-wired build also uses a small protoboard around 50 × 70mm to host the servo header matrix and 5V/GND rails. This means the servo rail is not just the ESP32 board; it is the header/rail/wiring area.
- Original Sesame Distro Board V3/V2: custom board with onboard ESP32-S3, USB-C power, battery connector, servo headers, and rail/distribution. Exact dimensions need to be measured from the EasyEDA/Gerber files or a converted board outline before assuming it fits replacements.
- Legacy ESP32-DevKitC + Distro Board V1: working estimate remains around 55 × 28mm footprint on standoffs, but verify against the PCB layout if using it as a hard boundary.
- XIAO ESP32S3 Sense: 21 × 17.8mm board, roughly 21 × 17.8 × 15mm with the Sense expansion/camera board.
- Raspberry Pi Zero 2 W: 65 × 30mm.
- Radxa ZERO 3W: 65 × 30mm Zero-class board; likely same length issue as Pi Zero-class boards.
- PCA9685 / Adafruit servo bonnet example: 65 × 30.4 × 8mm board before stacking/wiring. Generic PCA9685 breakouts vary, but servo plugs and power wiring are the dominant fit problem.
- Jetson Nano / Orin Nano module: about 69.6 × 45mm module before carrier, heatsink, fan, power and connectors. Jetson Orin Nano developer kit scale is roughly 100 × 79 × 21mm with carrier/module/thermal solution, so it is not an internal Sesame-body replacement.

Fitment conclusion:

- Internal body target for first build: Freenove ESP32-S3-WROOM CAM N16R8 + hand-wired servo distribution + separate 5V servo and electronics branches + onboard 2S charging.
- External/backpack target: Jetson Orin Nano / Orin family as the AI commander.
- Do not compare bare boards only. Compare complete packages: controller, servo rail, buck converter, capacitor, camera, mic, speaker amp, wiring, connector clearance, thermal path, and battery.

- Servo power wiring and the 5A rail may matter more than the logic board footprint
- What the body was designed around: Lolin S2 Mini (~34 × 25mm) or ESP32 DevKitC + distro board (~55 × 28mm footprint on 5mm standoffs)

So the Radxa/Pi Zero-class board is ~10mm longer than anything the frame was drawn for. Width and height look plausible, length is the question. The Radxa does not make the total electronics package tiny by itself: the servo rail, 5A buck converter, capacitor, switch, and servo connectors are the bulky part that still has to fit. Once those parts are counted, Radxa + PCA9685 + servo rail may be physically closer to the Pi option than the bare board comparison suggests. The upside is that the same 65 × 30mm footprint buys much more RAM and capability.

Blender workflow plan: use Blender as the working 3D layout tool. Import the Sesame STL files or converted body/internal-frame geometry, set the scene units to millimeters, and build simple bounding-box mockups for the Freenove board, perfboard/servo rail, two buck converters, 1000µF capacitor, USB-C charger, 2S 18650 pack, microphone, amplifier, speaker, and camera. Keep XIAO/PCA9685 and Linux-board layouts as alternative studies rather than the current package. The practical task is to measure the real internal cavity and decide whether the frame must be stretched or rearranged. The charger and larger battery may be the deciding fit problem. Camera, microphone, speaker, programming-port access, and charge-port access all need deliberate shell locations.

Downstream note: the stock firmware and Sesame Studio are ESP32/Arduino, so swapping to a Linux SBC means rewriting the motion layer against the PCA9685 (python, well-trodden libraries exist). The kinematics/pose data from Sesame Studio can probably be ported. This is real work, write it into the plan. Radxa-specific risk: library/support friction may be higher than Raspberry Pi, so test GPIO/I2C, camera, mic, speaker, and auto-start services before committing to a body redesign.

## Generation 2 architecture — provisional development direction

Generation 1 is not finished. It remains the active prototype and should be completed far enough to validate the mechanical design, actual servo loads, split power system, camera and audio behavior, networking, command handling, and safety assumptions. The Generation 2 work does not invalidate the value of finishing Generation 1.

Ainekio is being developed through iterative refinement rather than by treating the first working quadruped as the final product. As the product develops, new requirements and design limits become visible. The possibility of drone, rover, and later quadruped bodies has made a more modular controller architecture appear more appropriate than asking one ESP32-S3 to handle media, networking, sensing, real-time motion, and safety simultaneously.

Generation 2 is in development and is not set in stone. The architecture, boards, sensors, actuators, power system, and software division may change after fitment work, bench tests, cost comparison, and Generation 1 measurements. Candidate parts are design-study items, not resolved decisions or an authoritative shopping list.

### Current candidate structure

- Remote AI machine: continues to own large models, persistent cognition, speech recognition and generation, planning, and other heavy workloads.
- Linux Zero-style body computer: candidate replacement for the ESP32-S3 in later bodies. Raspberry Pi Zero-class and Radxa Zero-class boards are under consideration. It would own WiFi, camera, microphone, speaker, OLED, application services, media handling, local perception, and communication with the remote brain.
- Dedicated H7-class motion controller: candidate real-time body controller connected to the Linux computer over UART or USB using MAVLink or another defined body-control interface. It would own the IMU, orientation estimation, servo or motor outputs, gait execution, stabilization, battery telemetry, logging, command-loss behavior, and physical failsafes.
- Actuator power system: remains separate from the computers. The servo or motor rail, regulator, distribution wiring, capacitor, and physical power cutoff remain required even when the controller architecture changes.

### Why this differs from Generation 1

Generation 1 assigns WiFi, camera, audio, OLED, eight servo PWM outputs, battery sensing, command handling, and local safety to the Freenove ESP32-S3. That is compact and appropriate for a first prototype, but it creates pin, concurrency, media-bandwidth, and software-complexity risks. The candidate Generation 2 split deliberately places non-real-time media and application work on Linux and real-time motion and reflex work on a dedicated controller.

The overlap between the Linux computer and motion controller is limited and intentional. The Linux side decides what action is requested and whether it is authorized. The motion controller decides whether and how that action can be executed safely by the current body.

### Potentially replaced or made redundant

- Freenove ESP32-S3-WROOM CAM: potentially replaced by the Linux body computer plus motion controller.
- Freenove OV2640 camera: potentially replaced by a Linux-compatible CSI or USB camera.
- Planned Pololu LSM6DSO breakout: potentially unnecessary because suitable H7 controllers include one or more onboard accelerometer/gyroscope IMUs.
- ESP32 battery-voltage divider and ADC input: potentially unnecessary if the selected motion controller provides compatible battery-voltage telemetry. Current sensing would still require a suitable external sensor if desired.
- Direct ESP32 MCPWM servo outputs and the provisional MAP_B pin assignment: replaced by motion-controller outputs.
- PCA9685: not currently part of Generation 1 and not expected to be required if the selected motion controller has enough actuator outputs.

### Parts likely to remain in some form

- Servo or motor power rail and distribution hardware
- Separate high-current actuator regulator
- Clean electronics power path, recalculated for the selected Linux board and peripherals
- Battery, charger, master switch, and bulk capacitor unless later power testing selects replacements
- Microphone, speaker amplifier, speaker, and OLED if Linux compatibility and fitment are satisfactory
- Existing servos for prototype testing, although later quadrupeds may move to smart actuators with position, current, temperature, and fault feedback

### ESP32-P4-WIFI6 media/network-board candidate
This board is now a serious Generation 2 media-controller candidate rather than the earlier abstract ESP32-P4-plus-ESP32-S3 concept. The Waveshare design combines an ESP32-P4, a separate onboard ESP32-C6 for Wi-Fi 6 and Bluetooth, 32MB PSRAM, 32MB NOR flash, MIPI-CSI camera input, MIPI-DSI display output, onboard microphone, audio codec/amplifier with an 8Ω 2W speaker connector, TF/microSD storage, USB 2.0 OTG, hardware H.264/JPEG encoding, and exposed GPIO/UART/I2C/I2S/SPI/CAN/MCPWM resources. An Amazon listing currently places the standard board near $18, but the exact seller, board revision, delivered accessories, and long-term availability must be verified.

The strongest proposed pairing is:
- ESP32-P4-WIFI6: camera, microphone, speaker audio, Wi-Fi, storage, video encoding, remote-brain connection, and the Ainekio portable command/protocol layer.
- Kakute H7 Mini or another compact motion controller: IMU, body orientation, motion logging, gait execution, servo signal timing, command-loss behavior, and physical failsafes.
- Existing powered 5V servo rail: high-current power distribution for the current MG90S servos.

This two-controller design does not require a third Pi, Radxa, or Linux board while the heavy AI remains remote. A Linux SBC would be added only for a later model that requires substantial onboard vision, Linux applications, or autonomous operation without the remote brain.

Potentially removed from the current parts package:
- Freenove ESP32-S3-WROOM CAM board
- OV2640 camera system
- INMP441 microphone module
- MAX98357A amplifier module
- Freenove-specific microSD implementation

Still required:
- Compatible MIPI-CSI camera module, provisionally OV5647-class
- Physical speaker
- Kakute or another motion controller
- Existing actuator power/distribution system
- Battery, charger, regulators, switch, fuse/protection, and wiring
- Small OLED only if retained; the P4 board's MIPI-DSI connector is intended for much larger displays, while a small face display can remain on I2C or SPI

The board can technically expose PWM/MCPWM outputs, but using the Kakute keeps camera, audio, Wi-Fi, and storage workload separate from hard real-time motion and safety. That separation is the main reason to use both boards.

Required evaluation:
- Confirm exact delivered dimensions, mass, connector clearance, antenna placement, and camera ribbon geometry.
- Verify compatible MIPI camera availability, image quality, latency, and lens placement.
- Test simultaneous H.264 camera streaming, microphone input, speaker playback, TF-card access, Wi-Fi traffic, and UART communication with the Kakute.
- Measure power consumption and temperature under simultaneous full workload.
- Confirm ESP-IDF support and driver maturity for the camera, audio path, ESP32-C6 networking, storage, and board revision.
- Compare the complete installed package against XIAO ESP32-S3 Sense plus amplifier, not only the bare board prices.

### Current leading study configuration

The present leading study is a Radxa Zero 3W or Raspberry Pi Zero-class Linux computer paired with a compact H7-class ArduPilot-compatible controller. A Matek H743-SLIM-class board is an example because it combines multiple IMUs, logging, serial buses, battery telemetry, and enough outputs for the current eight-servo body and a possible twelve-servo later quadruped. This example is not yet a selected purchase.

The same two-layer pattern could support different bodies: the Linux layer remains the media and application computer, while each body uses an appropriate real-time controller and configuration. A quadruped would use gait and body-leveling logic; a drone would use flight stabilization; a rover would use steering, wheel control, and navigation.

### Information still needed before a Generation 2 decision

- Complete Generation 1 enough to measure actual current draw, regulator temperature, communication latency, servo timing, camera and audio performance, and physical packaging.
- Compare complete installed packages rather than bare board dimensions: Linux board, motion controller, power regulation, camera, audio hardware, storage, connectors, cooling, servo distribution, and wiring.
- Verify Linux support for camera, microphone, speaker, OLED, GPIO or I2C, automatic startup, watchdog behavior, and clean shutdown.
- Determine whether the current two-joint, eight-servo gait should be supported directly or whether Generation 2 should move to three joints and twelve actuators.
- Decide which position references are required. An onboard IMU provides orientation and motion changes but not reliable long-term position or walking speed by itself; outdoor GNSS, indoor visual odometry or optical flow, joint feedback, and foot-contact sensing remain separate design questions.
- Define the boundary and protocol between the Linux body computer and the real-time controller before replacing the current ESP32-specific implementation.

This section is a design direction, not a resolved decision. Generation 1 remains the current implementation target until a later specification and Generation 2 parts list formally supersede it.

## Resolved decisions

- Ainekio is the product. Sesame Robot is a reference platform and a possible source of reusable behavior, controls, emulator concepts, and older code.
- The v1 body controller is the Freenove ESP32-S3-WROOM CAM N16R8 using direct MCPWM servo control, a hand-wired servo rail, and separate servo and electronics regulators.
- The current provisional MAP_B assigns servos to GPIO 1, 2, 14, 21, 33, 34, 45, and 46; battery ADC to GPIO 3; SD_MMC to reserved GPIO 38, 39, and 40; I2S to GPIO 41, 42, 19, and 20; and I2C to GPIO 47 and 48. GPIO 33 and 34 remain provisional until hardware gate H2.
- The board-mounted microSD slot remains in v1: GPIO 38, 39, and 40 are reserved for SD_MMC 1-bit mode.
- Microphone PCM is streamed to the offboard brain, with bounded local gate/VAD behavior; speech-to-text remains offboard.
- Phone-as-brain operation is outside the v1 scope.
- Sesame parity is a compatibility direction, not completed work: preserve compatible joint ordering; reuse semantic emote and motion concepts; port useful motion routines, facial states, idle behavior, and controls where appropriate; keep the runtime in Ainekio's C/ESP-IDF architecture; and keep AI output behind semantic commands and safety gates.

## Open hardware questions

- Can the selected ESP32-S3 build sustain camera, external I2S microphone, audio output, WiFi, eight MCPWM servo outputs, command handling, and local safety logic concurrently under the required soak tests?
- Do GPIO 33 and GPIO 34 appear unreserved on the delivered N16R8 board and remain stable during the H2 concurrent camera, PSRAM, SD, and PWM soak?
- Do the SD_MMC pull-ups, GPIO 3/45/46 strapping behavior, and full-duplex I2S path pass electrical and boot testing with the attached hardware?
- Does the split power system maintain safe voltage and current during measured servo loads without regulator overheating, brownouts, or unsafe battery behavior?
- Do the controller, battery, charger, regulators, capacitor, servo rail, microphone, amplifier, speaker, wiring, switches, and access ports fit the Ainekio chassis without an unplanned internal-frame redesign?

- What is the measured usable internal cavity after printed tolerances, servo movement, wire bend radius, connector access, and cooling clearance are included?
- Does the delivered 2S1P 18650 pack match its stated protection behavior and fit safely with the charger and panel-mount USB-C extension?
