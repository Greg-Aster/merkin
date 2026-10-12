---
title: "V1: Original Firmware Notes"
published: 2026-07-15
description: "The July ESP32-S3 firmware record: eight servo outputs, startup, safety, media, and build steps."
image: "/posts/ainekio/kaiju-ride-square.webp"
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
  next: software
  related: ["body-design-and-hardware", "controller-firmware"]
---

> **Original eight-servo era document.** Copied from the [original Google Doc](https://docs.google.com/document/d/1lc4L2lCaWBcMhWY4lfOYCHUTjKad6MjmrFsp2GbDA4Y/edit) on October 12, 2026. The text below retains its own historical status and later additions; “current” refers to the document’s observation period, not today. [All original posts](/posts/v1-original-posts/) · [Current project status](/posts/current-status/).

> **Later V1 correction:** the built robot used a 1000 mAh pack, not the proposed 2600 mAh pack. GPIO33–37 belong to octal PSRAM on the delivered N16R8; the provisional GPIO33/34 assignments below were superseded. Use the [V1 hardware guide](/posts/body-design-and-hardware/) and [maintained S3 pin map](https://github.com/Greg-Aster/Ainekio-bot/blob/main/Slave/firmware/esp32s3/components/ainekio_platform/include/ainekio/platform/pin_map.h) for the later build record.

---

# Ainekio Firmware

Ainekio's firmware is the software that runs inside the physical robot body. It receives intent-level commands from the remote MetaHuman OS brain, decides whether they are safe, turns accepted commands into hardware behavior, and reports the robot's state back to the brain.\
Current status — inspected 2026-07-15 against repository commit f010ff5 plus the current firmware working tree: the software implementation and ESP32-S3 cross-build are complete, including 16 MB flash, 8 MB octal PSRAM, and the pinned OV2640 camera service. The firmware has not yet been flashed and proven on the physical robot. The provisional pin map, electrical assumptions, camera identity and wiring, battery calibration, and every H1-H15 hardware gate still need real evidence.

## Hardware, language, and toolchain

* Language: C. The portable robot core is host-tested as C11; the physical platform layer uses ESP-IDF C APIs.
* Framework: ESP-IDF v5.5.4. FreeRTOS comes with ESP-IDF and owns tasks, queues, notifications, and synchronization.
* Target: Freenove ESP32-S3-WROOM CAM using an ESP32-S3-WROOM-1 N16R8 module target — 16 MB flash and 8 MB octal PSRAM at 80 MHz. The exact board/module marking and memory operation still must be confirmed during hardware gate H2.
* Build system: ESP-IDF's CMake component system, Kconfig, sdkconfig defaults, and a pinned dependency lock.
* This is not an Arduino sketch. Arduino is retained only as historical Sesame reference material and simulator behavior input.

## How the code is organized

The firmware is deliberately split so robot behavior and safety are not trapped inside one board-specific program.

* Slave/software/protocol/ owns protocol-v1 schemas, fixtures, and language-neutral wire rules shared by firmware, gateway, and emulator.
* Slave/software/core/ owns portable C command validation, state, lifecycle, calibration, assets, provisioning rules, servo mapping, battery decisions, and safety. It contains no ESP-IDF, FreeRTOS, socket, GPIO, or filesystem headers.
* Slave/firmware/esp32s3/components/ainekio\_platform/ owns the ESP32-S3-specific drivers and services: MCPWM, WiFi, WebSocket runtime, NVS, provisioning portal, LittleFS, I2S audio, OLED, ADC telemetry, SD\_MMC, sleep, and OTA behavior.
* Slave/firmware/esp32s3/main/app\_main.c is the physical robot entry point and composition root. It initializes the portable core, loads saved state, starts platform services, and connects them together.
* Slave/software/assets/ owns versioned motion, face, and audio assets. The firmware loads them from LittleFS while keeping only a small safe fallback set compiled into the application.

The result is one behavior model that can run in host tests, the body emulator, and the ESP32-S3 firmware. Platform code handles hardware; the portable core remains the authority for whether a command is valid and safe.

## What happens when the robot boots

1. During flashing or reset, and until firmware enables an output, the servo signal pins are expected to be high-impedance. The external 5 V servo rail is separate from the signal pins and can remain powered; firmware does not switch that rail.
2. Firmware expects 16 MB flash and 8 MB octal PSRAM at 80 MHz.
3. It opens NVS and loads stored servo calibration, named poses, profile preferences, and network configuration. On a fresh controller, each servo center defaults to 90 degrees, which produces a 1500 microsecond pulse.
4. The MCPWM channels are configured with outputs disabled, then all eight servos enable in this order: R1, R2, L1, L2, R4, R3, L3, L4. Each activation is separated by 20 ms.
5. Each servo is commanded directly to its calibrated center and remains attached, actively holding that position.
6. LittleFS, motion and runtime queues, OLED, camera, SD, audio, WiFi, provisioning, and gateway services then initialize. Display, camera, SD, or audio startup failure is logged and normally leaves servo operation running; foundational MCPWM or runtime failures remain boot errors.
7. With fresh or missing network configuration, firmware starts the WPA2 Ainekio-Setup network, generates a random 12-character Base32 secret, shows it on the OLED, and plays the setup-required audio cue. If the display is unavailable, the secret is printed to the serial console. The secret remains 12 characters rather than four because WPA2-PSK requires at least eight characters.
8. With valid stored settings, or after provisioning succeeds, firmware connects to WiFi and dials the configured MetaHuman gateway outward. After gateway authentication, normal stand, walk, emote, face, speech, and other bounded semantic commands can be accepted.

## Startup safety consequences

* The configured 25 percent range limit applies to subsequent semantic motions and calibration commands. It does not limit the initial movement from each servo's unknown physical position to calibrated center.
* The 20 ms stagger reduces simultaneous electrical activation, but it does not reduce servo torque. Incorrect horn alignment can still cause hard movement, binding, or a stall.
* A weak servo supply can cause a brownout and reset loop, repeatedly commanding center after every reboot. Battery monitoring is currently disabled, so firmware will not detect a low upstream battery.
* GPIO 33/34 and the combined PSRAM, camera, SD, audio, WiFi, and PWM configuration remain physically unverified.
* A normal idf.py flash preserves NVS. If valid WiFi and gateway settings already exist, the robot can reconnect and accept authenticated commands without entering setup mode. Erasing flash, clearing NVS, or changing the partition layout can remove those settings.
* Before the first gateway session, the servos remain centered and attached. An authenticated Stop command or a connection failsafe detaches the signal outputs. During an abnormal first boot, cutting power to the external servo rail is the immediate physical stop.

## Provisional MAP\_B pin map

MAP\_B is the reviewed software allocation currently compiled by Kconfig. It is still provisional. Servo signal pins are held high-impedance until the centered startup enable sequence, while the separate external 5 V servo rail can remain powered during reset or flashing. The map must be rejected or revised if H2 shows a schematic conflict, reserved pin, or unstable concurrent operation.

### Eight servo outputs

* Logical joint 0 — R1 — GPIO 1
* Logical joint 1 — R2 — GPIO 2
* Logical joint 2 — L1 — GPIO 14
* Logical joint 3 — L2 — GPIO 21
* Logical joint 4 — R4 — GPIO 33
* Logical joint 5 — R3 — GPIO 34
* Logical joint 6 — L3 — GPIO 45
* Logical joint 7 — L4 — GPIO 46

The eight outputs use MCPWM at 50 Hz. Logical angles are transformed through each joint's center, direction, inversion, minimum, and maximum calibration before becoming 500-2500 microsecond pulses. GPIO 33/34 and strapping-sensitive GPIO 45/46 are specific H2/H3 risks and are not treated as physically proven.

### Buses, controls, and reserved pins

* Battery voltage ADC — GPIO 3, ADC1 channel 2\. The planned 100 kOhm/47 kOhm divider factor of 3.12766 is staged, but the battery monitor is disabled until H9 verifies the installed circuit. Current physical motion is not battery-gated.
* I2S microphone data from the INMP441 — GPIO 19\.
* I2S amplifier data to the MAX98357A — GPIO 20\.
* Shared I2S bit clock — GPIO 41; word select — GPIO 42\.
* SSD1306 OLED I2C data — GPIO 47; clock — GPIO 48; default address 0x3C.
* Board microSD in 1-bit SD\_MMC mode — GPIO 38 CMD, GPIO 39 CLK, GPIO 40 DAT0. These pins are reserved exclusively for SD and checked against accessory assignments at compile time.
* UART programming and logs — GPIO 43 TX and GPIO 44 RX.
* BOOT button — GPIO 0\. Holding it for five seconds after normal boot can request provisioning; holding it through reset enters ROM download mode instead.
* Camera signals use the board's GPIO 4-13 and 15-18 range while octal PSRAM consumes GPIO 35-37. The pinned OV2640 camera driver and 8 MB octal PSRAM configuration are enabled and cross-built, but sensor identity, exact wiring, GPIO compatibility, and concurrent operation remain physical H2 gates.

GPIO 19/20 are assigned to I2S, so USB-JTAG is sacrificed and UART remains the debug path. The current allocation has no casual spare GPIO; additional peripherals should use the I2C bus or trigger a reviewed pin-map change.

## What the firmware does

### Command, lifecycle, and safety

* Accepts semantic actions such as stand, neutral, walk, emote, face, speech, camera settings, microphone settings, profile changes, sleep, calibration, and stop.
* Rejects malformed, stale, unsafe, out-of-limit, wrong-mode, unavailable, or over-profile requests before hardware execution.
* Keeps every command in a strict lifecycle: rejected, acknowledged, completed, or cancelled. Commands cannot leak across reconnect epochs.
* Treats stop as a direct high-priority path that bypasses the normal command queue, begins neutral motion within the 100 ms requirement, detaches outputs, cancels active motion/audio, and keeps servos detached until a new accepted movement intent.
* Uses fixed-size structures, bounded messages, bounded static queues, explicit timeouts, and disconnect-on-control-overflow behavior so congestion cannot become unbounded control latency.

### Motion and expression

* Runs MCPWM motion on a dedicated high-priority FreeRTOS task with 50 Hz interpolation and per-servo detach. Subsequent semantic motions and calibration commands are limited to 25 percent of their source range around logical center, 67.5-112.5 degrees, with a 100 ms minimum frame. This limit does not constrain the initial movement from an unknown physical position to calibrated center.
* Loads versioned LittleFS motion assets and validates joint-map version, frame count, durations, repetitions, logical IDs, finite values, and calibrated limits before execution.
* Includes all 19 required Sesame-derived seed motions plus normalized face assets, idle blinking, motion-to-face cues, and talk-face selection/restoration without importing the old Arduino architecture.
* Provides calibration-only joint movement, named poses, center/invert/min/max editing, all-neutral, detach, and atomic NVS persistence.

### Network, media, storage, and power

* Initiates the only production WebSocket, authenticates with the gateway, sends status/events, and uses independent RX/TX work so media cannot block control.
* Streams 16 kHz signed 16-bit mono microphone PCM and consumes ordered speaker PCM over full-duplex I2S. Bounded media queues count drops, underruns, orphan data, and overflow.
* Drives an SSD1306 OLED for faces and bounded setup/connection states. Display failure never blocks motion, audio, networking, or safety.
* Stores WiFi, gateway identity, token, calibration, poses, profile, and ADC settings in namespaced NVS; credentials never go to SD or logs.
* Uses dual 3 MB OTA slots with rollback enabled. A new image is accepted only after the robot authenticates with the gateway.
* Uses 9.875 MiB LittleFS for validated assets and the board microSD for bounded rolling logs/capture retention, torn-tail repair, and removable media that cannot block motion or network tasks.
* Battery telemetry and cutoff/recovery logic exist, but the current build disables the battery monitor. Firmware therefore will not detect a low upstream battery; a weak servo supply can brown out the controller and cause a reset loop that repeatedly commands startup center.
* Implements ACTIVE, IDLE, DOZING, DEEP-SLEEP, and FAILSAFE behavior with control-frame liveness, ping/pong, reconnect backoff, and local neutral/detach on control silence.

## What has been completed so far

* Protocol v1, portable C command/safety core, shared fixtures, host emulator, Master gateway/dashboard/environment adapter, and the ESP32-S3 platform port are present.
* NVS migration and A/B configuration, SoftAP provisioning, outbound WebSocket runtime, bounded queues, centered MCPWM startup, LittleFS assets, OLED, duplex I2S audio, camera, SD\_MMC, sleep, certificate-bundle WSS, OTA layout, and rollback validation are implemented. Battery telemetry and cutoff code are present but build-disabled pending H9.
* The explicit software acceptance runner records A1-A30 passing 30/30 across the emulator, gateway, protocol fixtures, portable C tests, and dashboard interaction.
* The ESP-IDF v5.5.4 cross-build passes with rollback, 8 MB octal PSRAM at 80 MHz, and the pinned OV2640 camera component enabled; H2 must still prove this configuration on the delivered board.
* Latest recorded firmware size: 1,152,787-byte application image in a 3 MiB OTA slot; the padded binary is 1,152,912 bytes, leaving about 63 percent of the slot free. Internal DIRAM uses 230,875 bytes with 110,885 bytes remaining and is the tighter growth budget.
* The current software stack can already be exercised through the body emulator and Sesame visual renderer, including authenticated semantic commands, execution acknowledgement, lifecycle completion, safety, media, display, and fault behavior.

## What is deliberately not complete

* No physical flashing, wiring verification, servo calibration, current measurement, charge test, or physical motion evidence has been recorded yet.
* MAP\_B is not frozen. GPIO 33/34 availability, GPIO 45/46 strapping behavior, SD pull-ups, PSRAM, camera, audio, WiFi, and PWM concurrency require hardware evidence.
* The planned 100 kOhm/47 kOhm battery-divider factor of 3.12766 is staged, but battery monitoring is disabled until H9 verifies the installed circuit. Physical motion is enabled and currently has no low-battery detection or cutoff protection.
* Camera capture and the pinned OV2640 driver are implemented and cross-built with PSRAM. Sensor identity, exact wiring, physical JPEG capture, and concurrent soak remain unverified; camera-on and snapshot commands reject explicitly when camera initialization is unavailable.
* The protocol defines look(yaw,pitch), but the frozen eight-joint body has no approved yaw/pitch mapping. Firmware and emulator reject it until a numbered specification erratum defines the behavior.
* Dashboard SD maintenance and provisioning/reset actions have internal service entry points but no approved protocol-v1 messages, so their controls remain disabled pending an erratum.

## Future work

1. Flash the target board, run the Freenove blink/WiFi/camera sanity checks, and capture the first structured firmware boot report (H1).
2. Prove or reject MAP\_B with board/module photos, schematic review, GPIO dumps, SD pull-ups, PSRAM, camera, SD, and PWM concurrency; then run strapping and full-system soak tests (H2-H4).
3. Complete the supervised first charge, multimeter-based ADC calibration, cutoff/recovery behavior, and NVS recovery evidence (H5, H9, H13).
4. Exercise OTA update, deliberate bad-image rollback, and final size headroom on the physical target (H6-H7).
5. Test absent, inserted, removed, corrupted, and stalled microSD behavior without delaying control or stop; verify retention and torn-tail repair (H8, H14).
6. Measure physical e-stop latency during maximum media load and confirm servo-rail current returns to near no-load after detach, including an induced stall (H10-H11).
7. Run the full provisioning matrix: missing/corrupt NVS, saved network present/absent, AP cycling, BOOT behavior, credential replacement, rollback, OLED/serial feedback, and rate limiting (H12).
8. Map every logical joint to the real body, establish positive directions and calibrated limits, then supervise rest, stand, walking, turning, wave, return poses, and controller-release stop behavior (H15).
9. Physically verify the enabled 8 MB octal PSRAM configuration and pinned OV2640 driver on the delivered board, then prove bounded JPEG capture, counters, drop behavior, GPIO compatibility, and concurrent camera/SD/audio/PWM operation.
10. Continue monitoring application image and internal RAM growth, reconcile the LittleFS image-tool naming erratum, and define any missing protocol messages before exposing new dashboard controls.

## Where to build and inspect it

Run the ESP-IDF build from Slave/firmware/esp32s3 after loading the pinned toolchain:

* source /home/greggles/esp/esp-idf-v5.5.4/export.sh
* idf.py set-target esp32s3
* idf.py build
* idf.py size
* idf.py size-components

The most useful source entry points are Slave/firmware/esp32s3/main/app\_main.c, Slave/firmware/esp32s3/components/ainekio\_platform/include/ainekio/platform/pin\_map.h, Slave/firmware/esp32s3/components/ainekio\_platform/src/runtime\_service.c, Slave/software/core/, and docs/SLAVE\_BRAIN\_PROGRESS.md.

## Current takeaway

Ainekio's firmware is architecturally complete enough to build and exercise through the software stack, but it is intentionally not being called hardware-complete. The next meaningful milestone is not more speculative firmware code: it is disciplined physical bring-up, proof of the pin and power assumptions, calibration, and recorded H1-H15 evidence.
