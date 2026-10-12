---
title: "V1: Original Parts Overview"
published: 2026-07-10
description: "The original eight-servo parts, power, wiring, fitment, and shopping-list document."
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
  next: discussion
  related: ["body-design-and-hardware", "controller-firmware"]
---

> **Original eight-servo era document.** Copied from the [original Google Doc](https://docs.google.com/document/d/1wz0kyqttPK3HHL0P0_9lLtRW_B87U5u4kEt-UhttHFA/edit) on October 12, 2026. The text below retains its own historical status and later additions; “current” refers to the document’s observation period, not today. [All original posts](/posts/v1-original-posts/) · [Current project status](/posts/current-status/).

> **Later V1 correction:** the built robot used a 1000 mAh pack, not the proposed 2600 mAh pack. GPIO33–37 belong to octal PSRAM on the delivered N16R8; the provisional GPIO33/34 assignments below were superseded. Use the [V1 hardware guide](/posts/body-design-and-hardware/) and [maintained S3 pin map](https://github.com/Greg-Aster/Ainekio-bot/blob/main/Slave/firmware/esp32s3/components/ainekio_platform/include/ainekio/platform/pin_map.h) for the later build record.

---

A remote "master brain" does the thinking over WiFi; an ESP32-S3 onboard the robot streams senses up and executes motion and speech commands down.

---

## **1\. Master Brain (remote, off-robot)**

Any machine on the local network capable of running or relaying the AI workload:

* Home PC or laptop
* Dedicated AI unit (e.g., NVIDIA Jetson board)
* Capable phone, or a machine relaying to a cloud AI service

**Role:** Receives the video and microphone streams from the robot, runs vision/language/decision models, sends back motion commands and speech audio.

**Connection to robot:** WiFi (local network). No physical connection.

---

## **2\. Body Controller (onboard brain)**

**Part:** Freenove ESP32-S3-WROOM CAM board — **N16R8 variant** (16MB flash / 8MB octal PSRAM; use the R8 PSRAM version for camera streaming).

**Included with board:** OV2640 camera on dedicated connector; microSD slot; 16MB flash. The slot is physically available, but whether microSD remains enabled depends on the final GPIO map.

**Role:** Streams camera video (MJPEG \~VGA) and mic audio to the master brain over WiFi; receives commands; generates 8 hardware servo PWM signals through the ESP32-S3 MCPWM peripheral; plays received speech through the amp; drives the OLED; monitors battery voltage.

**Power:** 5V into the board's 5V pin from Buck \#2. Onboard regulator produces 3.3V for the chip, camera, and small peripherals. The Freenove board's USB-UART USB-C port remains a separate firmware/programming connection. The charger board has its own charge-only USB-C port. Turn master power off before programming or charging; use OTA updates when practical.

---

## **3\. Sensing & Output Peripherals (wired to body controller)**

| Part | Interface | Power | Notes |
| ----- | ----- | ----- | ----- |
| INMP441 I2S microphone | I2S (shares clock lines with amp) | 3.3V from board pin | Keep wires short, away from servo power runs |
| MAX98357A I2S amplifier | I2S (shares clock lines with mic) | 5V from Buck \#2 rail | \~2W into 8Ω |
| Speaker, 28mm 8Ω 2W | Speaker terminals on amp | — | Mount against a cavity/enclosure if possible; keep physically away from mic |
| 0.96" OLED display | I2C (2 pins) | 3.3V from board pin | Face/status display |
| Battery voltage divider | 1 ADC pin | — | 100kΩ \+ 47kΩ from battery+ (after switch); 0.1µF ceramic cap from ADC pin to GND. For low-battery voice warning and deep-sleep protection. Calibration needed. |

Current GPIO budget: 8 MCPWM servo outputs \+ 4 I2S \+ 2 I2C \+ 1 ADC \= 15 pins. MCPWM resolves the camera/LEDC channel conflict, but physical pin availability remains tight. The first map will be bench-tested; preserving microSD and native USB at the same time may require pin sharing or a later hardware revision.

---

## **4\. Motion System**

**Servos:** 8× MG90S metal-gear micro servos (per original Sesame BOM)

**Servo rail:** Hand-soldered power distribution rail carried over from the original Sesame design. The 8 servo signal lines use MCPWM, which is separate from the LEDC channel used for camera XCLK.

* Rail power bus: 5V from Buck \#1
* Rail ground bus: common ground
* Signal wires: individually from Freenove GPIO pins to each servo
---

## **5\. Power System**

### **Power flow (the spine of the robot)**

```text
USB-C power source (charge port only)
        │
Panel-mount USB-C port (mounted in shell)
        │
HiLetgo 2S/3S/4S USB-C boost charger board ── configured for 2S (8.4V), ASIN B0CHS2DXKZ
        │ BAT +/− (NTC/TEMP compatibility is not yet confirmed; insulate any unused lead)
        │
2S1P 18650 battery pack, 7.4V 2600mAh, seller-listed protected, ASIN B0DR33HLQ5
Keyed battery connector
        │
Inline fuse (rating selected after peak-current testing)
        │
KCD1 mini rocker switch  ←— MASTER POWER SWITCH
        │
   ┌────┴─────────────────┐
Buck #1: MINI560 PRO 5A    Buck #2: MINI560 PRO 5A
(5V, servo rail)           (5V, electronics)
   │                          ├── Freenove 5V pin ── onboard 3.3V reg ── mic, OLED
Servo rail + 1000µF bulk     └── MAX98357A amp
capacitor ── 8× MG90S
```

All grounds are electrically common, but the servo return and electronics return must remain on separate physical paths until the central battery/power-split point. Connect the pack through a keyed removable connector and inline fuse before the master switch; do not route combined servo current through perfboard or controller wiring.

### **Parts list, power section**

| Part | Qty | Role |
| ----- | ----- | ----- |
| MusRock MINI560 PRO 5A buck converter | 2 | Separate regulated 5V branches: one for servos, one for electronics. They share ground; separate regulators reduce servo noise reaching the camera/mic rail. |
| HiLetgo 2S/3S/4S USB-C boost charger, ASIN B0CHS2DXKZ | 1 | Charge-only USB-C input; configured for 2S. 1A charge rate to play it safe. |
| 18650 2S1P 7.4V 2600mAh protected pack \+ NTC, ASIN B0DR33HLQ5 | 1 | \~19Wh nominal; seller-listed onboard protection. Runtime and NTC behavior to be measured. |
| Panel-mount USB-C extension cable | 1 | Puts the charge port on the shell; robot charges like a phone |
| KCD1 mini rocker switch | 1 | Master power, load side only |
| 100kΩ \+ 47kΩ resistors | 2 | Battery voltage divider to ADC |
| 0.1µF ceramic \+ 1000µF electrolytic capacitor | 1 each | 0.1µF on ADC input; 1000µF (10V minimum) near servo rail for bulk buffering |

---

## **6\. Protection & Longevity (built into the design)**

* **Pack protection PCB (seller-listed, internal):** overcharge, over-discharge, and short-circuit protection. Verify the delivered pack before relying on it; this does not by itself confirm cell balancing.
* **Charger CC/CV termination:** configured for a 2S 8.4V charge. The charger and pack protection are separate layers; exact behavior will be checked during first-charge testing.
* **NTC thermistor:** the pack includes an NTC lead, but charger TEMP compatibility and wiring are still unresolved. Insulate the lead until verified.
* **Buck dropout behavior:** the MINI560s are expected to lose regulation as pack voltage falls. This system behavior works as a planned safe fail point in the system.
* **Firmware guardian (voltage divider):** at \~7.0V the robot announces "battery low" through its speaker; at \~6.8V it parks servos and deep-sleeps
* **Failure point note:** Proper operation is to flip the KCD1 off when the robot runs down. If the robot sits with the switch on for months on low/no charge, the battery could fully drain and not take a charge later.
* **First-charge validation:** supervise the first full charge — confirm the charger is set to 2S, voltage never exceeds 8.4V, nothing more than warm. Explosion hazard otherwise — Suicide bomber robot bad.
---

## **7\. Signal & Data Map (who talks to whom)**

| Link | Medium | Direction |
| ----- | ----- | ----- |
| Master brain ↔ body controller | WiFi | Video/audio up; commands/speech down |
| Body controller → servos | 8× PWM signal wires | Out |
| Body controller ↔ mic/amp | I2S (shared clocks) | Mic in, speech out |
| Body controller → OLED | I2C | Out |
| Battery → body controller | Voltage divider → ADC | Telemetry in (reported to master brain) |

---

## **Complete Shopping List**

* Perfboard/protoboard, approximately 5×7cm
* Freenove ESP32-S3-WROOM CAM board, N16R8 (with OV2640 camera)
* 8× MG90S servos
* 2.54mm male breakaway headers for 8× 3-pin servo connections
* INMP441 I2S microphone module
* MAX98357A I2S amplifier module
* 28mm 8Ω 2W speaker
* OLED display (I2C)
* 2× MusRock MINI560 PRO 5A buck converters
* HiLetgo 2S/3S/4S USB-C boost charger board (ASIN B0CHS2DXKZ; configured for 2S)
* 18650 2S1P 7.4V 2600mAh protected pack with NTC (ASIN B0DR33HLQ5)
* Keyed battery connector pair rated for the measured peak current (XT30-class or equivalent)
* Inline fuse holder and fuse; choose the fuse rating only after measuring startup and stall current
* Thin closed-cell foam or rubber microphone gasket; optional acoustically transparent dust mesh
* Nylon standoffs or printed spacers plus cable ties/lacing and strain-relief hardware for a removable electronics tray
* KCD1 mini rocker switch
* 100kΩ \+ 47kΩ resistors and 0.1µF ceramic capacitor for battery-voltage sensing
* 1000µF electrolytic capacitor, 10V minimum, mounted near the servo rail
* M2 × 5mm self-threading screws (\~40)
* M2.5 × 5mm machine screws (\~10, servo horns)
* 11-part printed Sesame body/frame set; internal frame may require modification for the 18650 pack and added electronics
* (maybe?) Panel-mount USB-C extension cable
* Silicone hookup wire: 20AWG for battery → connector → fuse → switch → power split → buck inputs and for the Buck \#1 → servo-rail main trunk (\~1m); 22AWG for short servo-power branches; 30AWG for PWM, I2S, I2C, and ADC signals; plus heat-shrink assortment

## **8\. Chassis Layout and Wiring (Generation 1\)**

  Treat the chassis as two electrical zones, preferably on two removable decks: a lower dirty-power/motion zone and an upper quiet radio/audio/sensing zone. Keep the battery centered and low.

### **Recommended physical arrangement**

* Front center: camera, using the original ribbon without an extension or sharp creases.
* Front corner: microphone aligned with a real shell opening; isolate it with a thin foam or rubber gasket.
* Front face: OLED where it remains visible without blocking the camera or antenna.
* Upper outside edge: ESP32 board with the antenna end facing outward or upward into an empty plastic pocket.
* Center-lower: battery, Buck \#1, servo distribution rail, and 1000µF capacitor; keep the battery out from under the antenna end.
* Lower side near the ESP32 connector end: Buck \#2, but not beneath the antenna.
* Rear: speaker in a small cavity, with the MAX98357A immediately beside it and as far from the microphone as practical.
* Rear/lower near the shell charge port: charger board. Put the master switch where it can be reached immediately.

### **Power, grounding, and noise control**

* Split battery power near the master switch. Run a separate paired positive/negative feed to each buck converter.
* Buck \#1 must feed the heavy servo rail directly. Buck \#2 must feed the ESP32, microphone, OLED, and amplifier electronics rail.
* All grounds remain electrically common, but servo return current and electronics return current should meet only at the central battery/power-split point.
* Do not carry servo current through perfboard traces, ESP32 ground pins, or thin daisy-chained wiring.
* Keep servo-power wiring in a separate chassis channel from camera, I2S, I2C, ADC, and PWM wiring. If they must cross, cross at approximately 90 degrees.
* Leave approximately 15mm of empty space around the ESP32 antenna: no battery, converter, servo bundle, speaker, OLED board, perfboard copper, metal bracket, or large screw.
* Keep the two buck converters approximately 20–30mm apart when space permits, components exposed to air, and both away from the antenna and microphone.
* Twist the amplifier OUT+ and OUT− speaker conductors together. Neither MAX98357A speaker output connects to ground.

### **Wire-length and gauge targets**

* Battery → connector → fuse → switch → power split: under 15cm, 20AWG paired wiring.
* Power split → each buck: under 10–15cm, 20AWG paired wiring.
* Buck \#1 → servo rail main trunk: ideally under 10cm, 20AWG.
* Servo rail → individual servo headers: short 22AWG branches; do not daisy-chain servo power from servo to servo.
* ESP32 → microphone: preferably under 8–10cm; keep the I2S group together with a nearby ground.
* ESP32 → amplifier: preferably under 10–15cm and away from servo bundles.
* Amplifier → speaker: under 5–10cm, with the differential pair twisted.
* ESP32 → OLED: approximately 15–20cm maximum. Existing servo PWM lead lengths are acceptable if routed away from the antenna and high-current bundles.

### **Mechanical, acoustic, and service details**

* Use separate printed wire channels for servo power and low-current signals, with strain relief where every leg harness exits the body.
* Leave service loops only where joints move; keep all loose wire clear of servo horns and linkages.
* Mount the electronics on a removable tray with connectors accessible from one side. Label every servo header by position and joint.
* Do not mount the microphone on the same rigid bracket as the speaker. Place the microphone and speaker at opposite ends of the body.
* Use a sealed or semi-sealed printed speaker cavity. Software should mute or reduce microphone capture while the robot speaks until echo cancellation is added.

### **Validation before committing the final printed chassis**

* Move all eight servos simultaneously while camera streaming, microphone recording, and speaker playback are active.
* Monitor both 5V rails for voltage dips and check buck, battery, switch, connector, fuse holder, and wiring temperatures during sustained walking.
* Test WiFi with the final shell installed. Reposition the ESP32 or clear the antenna pocket if signal quality falls materially.
* Measure actual startup and stall transients before choosing the fuse rating, and bench-validate that Buck \#1 survives the combined servo load.

## **9\. Generation 2 architecture — provisional development direction**

### ESP32-P4-WIFI6 media/network-board candidate

  This is a Generation 2 evaluation candidate, not a committed replacement for the unfinished Generation 1 build. An Amazon listing currently places the Waveshare ESP32-P4-WIFI6 standard board near \$18, but seller identity, board revision, availability, and the final delivered configuration must be verified before frame design or bulk purchase.\
  Integrated functions: ESP32-P4 with 32MB PSRAM, 32MB NOR flash, ESP32-C6 Wi-Fi 6/Bluetooth, MIPI-CSI camera input, MIPI-DSI display output, onboard microphone, audio codec/amplifier with an 8Ω 2W speaker connector, TF/microSD slot, USB 2.0 OTG, hardware H.264/JPEG encoding, and 27 exposed programmable GPIOs.\
  Provisional package: ESP32-P4-WIFI6 for camera, microphone, speaker audio, Wi-Fi, storage, video encoding, and the Ainekio network protocol; Kakute H7 Mini for IMU sensing, body orientation, motion control, failsafes, and the current eight servo signal outputs; existing high-current 5V servo power/distribution rail for the MG90S servos.\
  Parts potentially replaced: Freenove ESP32-S3-WROOM CAM board, OV2640 camera system, INMP441 microphone, MAX98357A amplifier, and the Freenove microSD implementation. The existing speaker may connect directly to the P4 board. The OLED may remain on exposed I2C/SPI GPIO because the board's DSI interface targets substantially larger displays.\
  Parts still required: a compatible MIPI-CSI camera module such as an OV5647-class board, Kakute or another motion controller, powered servo rail, battery, charger, regulators, switch, protection components, wiring, and the physical speaker.\
  No third Pi, Radxa, or other Linux board is required while the heavy AI remains on the remote machine. A Linux board becomes relevant only if a later model needs substantial onboard vision, applications, or autonomous operation.

### Selection gates:

* Confirm the exact board dimensions, mass, connector clearance, camera-board footprint, and antenna placement from the delivered hardware.
* Measure idle and full-load power, regulator temperature, boot time, and Wi-Fi performance inside the final shell.
* Verify simultaneous camera capture/H.264 streaming, microphone input, speaker playback, TF-card access, and UART communication with the Kakute.
* Confirm that the required ESP-IDF camera, audio, ESP32-C6 networking, and storage drivers are stable enough for the project.
* Bench-test a compatible MIPI camera and verify image quality, latency, ribbon routing, lens placement, and availability.
* Keep servo timing and body safety on the Kakute when the two-board architecture is used, even though the P4 exposes MCPWM-capable GPIO.\
  Status\
  This section records an architecture under investigation. Generation 1 is not finished, and the existing shopping list remains the active prototype build. No Generation 2 component named below is a committed purchase or final design. As Generation 1 develops, testing and new use cases reveal limitations and make different
