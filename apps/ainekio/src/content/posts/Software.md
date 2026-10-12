---
title: "V1: Original Software and MetaHuman OS"
published: 2026-07-15
description: "The original software architecture, cognition, command bridge, validation, and development plans."
image: "/posts/ainekio/wizard-square.webp"
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
  next: archive/first-steps-work-in-progress
  related: ["body-design-and-hardware", "controller-firmware"]
---

> **Original eight-servo era document.** Copied from the [original Google Doc](https://docs.google.com/document/d/1w1k1ZmoCP_l_8z639lCzDJ3wRVZI1T3BijteEptouvg/edit) on October 12, 2026. The text below retains its own historical status and later additions; “current” refers to the document’s observation period, not today. [All original posts](/posts/v1-original-posts/) · [Current project status](/posts/current-status/).

> The browser simulator described here was subsequently unsuccessful and retired. Its intermediate results and plans are preserved as history.

---

# Ainekio Software and MetaHuman OS

Ainekio is the embodied side of a larger personal-AI system. The robot supplies a body, sensors, movement, sound, and a local safety boundary. MetaHuman OS supplies the persistent identity, memory, cognition, model routing, tools, and supervised agency that decide what the body should try to do. The Ainekio bridge is the narrow, replaceable connection between those two worlds.\
Current status — inspected 2026-07-15 against Ainekio commit f010ff5 plus the current firmware, gateway, emulator, and dashboard working tree, and the current MetaHuman OS working tree based on commit 260c6251: the authenticated software loop is implemented and passes focused bridge, graph, and security validation. A local microWakeWord engine and its protocol/control surfaces are now implemented and cross-built, but no validated Ainekio wake model is installed. Physical Ainekio hardware has not completed bring-up, so the overall loop remains proven through the gateway, body emulator, and Sesame visual renderer rather than a fully validated physical robot.

## The system in one sentence

MetaHuman OS observes the world through an environment adapter, reasons with the selected user's identity and cognitive graph, emits bounded semantic actions, and receives correlated feedback; Ainekio translates those actions into its own robot protocol and remains the final authority over whether the body moves.

## The division of responsibility

* MetaHuman OS is the remote brain. It owns identity, memory, conversation, cognitive graphs, model selection, agency, tools, and the decision to propose an action.
* The MetaHuman Environment Bridge is a generic connection agent. It moves observations and semantic actions between MetaHuman OS and a configured adapter without knowing Ainekio's servos, command wire format, or hardware.
* The Ainekio environment adapter is the robot-specific translator. It converts generic environment actions into a deliberately small set of Ainekio intents and converts gateway state, text, feedback, and camera frames into generic observations.
* The Ainekio gateway is the control-plane owner for robot sessions. It authenticates bodies, assigns connection epochs and command sequence numbers, tracks acknowledgement and completion, routes media, exposes operator status, and rejects offline or stale work.
* The Ainekio body core and firmware own physical safety. They validate commands, enforce calibration and battery rules, schedule bounded movement, and execute stop independently of the AI.
* The body emulator and Sesame renderer provide a development substitute for physical hardware while preserving the same protocol-v1 command lifecycle.

This separation is deliberate. The language model never becomes a servo controller, the robot firmware does not become a copy of MetaHuman OS, and the bridge can be replaced without rewriting either cognition or body safety.

## What MetaHuman OS is

MetaHuman OS is a local-first operating environment for a persistent personal AI identity. It is not only a chat interface and it is not one model running behind a webpage. It combines a shared engine, human-readable user data, cognitive graphs, model providers, background agents, voice systems, training pipelines, operator controls, and audit boundaries so one evolving identity can work across conversation, memory, tools, and external environments.

### Persistent identity and profile context

* Profiles hold the person's identity, preferences, values, routines, trust configuration, and persona material.
* User-specific paths are resolved through the core path system so a profile can live in the default repository area, on external storage, or on an encrypted drive.
* Identity and profile context are shared by the web interface, command line, cognitive graphs, agents, and model router instead of being duplicated in each surface.
* Personal profiles, memories, logs, browser data, and generated model artifacts are runtime data. They are intentionally kept outside the maintained remote-safe source surface.

### Memory and retrieval

* MetaHuman stores conversations, episodic events, tasks, summaries, preferences, transcripts, reflections, and training-ready examples as user-owned local data.
* Memory can be captured from chat, the command line, imported documents, audio, agents, and other ingestion paths.
* Keyword search and optional embedding indexes provide direct and semantic retrieval for retrieval-augmented prompts.
* Background organizers, indexers, summarizers, pruners, and sync agents maintain the memory system without making the model itself the storage authority.
* Memory writes depend on the active cognitive mode and trust boundary. Emulation Mode, for example, is intended to use existing persona material without mutating it.

### Cognitive modes

* Dual Consciousness Mode is the full persistent-persona mode: deeper memory grounding, richer internal processing, proactive agents, and normal long-term memory development.
* Agent Mode is a more direct command-and-task mode with lighter context and less autonomous personality behavior.
* Emulation Mode is a read-only persona mode for demos, frozen snapshots, and safer conversations that should not change memory or identity.
* Environment Mode is the embodied mode. It consumes observations, builds multimodal environment context, asks the selected model for a conversational response plus zero or more semantic actions, and coordinates those actions through an adapter.

### Cognitive graphs

MetaHuman's reasoning pipelines are editable node graphs stored under etc/cognitive-graphs. A graph describes the sequence of inputs, memory/context preparation, model calls, parsing, output, and side effects for a mode or agent. This keeps behavior inspectable and allows the system to change how a model reasons without hard-coding every decision into one server route.

* The current repository contains 20 validated graph definitions for conversation, emulation, environment control, curation, reflection, dreams, curiosity, desires, operator policy, and other workflows.
* Runtime node definitions live in packages/core, while the browser-safe node schema keeps the flow editor aligned with what the engine can execute.
* Graphs run under an explicit user context so profile paths, permissions, memory, and model roles resolve for the intended owner.
* The graph runtime streams progress and output so the interface can show what stage is running rather than waiting for one opaque final response.

### Model routing and inference

* The model router selects a provider and model by role instead of binding the whole system to one model.
* Supported paths include Ollama, vLLM, the local-model service, connected server or remote providers, and operator-grade backends used for escalated reasoning or coding.
* Different roles can use different models: persona conversation, orchestration, curation, coding, embeddings, training support, and environment reasoning do not have to share one backend.
* Structured text-and-image message content is preserved through the environment context builder and provider layer so an image-capable model can reason over a returned robot camera still.
* MetaHuman remains usable as a local-first system even when some optional remote backends are not configured.

### Agency and background work

The brain directory contains long-running services and one-shot agents above the core engine. These agents are the background metabolism of MetaHuman OS: they organize memory, reflect, generate curiosity, process audio, build training material, and carry supervised autonomous work forward.

* Memory agents include organizer, ingestor, auto-indexer, summarizer, pruner, sync, and profile-sync workers.
* Inner-life agents include reflector, dreamer, daydreamer, train-of-thought, curiosity service, inner curiosity, and psychoanalysis workflows.
* Agency agents include desire generation, exploration, planning, review, execution, and outcome review.
* Maintenance and production agents include curator, night pipeline, transcriber, audio organizer, coder, update check, and training-related services.
* Agent Monitor provides PID-tracked start, stop, restart, run-on-boot, configuration, readiness, dependency health, logs, and failure information for maintained agents.

### Voice, audio, and media

* MetaHuman includes local speech-to-text, text-to-speech, voice chat, transcript ingestion, audio organization, and voice-training workflows.
* Whisper-based transcription, Kokoro and other TTS paths, GPT-SoVITS, RVC, and training helpers are separate tools behind shared core interfaces.
* Audio transcripts can become memory and training material under the selected user's policy.
* Ainekio firmware now includes an open microWakeWord/TensorFlow Lite Micro inference engine. It processes 16 kHz mono signed-16-bit microphone audio locally with a streaming 40-feature frontend, a 30 ms analysis window, and a 10 ms feature step.
* Wake-word models are trained and packaged on owner hardware, then installed through LittleFS. Firmware accepts a package only after validating its bounded manifest, SHA-256, TFLite FlatBuffer, supported operators, quantized tensor contract, provenance, and runtime tensor arena. Voice recordings, generated samples, feature sets, and trained weights are not sent to an outside training service.
* Wake configuration is durable and visible across firmware, protocol, gateway, emulator, and dashboard through wake\_enabled, wake\_model, and wake\_ready. First boot remains disabled, and authenticated commands reject wake enablement or microphone gate=wake until a valid local model is ready.
* With microphone gate=wake, PCM stays on the robot until detection. A wake event opens bounded voice-activity forwarding; about 700 ms of silence closes the utterance and rearms the detector after its warm-up interval.
* The Ainekio bridge currently returns text and bounded JPEG stills. Robot microphone PCM is not yet assembled into utterances and routed into MetaHuman's transcription system, and robot speaker PCM is not yet driven from the bridge loop.

### Learning and training

MetaHuman is designed to improve from accumulated local experience, not only from a larger system prompt.

1. Conversation, tasks, memories, transcripts, reflections, and approved agent output accumulate as local user data.
2. Curation and dataset builders select useful examples while preserving profile and privacy boundaries.
3. Local or remote training workflows produce LoRA or fine-tuned adapters.
4. Evaluation and activation tools determine which adapter is available to the model-routing layer.
5. Future conversations and agents can then use the updated model stack.

These training systems are powerful but still an active research area. They should be understood as supervised pipelines with inspectable data, not as permission for the robot or persona to rewrite itself without operator control.

### Tools, trust, and audit

* Skills expose bounded capabilities such as files, tasks, memory search, calendar access, agents, code work, and operator escalation.
* Policies and trust levels decide whether work is allowed, denied, queued for review, or escalated.
* The Active Operator system and approval surfaces separate an AI proposal from authority to perform a consequential action.
* Audit and logging systems record important operations, agent runs, queue lifecycle, errors, and security-relevant events.
* The local-first design keeps secrets and personal data out of maintained source while still making the system inspectable by its owner.

### Interfaces

* The Astro and Svelte web application provides chat, inner dialogue, memory, tasks, agency, model controls, voice workspaces, training tools, flow editing, Agent Monitor, queue inspection, audit streams, and security controls.
* The mh command line provides status, initialization, memory capture, tasks, agents, backend operations, and automation without requiring the graphical interface.
* Astro API routes are intended to be thin transport wrappers. Shared behavior belongs in packages/core API handlers so web, CLI, and other interfaces do not develop conflicting rules.
* The maintained React Native package is an interface shell for mobile work; deprecated Capacitor and Code OSS bulk are not part of normal current-system ownership.

### The work coordinator

Current MetaHuman work is coordinated through one maintained queue owner under packages/core/src/queue. This matters to the robot because an environment observation is not allowed to create a private side execution chain.

* Every work item has a type, handler, source, owner, priority, resource, lifecycle state, optional deadline, correlation ID, idempotency key, and bounded retry policy.
* User messages, environment observations, memory work, agents, vector indexing, remote providers, sleep workflows, and operator policy share the coordinator instead of competing through unrelated queues.
* Environment observations are high-priority local-model work. Robot actions become environment-command work tied to one session.
* A semantic stop is critical priority and cancels queued non-stop commands for the same session before it is dispatched.
* The coordinator tracks queued, leased, waiting, completed, failed, cancelled, expired, and needs-review states, making failures visible and preventing silent replay.

## Why the Ainekio bridge exists

* Decoupling: MetaHuman can reason about an environment without importing Ainekio protocol code, and Ainekio can evolve its hardware without importing the MetaHuman engine.
* Semantic safety: the model asks for actions such as walk, wave, stop, or send text. It does not transmit joint IDs, PWM values, or raw servo angles.
* Replaceability: the MetaHuman bridge agent speaks a generic observation/action contract, so another robot, simulator, game, or remote environment can provide a different adapter.
* Failure isolation: cognition, transport, gateway correlation, and body execution each report their own state instead of collapsing into one unverifiable command.
* Observability: sessions, action streams, queue work, lifecycle feedback, robot connection state, and camera observations can be inspected at their owning layer.
* Local ownership: the default loop runs on localhost with separate runtime tokens. A production deployment can later replace the local WebSocket address with an authenticated secure endpoint without changing the cognitive graph.
* Testability: the host body emulator and Sesame renderer exercise the same semantic and protocol contracts before physical hardware is available.

## Current software owners

### MetaHuman OS owners

* packages/core/src/environment-interface contains the generic observation, action, feedback, session-state, and action-queue contracts.
* packages/core/src/api/handlers/environment-bridge.ts owns authenticated observation ingestion, the event-driven action stream, action-result settlement, status, and enable/disable control.
* packages/core/src/queue owns the sole work coordinator and the environment-observation execution handler.
* packages/core/src/nodes/environment contains observation, image, map, context, parsing, feedback, status, and bridge-output nodes.
* etc/cognitive-graphs/environment-mode.json defines the current Environment Mode graph.
* brain/agents/environment-bridge/core.ts owns the long-running connection agent between MetaHuman's APIs and a configured adapter.
* packages/core/src/agent-monitor and agent-monitor-descriptors expose bridge lifecycle, tokens-present status, active sessions, action streams, adapter URL, graph selection, and readiness.
* apps/site/src/pages/api/environment-bridge contains transport-thin route wrappers; the business logic remains in core.

### Ainekio owners

* Master/gateway/environment\_adapter/server.py owns the authenticated generic adapter socket and converts gateway events, transcripts, state, feedback, and camera frames into environment messages.
* Master/gateway/environment\_adapter/translation.py owns the narrow translation from generic actions to Ainekio semantic intents.
* Master/gateway/server/service.py owns authenticated robot sessions, epochs, sequence assignment, lifecycle correlation, profiles, media routing, and status.
* Slave/software/protocol owns protocol-v1 schemas, validators, fixtures, joint contracts, and binary framing shared by the body, gateway, emulator, and firmware.
* Slave/software/core owns portable body behavior and safety.
* Slave/firmware/esp32s3 is the physical platform implementation.
* Emulator/emulator is the protocol-v1 host body, and Emulator/sesame-robot-sim is the optional visual renderer.
* The local dashboard on port 8791 is an operator surface for robot status, commands, credentials, audit records, provisioning, calibration, and media controls.

## How the bridge connects MetaHuman OS to Ainekio

### 1\. Configuration and startup

MetaHuman's etc/agents.json enables environment-bridge as a high-priority, auto-restarting, run-on-boot connection agent. Its current default adapter URL is ws://127.0.0.1:8790/environment and its graph is environment.

* MH\_ENVIRONMENT\_BRIDGE\_TOKEN authenticates the bridge agent to MetaHuman's internal environment API.
* MH\_ENVIRONMENT\_ADAPTER\_TOKEN authenticates the bridge agent to the selected Ainekio adapter.
* MH\_ENVIRONMENT\_ADAPTER\_URL can override the configured adapter WebSocket.
* MH\_ENVIRONMENT\_GRAPH can select a different validated cognitive graph.
* MH\_TRIGGER\_USERNAME supplies the owner context required to run cognition under the correct profile.
* AINEKIO\_ENVIRONMENT\_ADAPTER\_TOKEN is the Ainekio side of the shared adapter secret.
* AINEKIO\_ENVIRONMENT\_SESSION\_ID identifies the robot or emulator session exposed to MetaHuman.

The internal service token and adapter token are intentionally different. A third credential boundary—the robot token—authenticates the body to the Ainekio gateway. The dashboard has its own password as well. Secret values are runtime configuration and are not committed.

### 2\. Adapter handshake

1. The MetaHuman Environment Bridge agent opens the configured ws or wss adapter URL.
2. It sends bridge.connect with protocol version 1 and the adapter token.
3. Ainekio checks the token with constant-time comparison, rejects malformed or unauthenticated clients, and permits one authenticated environment connection.
4. A new authenticated connection replaces the prior adapter client so there is one owner of the action stream.
5. Ainekio replies with bridge.ready, the session ID, capabilities, current transport and safety state, and the gateway's robot status.

### 3\. Observation ingestion

The MetaHuman bridge agent posts each ready message or later environment observation to /api/environment-bridge/observation using its internal bearer token plus the selected username and graph headers.

* MetaHuman validates the minimum observation identity: environment ID, adapter ID, session ID, timestamp, and capabilities.
* The bounded environment state file records the latest observation for each session and marks stale sessions after 45 seconds without contact.
* Text event IDs are claimed once so the same environment utterance is not repeatedly interpreted.
* Feedback IDs are deduplicated and the stored feedback history is bounded.
* Each accepted observation becomes high-priority environment\_observation work in the coordinator with an idempotency key based on session and timestamp.
* Connection changes, robot events, text, action completion, and camera frames can trigger observations. Periodic status packets remain liveness data and do not continuously wake cognition.

### 4\. Environment Mode cognition

The coordinator executes Environment Mode under the configured user's context. The current graph is explicit and inspectable:

1. Environment Observation reads the exact observation that triggered the work.
2. Environment Instruction Interpreter extracts the current instruction, session, and structured state.
3. Environment Image Input validates at most one JPEG data URL and rejects unsupported or oversized frames.
4. Optional Map Context can add graph-authored location and map information without baking an Ainekio map into core cognition.
5. Build Environment Context combines state, text, feedback, location, map, and any validated image into the model message.
6. Environment LLM routes that message through the persona model role.
7. Thinking Stripper removes private reasoning wrappers from the usable result.
8. Parse Environment Action separates a visible conversational response from zero or more validated semantic actions.
9. Environment Bridge Out checks delivery readiness and coordinates accepted actions.
10. Stream Conversation and Environment Chat keep the model's ordinary response visible even when it decides that no robot action is needed.

The desired model contract is one structured result with a response string and an actions array. Conversation and embodiment are independent: MetaHuman can answer without moving, move while also explaining what it is doing, or report that the adapter is unavailable.

### 5\. Action coordination and event-driven delivery

* Bridge Out verifies that action delivery is enabled, the target session is connected, and an action-stream subscriber is present.
* It allows only graph-configured action types and applies duration limits before queueing.
* Actions are stored as coordinator work rather than sent directly from the model node.
* The long-running bridge agent holds an authenticated Server-Sent Events connection to /api/environment-bridge/stream for the target session.
* When work is ready, MetaHuman pushes an actions event. There is no command polling loop.
* The bridge agent forwards each action over the already-authenticated full-duplex adapter WebSocket.
* If the socket closes, the agent waits two seconds and reconnects; it does not invent or replay completed robot intent.

### 6\. Ainekio translation

The Ainekio adapter accepts only a small, bounded subset of the generic environment contract.

* sendText becomes a gateway transcript event and never becomes a body command.
* stop becomes the gateway's emergency stop path.
* move becomes the walk intent with forward, backward, left-turn, or right-turn direction and a bounded one-to-ten step count.
* robotCommand supports stand, neutral, sit, walking directions, stop, and an allowlisted set of seeded emotes such as wave, dance, bow, shrug, and rest.
* Aliases such as idle, reverse, turn left, and play dead normalize to the same semantic body intents.
* Unsupported actions, unknown robot commands, empty text, and raw servo-like instructions are rejected.
* Generic MetaHuman action types such as look, jump, and interact remain part of the reusable interface but are not currently translated by the Ainekio adapter.

### 7\. Robot execution

1. The adapter gives the gateway a semantic intent and the local receipt time.
2. The gateway verifies that exactly one requested robot is connected and rejects expired work before assigning a sequence.
3. The authenticated protocol-v1 body session receives the command with its current connection epoch and sequence number.
4. The body validates the command again, applies its own state, calibration, asset, battery, and safety rules, then returns acknowledgement, completion, cancellation, or rejection.
5. The gateway correlates the terminal result to the original sequence and returns it to the adapter.
6. The emulator follows this lifecycle headlessly when no renderer is open; with the Sesame page connected, motion completion waits for the correlated renderer result.

### 8\. Feedback, vision, and continuation

* Ainekio sends environment.feedback with the original MetaHuman action ID, terminal status, command name, and robot sequence.
* The MetaHuman bridge agent posts that result to /api/environment-bridge/action-result so the coordinator can complete, cancel, expire, or fail the command work.
* The next observation carries the same feedback into graph context. This keeps queue settlement separate from the bounded feedback history while remaining idempotent by feedback ID.
* After a completed action, Ainekio requests one correlated camera snapshot. If a frame is unavailable, it sends a state observation instead.
* A protocol-v1 JPEG becomes a bounded data URL observation; MetaHuman accepts only JPEG and no more than 120 KiB, then creates an OpenAI-compatible image\_url content part.
* Returned text and visual events can schedule another Environment Mode step. Current coordinator logic limits automatic observation-driven graph runs to eight recent runs per session within a 60-second window.
* Continuous video is intentionally excluded from the model loop. The current design uses still images tied to meaningful events and completed actions.

## The generic environment contract

### Observations

* Identity: environmentId, adapter, sessionId, and timestamp.
* Capabilities: allowed action types plus text, movement, visual, and map support.
* Text: deduplicated player, NPC, system, or environment events with IDs and timestamps.
* State: adapter-defined structured status such as Ainekio transport, body safety ownership, robot connection, profile, heartbeat age, last command, and last terminal result.
* Location and map: optional generic coordinates, regions, landmarks, paths, and descriptions.
* Visuals: optional frame metadata, URL or data URL, dimensions, source, camera metadata, and timestamps.
* Feedback: accepted, rejected, completed, cancelled, expired, failed, or status events correlated to an action.

### Actions

* move: direction, units, vector, and bounded duration.
* look: a generic directional action reserved for adapters that implement it.
* jump and interact: generic environment actions for capable adapters.
* stop: the universal semantic emergency action.
* robotCommand: a named device-level semantic intent such as stand or wave, never a raw joint command.
* sendText: conversational or environmental text that does not command the body.

### Why semantics matter

MetaHuman is allowed to decide intent; Ainekio is allowed to decide execution. A phrase such as “walk forward” can become a bounded walk action, but only the Ainekio body knows the calibrated joint map, safe pose, current battery state, active fault, available motion asset, and whether movement is permitted. This is the central safety and portability rule of the whole integration.

## Safety and reliability across the boundary

* Separate authentication protects MetaHuman internal APIs, the adapter socket, the robot socket, and the dashboard.
* Bridge messages are bounded to 256 KiB; robot binary frames and control messages have their own protocol limits.
* Non-replayable movement and control actions expire after two seconds, and excessive future clock skew is rejected.
* Stop is critical-priority work in MetaHuman, cancels queued movement for the same session, translates to Ainekio's dedicated stop command, and is finally enforced by the body-owned direct stop path.
* A new robot connection receives a new epoch. Pending commands from a replaced or disconnected session are cancelled rather than leaking into the new session.
* Sequence numbers correlate acknowledgement and completion inside one epoch; action IDs and feedback IDs correlate the larger bridge loop.
* Only one environment command is leased per session resource at a time, preventing independent consumers from claiming the same robot work.
* The bridge refuses to report success merely because the model produced an action. It distinguishes disabled delivery, no adapter, queued work, adapter rejection, expiry, cancellation, and physical completion.
* The image path accepts one bounded JPEG still, not arbitrary files or unbounded camera streams.
* Credentials, runtime bridge state, audit logs, robot media, and personal MetaHuman data are local runtime concerns and stay outside maintained source.

## What is implemented now

* A real PID-tracked MetaHuman Environment Bridge agent with Start, Stop, Restart, Run On Boot, Auto Restart, Adapter URL, Graph, delivery toggle, readiness, token-present status, session counts, and action-stream status.
* One authenticated full-duplex adapter WebSocket plus an authenticated internal Server-Sent Events action stream.
* A coordinator-owned observation and command lifecycle with priority, expiry, cancellation, idempotency, session isolation, and status readback.
* A validated Environment Mode graph that keeps conversational output visible and sends only semantic actions.
* Text, state, lifecycle feedback, and bounded JPEG observation support.
* Ainekio translation for move, stop, sendText, body poses, walking directions, and allowlisted emotes.
* Protocol-v1 gateway correlation through robot acknowledgement, completion, cancellation, and rejection.
* One post-action observation per terminal result, preferring a correlated still image when available.
* A protocol-v1 body emulator and optional Sesame renderer for the complete development loop.
* A local ESP32-S3 microWakeWord/TensorFlow Lite Micro engine, persistent wake settings, protocol status and wake events, emulator parity, and gateway/dashboard controls. The checked-in image intentionally reports wake\_ready=false until an owner-trained, validated local model package is installed.
* A password-protected Ainekio operations dashboard and bounded audit output.
* Focused compatibility coverage for stale actions, stop precedence, session isolation, queue lifecycle, service-token authentication, model-output parsing, image validation, and bridge readiness.

## Current validation evidence

* MetaHuman environment compatibility spec: passed on 2026-07-15.
* Ainekio focused environment-adapter suite: 10 tests passed on 2026-07-15.
* MetaHuman cognitive graph validation: 20 of 20 graph files valid, including Environment Mode.
* MetaHuman security-route validation: 12 of 12 checks passed.
* MetaHuman working-tree whitespace validation: git diff \--check passed.
* The Ainekio repository records the broader software acceptance set A1-A30 as 30 of 30 and an ESP32-S3 cross-build, while still separating that software evidence from physical hardware proof.

## What is not complete

* The bridge has not yet controlled a fully brought-up physical Ainekio robot. Servos, power, battery calibration, camera, microphone, speaker, display, SD card, and physical stop timing still require the H-series hardware gates.
* The current default adapter topology is local ws:// on port 8790\. A production remote or WiFi topology should use a reviewed wss endpoint, secret management, deployment monitoring, and measured latency before it is treated as equivalent.
* Robot microphone PCM is not yet assembled into utterances and routed through MetaHuman's Whisper transcription path.
* MetaHuman speech output is not yet streamed as robot speaker PCM through this bridge loop.
* The local microWakeWord inference engine is implemented, but no locally trained and validated Ainekio model is installed. The checked-in image intentionally remains wake\_enabled=false and wake\_ready=false; model quality, real-microphone behavior, false accepts, media and motion coexistence, and end-to-end speech routing still need evidence.
* Continuous video is intentionally absent; only bounded still-image observations are supported.
* GPS and additional sensors are future adapters even though the generic observation contract already has location and map fields.
* Ainekio currently implements fewer action types than the generic MetaHuman contract. Look, jump, interact, richer camera control, and other behavior need explicit adapter mappings and body capabilities.
* Durable multi-step objectives are separate from the current bounded automatic continuation window.
* MetaHuman OS remains an active research repository. The focused bridge and architecture surface is validated, but unrelated legacy TypeScript debt and experimental agency, voice, training, mobile, and provider paths still require ongoing consolidation.

## Running the current local loop

1. Configure the MetaHuman internal bridge token, the shared adapter token, the owner username, and any adapter URL or graph override.
2. Configure Ainekio with the same adapter token plus the robot or emulator token and dashboard password.
3. Start MetaHuman OS with ./start.sh. The current supported runtime is Node.js 22.3 or newer within the Node 22 line.
4. Start Ainekio from its repository with ./start.sh to launch the protocol-v1 emulator, visual renderer, gateway, environment adapter, and dashboard.
5. In MetaHuman Agent Monitor, confirm Environment Bridge is running, Action Delivery is enabled, the adapter token fields report Configured, one robot session is active, and at least one action stream is connected.
6. Use Environment Mode for conversation and semantic robot instructions. Inspect MetaHuman queue state, bridge readiness, Ainekio dashboard state, and terminal feedback when diagnosing a command.

## Key source locations

* MetaHuman maintained-source boundary: docs/technical/MAINTAINED\_SURFACE.md
* MetaHuman system overview: README.md and docs/technical/ARCHITECTURE.md
* MetaHuman bridge contract: packages/core/src/environment-interface
* MetaHuman bridge API owner: packages/core/src/api/handlers/environment-bridge.ts
* MetaHuman work coordinator: packages/core/src/queue
* MetaHuman environment nodes: packages/core/src/nodes/environment
* MetaHuman Environment Mode graph: etc/cognitive-graphs/environment-mode.json
* MetaHuman connection agent: brain/agents/environment-bridge/core.ts
* Ainekio adapter: Master/gateway/environment\_adapter
* Ainekio gateway: Master/gateway/server/service.py
* Ainekio protocol: Slave/software/protocol
* Ainekio body core: Slave/software/core
* Ainekio firmware: Slave/firmware/esp32s3
* Ainekio local wake-word workflow and engine: docs/LOCAL\_WAKE\_WORD.md and Slave/firmware/esp32s3/components/ainekio\_platform/src/wake\_word\_service.cpp
* Ainekio emulator and visual renderer: Emulator/emulator and Emulator/sesame-robot-sim
* Closed-loop implementation status: docs/AINEKIO\_METAHUMAN\_CLOSED\_LOOP\_STATUS.md

## Future work

1. Complete Ainekio physical bring-up and record every H1-H15 hardware proof gate before calling the robot body complete.
2. Deploy the adapter through a reviewed secure remote topology, measure end-to-end observation and stop latency, and prove reconnect behavior on real WiFi.
3. Train, evaluate, and package a local Ainekio wake-word model; validate false accepts, real INMP441 behavior, and media/motion coexistence; then connect the bounded wake/VAD utterance output to MetaHuman transcription and environment text events.
4. Connect MetaHuman TTS output to the Ainekio speaker stream with cancellation, backpressure, and lifecycle feedback.
5. Enable the physical camera only after board and sensor validation, then test correlated still capture under concurrent motion, audio, and network load.
6. Add environment capabilities only when both MetaHuman graph support and an Ainekio adapter/body implementation exist; do not advertise actions the robot cannot safely execute.
7. Define multi-robot selection, per-robot policy, and operator controls before one MetaHuman identity can coordinate more than one body.
8. Add contract-version conformance fixtures that can be shared by MetaHuman adapters, Ainekio, and future environments.
9. Keep consolidating MetaHuman's maintained core, agent runtime, provider, voice, training, and mobile boundaries while preserving user-data isolation.
10. Develop durable embodied objectives as an explicit supervised autonomy feature rather than extending the current eight-step continuation limit invisibly.

## Current takeaway

The Ainekio bridge is no longer just an idea or a game-specific prototype. It is a tested, event-driven boundary connecting MetaHuman OS cognition to an Ainekio gateway, emulator, and future physical body. MetaHuman OS remains the complex personal-AI operating environment: it owns identity, memory, cognition, models, tools, agency, voice, learning, and operator policy. Ainekio remains the robot system: it owns translation, protocol correlation, hardware state, and physical safety. The bridge succeeds precisely because it keeps those responsibilities separate while closing the observation-action-feedback loop.
