# Ainekio Robot Builder Utility Plan

Status: planning
Target future post: `apps/ainekio/src/content/posts/Robot-Builder-Utility.mdx`

## Purpose

Create an MDX post that contains an interactive robot builder utility. The utility should help readers understand the tradeoffs between cheap remote-brain builds, hybrid local-service builds, and fully autonomous edge-AI builds.

The post should make one idea clear: the hardware choice is really a choice about where intelligence lives.

## Existing Ainekio Context

Current Ainekio posts already establish these constraints:

- MetaHuman OS is the heavy intelligence layer for personality, memory, agents, reasoning, model routing, tools, and node workflows.
- The robot body should receive semantic commands such as `walk`, `stop`, `look around`, or `speak`, not raw servo angles from an AI model.
- Safety must live on the robot body: stop on disconnect, stop on low battery, stale movement commands are dropped, and unknown commands are rejected.
- Virtual testing should happen before physical movement.
- The Sesame-style robot body is small, so board size, wiring, battery, heat, and servo power all matter.
- The current hardware question is not just "which board?" It is "how much local autonomy is worth the extra cost, size, power, and complexity?"

## Utility Requirements

The MDX post should include all utility code inline for maintainability:

- Inline scoped `<style>{`...`}</style>`.
- Inline `<script>{`...`}</script>`.
- One data object inside the script for questions, answers, scoring, and output specs.
- No separate component file unless the utility becomes reusable later.
- No dependency on shared quiz/poll code for the first version, because this is a weighted configurator with output specs rather than a normal poll.

Visible UI:

- A question flow with a small set of option buttons.
- A progress bar for **cost burden**.
- A progress bar for **intelligence / autonomy**.
- An output panel showing the recommended robot architecture and specs.

Optional hidden/internal scoring:

- Complexity
- Fit risk
- Power risk
- Network dependence

These can influence output copy without becoming additional bars.

## Hardware Tiers

### Tier 1: Microcontroller Body

Boards:

- ESP32-S3
- Seeed XIAO ESP32S3 Sense

Role:

- Tiny robot body controller.
- Motion/reflex controller.
- Camera/microphone capture and forwarding if using XIAO ESP32S3 Sense.
- Remote MetaHuman OS does the heavy cognition.

Strengths:

- Lowest cost.
- Smallest board footprint.
- Low power.
- Good for Sesame-scale fit.
- Good for v1 experiments where intelligence lives off-board.

Tradeoffs:

- Not a local AI brain.
- Weak offline behavior unless carefully programmed.
- Audio/video capture can exist, but serious STT, TTS, image understanding, and LLM reasoning need a larger system.

Suggested output label:

- **Remote-brain familiar**

Cost bar:

- Low

Intelligence bar:

- Low if standalone.
- Medium if connected to MetaHuman OS.

Notes:

- ESP32-S3 has dual-core LX7 up to 240 MHz, Wi-Fi, BLE, camera and I2S-style peripheral support, and low-power modes.
- Seeed XIAO ESP32S3 Sense adds a compact camera/microphone board shape that is useful for robot sensing, but it still belongs in the capture/reflex category rather than the full-brain category.

Sources:

- Espressif ESP32-S3 datasheet: https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_en.pdf
- Seeed XIAO ESP32S3 Sense wiki: https://wiki.seeedstudio.com/xiao_esp32s3_getting_started/

### Tier 2: Local Services / Light Cognition

Board:

- Radxa Zero 3W

Role:

- Linux robot body computer.
- Audio I/O and processing.
- Wake word or voice activity detection.
- Buffering, routing, and network bridge.
- Simple command classification.
- Local tools and light fallback behaviors.
- Possible light quantized LLM experimentation, depending on model size and performance expectations.

Strengths:

- Much more capable than a microcontroller.
- Can own local audio handling and robot services.
- Better fit for a "semi-autonomous hybrid" robot.
- Can remain useful even when MetaHuman OS is unavailable.
- Still small enough to consider for a compact robot body, with fitment verification.

Tradeoffs:

- More power, boot time, filesystem, and OS maintenance than ESP32.
- Not equivalent to a Jetson-class AI computer.
- Local LLM should be framed as light fallback or experimentation, not full MetaHuman OS replacement.

Suggested output label:

- **Semi-autonomous hybrid**

Cost bar:

- Medium

Intelligence bar:

- Medium

Notes:

- Radxa Zero 3W uses Rockchip RK3566 with quad-core Cortex-A55 up to 1.6 GHz, LPDDR4, onboard eMMC options, Wi-Fi 6 / BT 5.4, USB-C, MIPI CSI, and GPIO expansion.
- This tier should be described as "local services and light cognition," not merely a dumb bridge.

Sources:

- Radxa Zero 3W product page: https://radxa.com/products/zeros/zero3w/
- Radxa Zero 3 hardware interface docs: https://docs.radxa.com/en/zero/zero3/hardware-design/hardware-interface

### Tier 3: Fully Autonomous Edge AI

Boards:

- Jetson Orin Nano
- Jetson Orin NX

Role:

- Onboard AI computer.
- Local vision.
- Local audio processing.
- Local STT/TTS experiments.
- Local LLM or multimodal model work.
- Robot decision loop can continue without MetaHuman OS, depending on software implementation.

Strengths:

- Plausible fully autonomous robot brain.
- Best option for serious local perception and edge AI.
- Can reduce dependence on network and external servers.

Tradeoffs:

- Highest cost.
- Highest power draw.
- Cooling and battery become central design problems.
- Physical fit in a Sesame-scale body is questionable; may require a larger body, backpack, or base station.
- More software stack complexity.

Suggested output label:

- **Fully autonomous edge AI build**

Cost bar:

- High

Intelligence bar:

- High

Notes:

- Jetson Orin Nano is the more approachable local-AI tier.
- Jetson Orin NX is the stronger autonomous tier.
- This should be presented as the local autonomy path, not necessarily the first physical Sesame build.

Sources:

- NVIDIA Jetson Orin page: https://www.nvidia.com/en-us/autonomous-machines/embedded-systems/jetson-orin/

## Recommended Question Flow

### Question 1: Where should the main brain live?

Options:

- Offsite MetaHuman OS on a workstation or server.
- Phone or tablet acting as the nearby brain.
- Onboard Linux computer.
- Onboard Jetson-class AI computer.

Scoring:

- Offsite brain: low cost, medium/high intelligence through remote compute, high network dependence.
- Phone brain: medium cost, medium intelligence, medium network dependence.
- Onboard Linux: medium cost, medium intelligence, lower network dependence.
- Onboard Jetson: high cost, high intelligence, lowest network dependence.

### Question 2: What should happen if Wi-Fi or MetaHuman OS is unavailable?

Options:

- Stop safely only.
- Idle, blink, react, and avoid obvious danger.
- Use local audio/light LLM fallback.
- Continue full perception and reasoning onboard.

Scoring:

- This is the key question that separates ESP32, Radxa Zero 3W, and Jetson Orin.

### Question 3: What senses matter first?

Options:

- Ultrasonic/body reflexes.
- Camera frames on demand.
- Camera plus microphone capture/streaming.
- Local perception.

Scoring:

- Ultrasonic/reflex: favors ESP32.
- Camera/mic capture: favors XIAO ESP32S3 Sense or Radxa.
- Local perception: favors Jetson.

### Question 4: How should speech work?

Options:

- No voice yet.
- MetaHuman OS handles STT/TTS.
- Local wake word or voice activity detection, remote STT/TTS.
- Local STT/TTS.

Scoring:

- Remote STT/TTS: favors ESP32/XIAO/Radxa hybrid.
- Local wake/VAD: favors Radxa.
- Local STT/TTS: favors Jetson, with Radxa treated as limited/lightweight.

### Question 5: How much body complexity is acceptable?

Options:

- One tiny board.
- One Linux board.
- Microcontroller plus Linux companion.
- Larger chassis, backpack, or base.

Scoring:

- One tiny board: favors ESP32/XIAO.
- One Linux board: favors Radxa.
- Two boards: favors ESP32 + Radxa split.
- Larger body/backpack/base: permits Jetson.

### Question 6: What matters most?

Options:

- Cheapest build.
- Smallest Sesame fit.
- Most upgradeable.
- Most locally intelligent.

Scoring:

- Cheapest: ESP32-S3.
- Smallest Sesame fit: XIAO ESP32S3 Sense.
- Upgradeable: Radxa or ESP32 + Radxa split.
- Locally intelligent: Jetson Orin Nano/NX.

## Output Profiles

### Profile A: Remote-Brain Familiar

Likely hardware:

- ESP32-S3 or Seeed XIAO ESP32S3 Sense.

Architecture:

- Robot dials out to MetaHuman OS.
- MetaHuman OS owns reasoning, speech understanding, speech generation, memory, and personality.
- Robot body owns safety and simple reflexes.

Specs:

- Motion/reflex controller: ESP32-S3 class.
- Senses: ultrasonic and/or XIAO camera/microphone capture.
- Voice: remote STT/TTS.
- Offline mode: safe stop plus small idle/reaction set.
- Fit risk: low.
- Power risk: low.

### Profile B: Semi-Autonomous Hybrid

Likely hardware:

- Radxa Zero 3W.
- Optional ESP32-S3/XIAO as a realtime motion/reflex coprocessor.

Architecture:

- Radxa runs local robot services.
- MetaHuman OS remains the heavy brain.
- Local fallback can handle audio routing, wake/VAD, canned behaviors, simple tools, and possibly a light LLM.

Specs:

- Motion controller: Radxa with PCA9685 or ESP32 passthrough.
- Senses: camera/microphone on local Linux services.
- Voice: local wake/VAD, remote STT/TTS by default.
- Offline mode: idle, react, safety, and light fallback behavior.
- Fit risk: medium.
- Power risk: medium.

### Profile C: Two-Board Practical Robot

Likely hardware:

- ESP32-S3/XIAO for motion/reflexes.
- Radxa Zero 3W for Linux services, bridge, audio, camera, and fallback cognition.

Architecture:

- Microcontroller owns tight body behavior.
- Linux board owns perception/network/audio.
- MetaHuman OS owns heavy cognition when available.

Specs:

- Motion controller: ESP32 passthrough or firmware.
- Service computer: Radxa Zero 3W.
- Senses: camera/mic plus local reflex sensors.
- Voice: local wake/VAD, remote heavy STT/TTS.
- Offline mode: meaningful local reactions and safety.
- Fit risk: medium/high.
- Power risk: medium/high.

### Profile D: Fully Autonomous Edge AI

Likely hardware:

- Jetson Orin Nano or Jetson Orin NX.

Architecture:

- Robot can run local perception, local model loops, and local speech/vision experiments.
- MetaHuman OS can become optional, remote-augmentation, sync, or training infrastructure instead of the live brain.

Specs:

- Motion controller: Jetson directly with servo controller, or Jetson plus microcontroller.
- Senses: camera, microphone, speaker, local vision pipeline.
- Voice: local or hybrid STT/TTS.
- Offline mode: full local decision loop, if software is built for it.
- Fit risk: high.
- Power risk: high.

## Scoring Guidance

Use 0-100 bars, but keep the numbers qualitative.

Cost burden should include:

- Board cost.
- Extra support hardware.
- Battery/power complexity.
- Cooling.
- Fit modifications.
- Number of code paths.

Intelligence / autonomy should include:

- Local compute.
- Local sensor processing.
- Offline behavior.
- Local speech capability.
- Local vision capability.
- Dependency on MetaHuman OS or network.

Suggested starting scores:

| Profile | Cost burden | Intelligence / autonomy |
| --- | ---: | ---: |
| ESP32-S3 remote body | 20 | 30 |
| XIAO ESP32S3 Sense remote senses | 28 | 40 |
| Radxa Zero 3W hybrid | 52 | 62 |
| ESP32 + Radxa split | 65 | 70 |
| Jetson Orin Nano autonomous | 82 | 88 |
| Jetson Orin NX autonomous | 95 | 96 |

These should be treated as utility weights, not market prices.

## MDX Implementation Notes

The post should use a static container and generate the question UI from a data object:

```mdx
<section class="ainekio-builder" data-ainekio-builder>
  <div data-builder-questions></div>
  <div class="builder-bars">
    <div data-cost-bar></div>
    <div data-intelligence-bar></div>
  </div>
  <div data-builder-output></div>
</section>

<script>{`
  const questions = [...]
  const profiles = [...]
  // render buttons
  // score selected answers
  // update bars
  // select closest output profile
`}</script>
```

Keep all selectors scoped to `[data-ainekio-builder]` so the script does not affect other posts.

## Recommended Editorial Angle

Suggested opening:

> Ainekio does not have one correct brain. It has a set of tradeoffs. A tiny robot can borrow a large mind over the network, a Linux board can give it local services and fallback behavior, and a Jetson-class board can push it toward full autonomy. This builder makes those tradeoffs visible.

Suggested conclusion:

> The most practical first build is probably not the most powerful build. For a Sesame-scale body, the clean path is remote MetaHuman OS plus a small body controller, or a Radxa-class hybrid if local audio and fallback behavior matter. Jetson becomes attractive when the project goal shifts from "small familiar" to "fully autonomous edge-AI robot."

## Open Decisions Before Writing The Post

- Whether to recommend XIAO ESP32S3 Sense as the default smallest v1 board.
- Whether Radxa Zero 3W replaces the earlier Pi Zero 2 W direction in the public post, or is presented as a newer option.
- Whether Jetson should be shown as "inside the robot" or "larger body/backpack/base station."
- Whether the utility should show exact board names immediately or reveal them only after the questions.
- Whether cost should be labeled as "cost" or "cost / complexity" to avoid implying exact dollars.
