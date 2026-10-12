---
title: "July 2026: The Virtual Environment Bridge"
published: 2026-07-06
updated: 2026-09-08
description: "Historical notes on the early Megameal conversation bridge, its test results, and its original implementation."
image: "/posts/ainekio-2026/metahuman-loop.webp"
avatarImage: "/assets/avatar/avatar.webp"
authorName: "Ainekio"
authorBio: "Robot familiar project"
bannerType: "image"
bannerData:
  imageUrl: "/posts/ainekio-2026/metahuman-loop.webp"
timelineYear: 2026
timelineEra: "work-in-progress"
timelineLocation: "ainek.io"
showImageOnPost: true
tags: [Ainekio, Robot, MetaHuman OS, Work In Progress]
category: "V1 Originals"
draft: false
archive: true
lang: "en"
reading:
  topic: v1
  generation: v1
  kind: original
  next: archive/motion-systems
  related: ["body-design-and-hardware", "controller-firmware"]
---

> [Read the complete original Google document below](#original-document-text) · [All original eight-servo posts](/posts/v1-original-posts/).


# Before the physical robot connection

**Historical notes, July 2026.** Ainekio is a robot project connected to
MetaHuman OS, software for conversation, memory, and decisions. Before that
physical connection was working, an experiment used **Megameal**, a multiplayer
game environment, as a place for MetaHuman to receive events and send actions.

The intended sequence was conversation first, movement next, then a physical
body using the same general device interface. A **bridge** carried information
between MetaHuman and the game; an **adapter** translated game-specific events
and commands. This early design is part of the project’s history, not a setup
guide for the current robot.

The July 6 report recorded two-way conversation. Movement was not working,
there was no game avatar, and the multiplayer interaction still needed work.
Vision was unsupported. Speech recognition and synthesis were available only
on the MetaHuman side, so this was not a demonstrated talking robot in a room.

The subsequent Ainekio simulator experiment was unsuccessful and has been
completely retired. For the maintained robot integration, read
[how MetaHuman controls Ainekio](/posts/metahuman-integration/) and the
[dated status report](/posts/archive/2026-09-09-project-status/).

## What the two-player test was meant to show

An **External DEV Bridge Enabled** setting exposed input and output for the
currently running game player. It started disabled. The intended test used two
ordinary clients in the same room: a human-controlled player with the bridge off
and a MetaHuman-controlled player with it on.

The human-controlled player would provide someone for MetaHuman to talk to.
External controls merged with local keyboard or touch input, so both could
affect the bridged player.
The plan also allowed a single bridged client for observation and exploration;
without multiplayer there was no room conversation.

Initial data and controls were:

- player chat and environment text;
- location, heading, health, and other player state;
- move, stop, jump, interact, and chat output.

Images, maps, richer state, and more action feedback were proposed extensions.

The bridge received events as they happened instead of repeatedly asking the
game for changes. MetaHuman connected when its `environment-bridge` software
agent was enabled. **Environment Mode** was the workflow that prepared context,
called the model, read its proposed actions, and sent them back to the adapter.
Game-specific commands stayed at the adapter; persona, prompts, and model
selection stayed in MetaHuman.

## July setup and limitations

The documented setup enabled the bridge in the level editor, started the game
and MetaHuman servers, and joined both clients to a room. MetaHuman's agent
monitor enabled `environment-bridge` with Environment Mode selected. The adapter
then waited for socket events; the documented development default used port 4322.

The source document described a Megameal-specific interpreter inside the graph
(the connected steps of the workflow), alongside the intended generic interface.
That interpreter converted game observations into information the model could use. This was an early implementation,
not a completed separation of the two systems. These setup details are retained
as history and have not been retested against today's software.

## Implementation reference from July

<details>
<summary className="cursor-pointer py-3">Game bridge files and responsibilities</summary>

Paths below are relative to the repository layout recorded at the time.

- `apps/game.megameal/src/app/dev-bridge/gameDevBridge.ts`: settings, snapshots,
  commands, BroadcastChannel support, and the player's WebSocket endpoint.
- `gameDevBridgeRuntime.ts` in the same directory: player state, multiplayer chat,
  scene loading, collision overlays, and touch-control actions.
- `dev-bridge/server/game-dev-bridge-relay.mjs`: relay at
  `/__megameal-dev-bridge`; forwarded snapshots, logs, results, and commands,
  rejecting access when the bridge setting was disabled.
- `apps/game.megameal/scripts/editor-dev-api.mjs`: installed that relay on the
  development server and supplied its settings path.
- `apps/game.megameal/src/app/GameClient.svelte`: loaded the bridge runtime in
  development mode.
- `apps/game.megameal/src/app/levelPackageDiscovery.ts`: normalized runtime settings.
- `apps/game.megameal/src/editor/MasterControlMap.svelte`: bridge settings UI.
- `apps/game.megameal/src/editor/level/LevelEditorWorkspace.svelte`: editor monitor
  and command endpoint.
- `apps/game.megameal/src/editor/masterControlGraph.ts`: documentation graph.
- `apps/game.megameal/src/levels/global/settings.ts`: saved `devBridge.enabled`,
  broadcast location, and enabled data categories.

</details>

<details>
<summary className="cursor-pointer py-3">MetaHuman files and responsibilities</summary>

- `docs/implementation-plans/ENVIRONMENT_INTERFACE_BRIDGE.md`: the original plan.
- `brain/agents/environment-bridge/core.ts`: event-driven bridge process and
  connection lifecycle.
- `brain/agents/environment-bridge/cli.ts`: adapter, URL, room, graph, username,
  and enabled-state arguments.
- `brain/agents/environment-bridge/adapters/megameal.ts`: socket connection,
  self-chat filtering, observations, action translation, and results.
- The older `adapters/index.ts` and `adapters/megameal-local.ts` paths had been
  removed in that revision.
- `etc/cognitive-graphs/environment-mode.json`: observation → Megameal
  interpreter → context builder → model router → thinking stripper → action
  parser → send action. Responses returned through the bridge rather than
  streaming directly into MetaHuman chat.
- `packages/core/src/environment-interface/store.ts`: connections, sessions,
  observations, text-event claims, queued actions, and feedback.
- `packages/core/src/environment-interface/types.ts`: observation, action,
  session, feedback, image, map, and connection types.
- `packages/core/src/nodes/environment/connect.node.ts`: graph connection settings.
- `observation.node.ts` in the same directory: selected-session observations.
- `megameal-interpreter.node.ts`: player-text extraction, self-message filtering,
  and game-supported action selection.
- `action-parser.node.ts` and `helpers.ts`: output parsing, plain-text `sendText`,
  and optional natural-language movement parsing.
- `index.ts`: environment-node exports.
- `packages/core/src/nodes/schemas.ts`: browser-safe editor schemas.
- `start.sh` and `stop.sh`: service startup/shutdown and stale-state cleanup.
- `docs/robot-friend.md`: earlier project intent, separate from runtime code.

</details>

The [original Google document](https://docs.google.com/document/d/11-HIevKJzReutvqYSodHPu3CDrxDo3ujfTpTGzB27oo/edit)
was last modified July 7, 2026. This edited article preserves its history locally.
The later [motion experiment](/posts/archive/motion-systems/) records the move
from a game player to a robot simulator.


## Original document text

The complete original text was copied from the [Google document](https://docs.google.com/document/d/11-HIevKJzReutvqYSodHPu3CDrxDo3ujfTpTGzB27oo/edit) on October 12, 2026. The commentary above records the later outcome; the claims and plans below retain their original observation period. Only whitespace and local links have been normalized.

---

# Ainekio Step 1 - Virtual Environment Setup

Build a virtual connection between MetaHuman OS and the Megameal multiplayer environment.

`game.megameal` already has a multiplayer system. The current bridge plan is to keep that game system normal and add a lightweight External DEV Bridge switch. When the switch is on, the currently running Megameal client exposes input and output for its own player. It does not create a hidden player, special MetaHuman session, or hardcoded MetaHuman path.

If I want a human player and an AI player in the same room, the clean test shape is two ordinary Megameal clients connected to the same multiplayer room: one human-controlled client with the bridge off, and one bridge-controlled client with the bridge on.

The data exposed by the bridge should start small and expand deliberately:

- Text from multiplayer chat or environment events
- Location and heading
- Health or other player state
- Movement controls such as move, stop, jump, and interact
- Chat/text output back into the room
- Later: visual frames, map data, richer state, and feedback from action results

MetaHuman OS owns the other side of the bridge. Its `environment-bridge` agent starts only when requested, connects to the exposed game adapter, receives observations, and passes them into the Environment Mode node graph. The node graph is the entry and exit point for cognition: it prepares context, calls the model, parses the decision into generic actions, and sends those actions back through the bridge.

The important separation rule is that Megameal does not know prompts, personas, graph policy, or model routing. MetaHuman core does not know Megameal controls, rooms, maps, or special URL parameters. Megameal-specific translation stays at the Megameal External DEV Bridge edge. MetaHuman Environment Mode nodes stay generic so a future physical robot or another simulator can plug into the same workflow.

This means building a virtual body first. The first useful version can be conversation-only. Movement can follow once the text loop is stable. Long term, the same environment interface should make it possible to replace the Megameal adapter with a real-world body adapter.

## Game Dev Server as Virtual Environment

I have previously made a game engine with multiplayer support - it exists at <https://game.megameal.org/> (or whatever localhost is set). The player element in the local server has been modified. In the level editor at <https://game.megameal.org/editor> there is now a checkbox for 'External DEV Bridge Enabled'. When this is set, the player element has exposed in/out controls - this system is off by default to manage security risks. The exposed in/out controls are generic and not exclusive to the OS, for future possibilities. The majority of the code is kept in the `./src/app/dev-bridge` folder as much as possible. Note: when this is set, the external controls do not override the player - they merge, so there is the possibility of two inputs at once.

The intended workflow for this is to have two Node.js servers running from any device, start a multiplayer session, connect the inputs and outputs to the MetaHuman OS, and load both windows in the host room. Both players join; the AI has control of conversation and movement for one player, and the human owns conversation and movement of the other player. Alternatively, if there is only a single room and no multiplayer session, the AI can move and explore, but has no conversation abilities.

Alternatively, it is possible to start one server, enable the bridge, and observe the AI.

## MetaHuman OS Agent System

When the MetaHuman OS server is initially started, the server boots up and loads central agents to operate within the server - MetaHuman OS doesn't trigger the bridge system by default. To connect, you go to the agent monitor tab on the right window, and on the list of agents find `environment-bridge` - enable this and make sure environment mode is selected. The environment bridge agent will connect to the relevant server socket - by default it is set to server 4322, but I will add configurations for this soon. The agent will then run a non-polling process waiting for inputs from the Megameal server bridge. When it receives an input, it is processed through the configured input node in the environment mode workflow, and responses are sent through the configured output nodes - the input node receives text, location, health (battery), and other relevant info; the output node routes the data to relevant inputs in the configured server player - text, movement controls, etc. At this time vision is not supported. STT and TTS are supported OS side only.

## Current Status - 2026-07-06

- Bi-directional conversation achieved! Yay!
- Movement not working
- No game avatar
- No bridge polling loop - on purpose

The remaining real gap is proven to work but janky: the MetaHuman `environment-bridge` Megameal adapter is built, but the full multiplayer room loop still needs to be refined.

## Current File Surface

Current Megameal External DEV Bridge files:

- `apps/game.megameal/src/app/dev-bridge/gameDevBridge.ts`: main bridge contract and current-player runtime endpoint. It defines bridge settings, snapshots, command types, the browser-side BroadcastChannel support, and the WebSocket connection used by the current Megameal player to send observations and receive commands.
- `apps/game.megameal/src/app/dev-bridge/gameDevBridgeRuntime.ts`: binds the bridge to the running browser game client. This is where the bridge gets access to the current player snapshot, multiplayer chat send function, runtime-scene loader, collision overlay command, and touch-control action ports.
- `apps/game.megameal/src/app/dev-bridge/server/game-dev-bridge-relay.mjs`: development-only WebSocket relay mounted at `/__megameal-dev-bridge` on the existing Megameal dev server. It accepts game/controller bridge clients, forwards game snapshots/logs/results to controllers, forwards controller commands to game clients, and rejects access when the External DEV Bridge setting is disabled.
- `apps/game.megameal/scripts/editor-dev-api.mjs`: existing Megameal editor/dev-server plugin. It installs the dev bridge relay on the existing dev server and passes the global settings file path so the relay can check whether the bridge is enabled.
- `apps/game.megameal/src/app/GameClient.svelte`: imports the bridge runtime endpoint in development mode so the current game client can expose its current-player ports when the setting is enabled.
- `apps/game.megameal/src/app/levelPackageDiscovery.ts`: exposes normalized global bridge settings to the runtime package settings.
- `apps/game.megameal/src/editor/MasterControlMap.svelte`: editor UI surface for the External DEV Bridge settings in the global settings panel.
- `apps/game.megameal/src/editor/level/LevelEditorWorkspace.svelte`: editor-side bridge monitor/command endpoint used while working in the level editor.
- `apps/game.megameal/src/editor/masterControlGraph.ts`: documentation graph entry that describes the External DEV Bridge owner path and contract.
- `apps/game.megameal/src/levels/global/settings.ts`: saved global settings owner for `devBridge.enabled`, broadcast location, and enabled data categories.

Current MetaHuman bridge and Environment Mode files:

- `docs/implementation-plans/ENVIRONMENT_INTERFACE_BRIDGE.md`: source plan for the separated current-player adapter, MetaHuman bridge agent, and Environment Mode node graph.
- `brain/agents/environment-bridge/core.ts`: bridge-agent entry point. It enables bridge state, records connection data, defaults Megameal to `http://localhost:4322/`, starts the Megameal adapter when selected, and keeps the agent alive as an event-driven bridge process until stopped.
- `brain/agents/environment-bridge/cli.ts`: command-line surface for adapter id, URL, room, graph, username, and enable/disable state.
- `brain/agents/environment-bridge/adapters/megameal.ts`: Megameal adapter owned by the `environment-bridge` agent. It connects to `/__megameal-dev-bridge`, receives Megameal snapshots/results, filters self chat, publishes generic observations, runs Environment Mode on new player text, claims queued actions, and translates them into Megameal bridge commands.
- `brain/agents/environment-bridge/adapters/index.ts`: removed old adapter export surface.
- `brain/agents/environment-bridge/adapters/megameal-local.ts`: removed old local Megameal sidecar adapter/server code.
- `etc/cognitive-graphs/environment-mode.json`: Environment Mode workflow. It now routes `Environment Observation -> Megameal Interpreter -> Context Builder -> Model Router -> Thinking Stripper -> Action Parser -> Environment Send Action`. It no longer streams responses directly to MetaHuman chat for this bridge path.
- `packages/core/src/environment-interface/store.ts`: generic bridge store for enabled state, connection records, session state, observations, text-event claiming, action queue, and feedback.
- `packages/core/src/environment-interface/types.ts`: generic observation, action, session, feedback, visual, map, and connection contracts.
- `packages/core/src/nodes/environment/connect.node.ts`: generic connection node for graph-owned adapter settings.
- `packages/core/src/nodes/environment/observation.node.ts`: Environment Mode node for reading the active or requested session observation.
- `packages/core/src/nodes/environment/megameal-interpreter.node.ts`: specialized Megameal interpreter node. It accepts raw Megameal observations, filters `You`/self messages, exposes cleaned player text as instruction input, and limits available outputs to Megameal-supported environment actions.
- `packages/core/src/nodes/environment/action-parser.node.ts`: Environment Mode node for parsing model output into generic semantic actions. It supports plain text as `sendText` and optional natural-language movement parsing.
- `packages/core/src/nodes/environment/helpers.ts`: shared generic formatting and action parsing helpers for environment nodes, including natural movement fallback support.
- `packages/core/src/nodes/environment/index.ts`: export surface for the environment node family, including the Megameal interpreter node.
- `packages/core/src/nodes/schemas.ts`: browser-safe node schemas for the Environment Mode node editor, including the Megameal interpreter and Environment Connect schemas.

Related MetaHuman support files:

- `start.sh`: startup lifecycle support for cleaning stale local runtime files and service records.
- `stop.sh`: shutdown lifecycle support for cleaning current MetaHuman service processes.
- `docs/robot-friend.md`: legacy robot-friend intent document. It is useful context, not active bridge runtime code.
