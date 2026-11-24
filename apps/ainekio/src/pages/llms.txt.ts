import type { APIRoute } from 'astro'
import { getCollection } from 'astro:content'
import gallery from '../data/gallery.json'
import { generations, getReading, topics } from '../lib/reading'

export const GET: APIRoute = async ({ site }) => {
  const origin = (site ?? new URL('https://ainek.io')).href.replace(/\/$/, '')
  const posts = (await getCollection('posts', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.published.getTime() - a.data.published.getTime(),
  )

  const systemReferences = posts.filter(p => {
    const r = getReading(p)
    return r.kind === 'reference' && !p.data.archive
  })
  const journalEntries = posts.filter(p => {
    const r = getReading(p)
    return r.kind === 'journal'
  })
  const earlyPlanningDocs = posts.filter(p => p.data.archive === true || getReading(p).kind === 'original')
  const videos = gallery.filter(item => item.src)

  const lines: string[] = [
    '# Ainekio — 8-Servo V1, 12-Servo V2, Armored V3 & Ainekio OS',
    '',
    '> Ainekio pairs custom 3D-printed quadruped robots—the active 8-servo clock-spring V1 and 650 g 12-servo V2 (~$85 electronics/hardware BOM running a 107.8 KB int8 MicroDuck RL locomotion policy at 50 Hz inside the Waveshare ESP32-P4-WIFI6 128 KB L2 cache), plus armored DS3225 PRO V3 with 2-stage self-leveling ankles and a panoramic 2.8" Cyclops eye, and the live browser 3D simulator at https://simulator.ainek.io/ (V1, V2 & V3 in 500 Hz MuJoCo WASM + PeerJS multiplayer)—with Ainekio OS, a local-first cognitive runtime for persistent memory, room-audio voice conversation, generative Freestyle motion, and bounded physical autonomy.',
    '',
    '## Key Technical Facts',
    '',
    '- **Three Robot Generations (V1 · V2 · V3) & 3D Web Simulator**:',
    '  - **Ainekio V1 (Active 8-Servo Quadruped & Unified P4 Firmware)**: Active floor robot (`174.8 × 155.5 × 84.1 mm`, `174` active CAD meshes: squared `36.2 mm` vertical-knee `R2V10` arms, concentric 3-part under-arm 4-wire clock-springs, `Frame8` clock-spring bays, `21,216`-vert sculpted spiked lower legs, `683ZZ` hip counter-bearings) upgraded onto unified `ESP32-P4` firmware (`body_v1.c`, direct 8-ch ADC feedback, `0.96"` `SSD1306` OLED running all **59** procedural expressions), running trained `v1-microduck-p4` (`53.7 KB`) neural walking and `neural_pose_v1` emotes, and playable live in https://simulator.ainek.io/.',
    '  - **Ainekio V2 (Active 650 g Closed-Loop Floor Robot)**: 3-DOF-per-leg four-bar quadruped (`244.9 × 141.5 × 103.4 mm` neutral CAD; `35/20/28/38/55 mm` linkage; 34 `Red/` STLs) with 12× `MG90S` servos modified for 4th-wire potentiometer feedback (`CD74HC4067` `S0–S3 = GPIO27–30` → `GPIO49` `ADC2_CH0`, automated 4th-wire + IMU servo calibration, 7-layer phantom-jam elimination + `8–10 s` per-channel `I²t` winding thermal fuse), `PCA9685` 50 Hz PWM, `LSM6DS3` 6-axis IMU (`208 Hz`), `OV5647` CSI camera, `ES8311` + `NS4150B` audio (`microWakeWord` + WebRTC VAD), `1.9"` `ST7789` LCD (`320 × 170`, 59 procedural expressions), and Python `simulation.py` parity.',
    '  - **Ainekio V3 (Armored DS3225 PRO & Self-Leveling Ankles — Live in Simulator, Print Pending)**: Armored quadruped (`406.4 × 236.5 × 385.6 mm`) built with 12× `DS3225 PRO` HV coreless servos on `Option A-1` 4-bar legs with **2-stage double-parallelogram self-leveling pivoting crawler feet**, `3,860`-vert lap-jointed belly armor, `Clip 26` leaf-spring clamshell latches, panoramic `2.8"` `ILI9341` Cyclops eye (`face_cyclops.c`), `4× 21700` (`2S2P`) belly pack, onboard `Radxa Dragon Q6A` Linux SBC + unified `ESP32-P4` firmware (`body_v3.c`), and trained `v3-microduck-p4` (`66.9 KB`, `0.31 m/s` trot, `<= 0.27°` ankle level error) + `neural_pose_v3` playable live in https://simulator.ainek.io/#model=v3.',
    '  - **`simulator.ainek.io` 3D Web Robot Simulator (Live Browser App via `@ainekio/engine`)**: Zero-install browser simulator at https://simulator.ainek.io/ compiling `500 Hz` MuJoCo WASM (`mujoco_wasm.js`) and real unified `ESP32-P4` C firmware across all three robots (**V1, V2 & V3**) in 6 playable 3D worlds (19 m Robotics Lab, Yggdrasil, Observatory, Miranda Wreck, Solitude, Sci Fi Room) with **PeerJS multiplayer rooms**, Comms Feed, Quick Pair, live face displays (`ST7789` / `SSD1306` / panoramic `ILI9341` Cyclops), virtual chin-cam POV driving, wrench perturbations, `J0–J11` pin/jam tests, and optional WebSocket attachment to local Body Control / Ainekio OS.',
    '- **3-System Neural Motion & Cockpit HUD**: System 1 runs a 110,432-byte (`107.84 KiB`) `int8` MicroDuck walking policy (`v18` Sys-ID & `v19-snag-p4` + `1.8 s` `-0.45 m/s` reverse unsnag) natively at 50 Hz inside the ESP32-P4 128 KB L2 cache; System 2 runs 50 Hz `NeuralPose v8-calibrated` (`2.46M` GPU MuJoCo steps, Schmitt-trigger `6.5°→3.0°` single-leg carpet stepping, `-27.87°` calibrated carrier floor, `12/12` scenarios, `0` falls) over a clean `939`-row `Qwen3.5-0.8B` Freestyle choreography LoRA; System 3 runs `50 Hz` `NeuralPosePresence` (motor-silent during `vad_open`/wake-word, pure sagittal speech nods with `0.0°` shoulder scrub). Controlled via Ainekio Cockpit (`Tap to Talk` + translucent 7-graph Ainekio OS live stream) and Apache-2.0 `RT-DETRv2 + OWLv2` local vision.',
    '- **Ainekio OS (The Mind)**: Local-first TypeScript/LangGraph cognitive architecture (`47` cognitive graphs, `202` `defineNode(` definitions, `ExecutionStore` v2 synchronous `JsonPlus` SQLite durability) with zero-pinning auto-following, `AIKSPK01` room-chat echo, deduplicated `v26` Intent & Task Action Selector LoRAs (`661` source cases / `2,941` dev records on `Qwen3.5-0.8B`), 8-sector single-hop Embodied Curiosity, `llama.cpp`/Ollama/LAN/Big-Brother routing (`Codex`, `Claude Code`, warm `GeminiAcpServer`), offline-first Whisper STT, VRAM-aware Kokoro/Piper TTS, episodic/vector memory, and an 8-stage `02:00` Sleep/Dreaming consolidation cycle.',
    '- **Interactive 1:1 3D CAD Assets (glTF `.glb`)**:',
    `  - Ainekio V1: ${origin}/models/ainekio-v1.glb`,
    `  - Ainekio V2: ${origin}/models/ainekio-v2.glb`,
    `  - Ainekio V3: ${origin}/models/ainekio-v3.glb`,
    '- **Live Simulator & Source Repositories**:',
    '  - Live 3D Web Simulator (V1, V2 & V3 + PeerJS Multiplayer): https://simulator.ainek.io/',
    '  - Hardware CAD, unified ESP-IDF firmware, Python Body Control gateway, MuJoCo MJCF & RL: https://github.com/Greg-Aster/Ainekio-bot',
    '  - Ainekio OS cognitive runtime, memory, voice & Environment Bridge: https://github.com/Greg-Aster/ainekio-os',
    '  - Standalone `@ainekio/engine` 3D simulation & multiplayer runtime: https://github.com/Greg-Aster/ainekio-engine',
    `- **Complete Markdown Corpus**: ${origin}/llms-full.txt`,
    `- **RSS Feed**: ${origin}/rss.xml`,
    '',
    '## Primary Entry Points',
    '',
    `- [Project Overview & Architecture](${origin}/posts/project-overview/): End-to-end overview of V1, V2, and V3 hardware, the Body Control gateway, and Ainekio OS.`,
    `- [What Ainekio Can Do — Complete Capability & Spec Inventory](${origin}/posts/what-ainekio-can-do/): Verified hardware, firmware, protocol-v1, gateway, RL locomotion, Freestyle IK, and Ainekio OS capability tables.`,
    `- [Ainekio: An Autonomous Mind Disguised as a Desk Toy](${origin}/posts/ainekio-weapon-of-mass-destruction/): User-owned embodied AI architecture, V1/V2/V3 lineage, encrypted imprinting, Big Brother leverage, and the Lifeline Protocol.`,
    `- [How Does Ainekio Stack Up?](${origin}/posts/how-does-ainekio-stack-up/): Engineering & BOM comparison against consumer toys, Stanford Pupper V3, OpenDuck Microduck, industrial humanoids, and a 75-ton mech.`,
    `- [Three-System Neural Motion](${origin}/posts/three-system-neural-architecture/): System 1 (50 Hz MicroDuck v19), System 2 (50 Hz NeuralPose v8-calibrated + 939-row Freestyle), and System 3 (50 Hz NeuralPosePresence).`,
    `- [Ainekio V1 Systems Guide](${origin}/posts/ainekio-v1/) · [Ainekio V2 Hardware & Wiring](${origin}/posts/ainekio-v2/) · [Ainekio V3 Armored CAD](${origin}/posts/ainekio-v3-preview/): Dedicated hardware guides with interactive 1:1 Three.js 3D CAD viewers.`,
    `- [Ainekio OS Guide](${origin}/posts/ainekio-os/): Cognitive modes, durable node graphs, local memory, voice loop, and Environment Bridge.`,
    `- [Build Journal](${origin}/updates/): Chronological workbench milestones and floor-test notes.`,
    `- [Robot Media Gallery](${origin}/gallery/): ${gallery.length} workbench photos, physical floor capability videos, cross-body motion studies, MuJoCo/MJX RL rollouts, and wiring diagrams.`,
    '',
    '## System Reference Guides (V1, V2 & V3)',
    '',
    ...systemReferences.map(
      p =>
        `- [${p.data.title}](${origin}/posts/${p.slug}/) (${topics[getReading(p).topic].title} · ${generations[getReading(p).generation]}): ${p.data.description}`,
    ),
    '',
    '## Chronological Build Journal',
    '',
    ...journalEntries.map(
      p =>
        `- [${p.data.title}](${origin}/posts/${p.slug}/) (${p.data.published.toISOString().slice(0, 10)}): ${p.data.description}`,
    ),
    '',
    '## Robot Videos (MP4)',
    '',
    ...videos.map(
      v => `- [${v.title}](${origin}${v.src}) (${v.date}): ${v.caption}`,
    ),
    '',
    '## Optional: Early July 2026 Pre-Hardware Planning Notes',
    '',
    ...earlyPlanningDocs.map(
      p => `- [${p.data.title}](${origin}/posts/${p.slug}/): ${p.data.description}`,
    ),
    '',
  ]

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}
