# Ainekio Image Sources

Updated: 2026-08-27

## Construction reference

The source of truth for the robot's current appearance is the owner photo set in
`public/photos/`. The generated art must preserve these visible features:

- low, open black rectangular printed chassis;
- exactly four legs with black upper frames and red curved, ridged feet;
- visible servos;
- red rectangular face module with a cyan OLED;
- small round camera centered below the OLED;
- exposed controller boards and an unruly multicolored wire bundle on top.

The art must not install the separate `Frame8` enclosure, add armor, hide the
wiring, add limbs or sensors, or turn the robot into a polished product.

## Editorial direction

The active set was generated with Codex's built-in image-generation mode using
the owner photos as direct image references. The scenes intentionally treat the
small homemade prototype as an epic science-fiction protagonist. Their scale and
danger are humorous and inspirational; none of the environments are physical
test evidence.

| Site asset | Editorial scene |
| --- | --- |
| `public/assets/ainekio/hero.webp` | Ruined neon megacity and lightning storm |
| `public/posts/ainekio-2026/body-design.webp` | Fallen war-machine graveyard with unfinished enclosure parts |
| `public/posts/ainekio-2026/controller-firmware.webp` | Derelict starship reactor and oversized control button |
| `public/posts/ainekio-2026/protocol-safety.webp` | Excessive missile-silo containment floor |
| `public/posts/ainekio-2026/gateway-simulator.webp` | Rain-soaked cyberpunk server canyon and ordinary USB cable |
| `public/posts/ainekio-2026/vision-loop.webp` | Alien monolith, cosmic eye, and calibration cards |
| `public/posts/ainekio-2026/voice-loop.webp` | Ruined opera house, colossal microphone, and speaker audience |
| `public/posts/ainekio-2026/metahuman-loop.webp` | Command cathedral and five-node supercomputer constellation |
| `public/posts/ainekio-2026/bounded-autonomy.webp` | Salt-flat pursuit toward one tiny red ball |
| `public/posts/ainekio-2026/current-status.webp` | Throne-like mountain of unfinished verification tools |

The avatar in `src/content/avatar/avatar.webp` and its public copy are crops of
the hero art. Generated PNG dimensions were preserved for the wide covers and
the served files were converted to WebP at quality 86.

The same ten scenes replace `src/assets/banner/0001.webp` through
`src/assets/banner/0010.webp`, so the optional rotating banner cannot fall back
to the previous armored-orange robot artwork. The default site banner is now
disabled because the homepage's project hero consolidates its useful content.

## Prompt invariant

Every prompt required construction fidelity before specifying the setting:
preserve the photographed open chassis, four-leg geometry, red feet and face,
cyan OLED, centered camera, exposed servos, boards, and wiring; do not enclose,
armor, streamline, recolor, or add hardware. Each cover then added its own
overdramatic setting, cinematic lighting, and no-text/no-logo/no-watermark
constraint.
