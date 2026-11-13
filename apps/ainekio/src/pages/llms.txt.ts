import type { APIRoute } from 'astro'
import { getCollection } from 'astro:content'
import gallery from '../data/gallery.json'
import { getReading, topics } from '../lib/reading'

export const GET: APIRoute = async ({ site }) => {
  const origin = (site ?? new URL('https://ainek.io')).href.replace(/\/$/, '')
  const posts = (await getCollection('posts', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.published.getTime() - a.data.published.getTime(),
  )

  const v2Reference = posts.filter(p => {
    const r = getReading(p)
    return r.kind === 'reference' && r.generation !== 'v1'
  })
  const v2Journal = posts.filter(p => {
    const r = getReading(p)
    return r.kind === 'journal' && r.generation !== 'v1'
  })
  const v1Docs = posts.filter(p => getReading(p).generation === 'v1')
  const videos = gallery.filter(item => item.src)

  const lines: string[] = [
    '# Ainekio — 12-Servo ESP32-P4 Quadruped Companion & Ainekio OS',
    '',
    '> Ainekio is a custom 650 g 3D-printed 12-servo quadruped robot companion (~$85 electronics/hardware BOM) running a 107.8 KB int8 DAgger-distilled RL locomotion policy at 50 Hz inside the Waveshare ESP32-P4-WIFI6 128 KB L2 cache, paired with Ainekio OS—a local-first cognitive runtime for persistent memory, room-audio voice conversation, generative Freestyle inverse-kinematics motion, and bounded physical autonomy. Source code and assets are publicly available for personal, academic, and non-commercial use (PolyForm Noncommercial 1.0.0 for code; CC BY-NC-SA 4.0 for hardware CAD and trained weights).',
    '',
    '## Key Technical Facts',
    '',
    '- **Active Hardware (V2)**: 650 g PLA/PETG 3-DOF-per-leg closed-loop four-bar quadruped (`35/20/28/38/55 mm` linkage), 12 × MG90S servos modified with soldered 4th-wire potentiometer feedback (`CD74HC4067` → `GPIO49` `ADC2_CH0`, One-Euro velocity filter), `PCA9685` 50 Hz PWM, `LSM6DS3` 6-axis IMU (`208 Hz`), `OV5647` CSI camera, `ES8311` + `NS4150B` audio, and 1.9" `ST7789` LCD (`320 × 170`, 59 procedural expressions).',
    '- **Locomotion & Motion Stack**: Analytical 4-bar IK/FK (`Walk`, `Run`, `Crawl`, `Crab`, 23 finite gestures), 375-mesh closed-chain MuJoCo MJCF digital twin (`solver="cg"`, 500 Hz physics / 50 Hz control), 200M+ step JAX/MJX PPO teacher distilled via 2-round DAgger into a 110,432-byte (`107.8 KB`) `int8` student policy (`720 → 128 → 64 → 32 → 12`) executing natively on the ESP32-P4, plus **Freestyle** (`Qwen3.5-0.8B` LoRA + 349-motion SQLite library + 416 fault-recovery trajectories).',
    '- **Ainekio OS (The Mind)**: Local-first TypeScript/LangGraph cognitive architecture (`Dual Consciousness`, `Agent`, `Emulation`, `Environment` modes) with `llama.cpp`/Ollama/cloud routing, Whisper STT, Kokoro/Piper TTS, episodic/vector memory, nightly Sleep/Dreaming consolidation, and an authenticated WebSocket Environment Bridge.',
    '- **Source Repositories (Non-Commercial: PolyForm Noncommercial 1.0.0 / CC BY-NC-SA 4.0)**:',
    '  - Hardware CAD, ESP-IDF firmware, Python Body Control gateway, MuJoCo MJCF & RL: https://github.com/Greg-Aster/Ainekio-bot',
    '  - Ainekio OS cognitive runtime, memory, voice & Environment Bridge: https://github.com/Greg-Aster/ainekio-os',
    `- **Complete Markdown Corpus**: ${origin}/llms-full.txt`,
    `- **RSS Feed**: ${origin}/rss.xml`,
    '',
    '## Primary Entry Points',
    '',
    `- [What Ainekio Can Do — Complete Capability & Spec Inventory](${origin}/posts/what-ainekio-can-do/): Verified hardware, firmware, protocol-v1, gateway, RL locomotion, Freestyle IK, and Ainekio OS capability tables.`,
    `- [Project Overview & Architecture](${origin}/posts/project-overview/): End-to-end overview of the physical V2 robot, Body Control gateway, and Ainekio OS.`,
    `- [How Does Ainekio Stack Up?](${origin}/posts/how-does-ainekio-stack-up/): Engineering & BOM comparison against Stanford Pupper V3 and OpenDuck Microduck.`,
    `- [Ainekio OS Guide](${origin}/posts/ainekio-os/): Cognitive modes, durable node graphs, local memory, voice loop, and Environment Bridge.`,
    `- [Build Journal](${origin}/updates/): Chronological workbench milestones and floor-test notes.`,
    `- [Robot Media Gallery](${origin}/gallery/): ${gallery.length} workbench photos, physical walking videos, MuJoCo/MJX RL rollouts, and wiring diagrams.`,
    '',
    '## V2 System Reference Guides',
    '',
    ...v2Reference.map(
      p =>
        `- [${p.data.title}](${origin}/posts/${p.slug}/) (${topics[getReading(p).topic].title}): ${p.data.description}`,
    ),
    '',
    '## Chronological Build Journal (V2 Workbench Entries)',
    '',
    ...v2Journal.map(
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
    '## Optional: Retained V1 (8-Servo) Archive',
    '',
    ...v1Docs.map(
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
