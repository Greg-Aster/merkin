# MEGAMEAL Game Design Document
## Threlte-Based 3D Web Game

**Version:** 5.4 (Consolidated, Manifest-Driven Terrain)
**Date:** September 2025
**Engine:** Threlte + Svelte 5 + Rapier Physics + BitECS + PeerJS

---

## Version History

| Version | Date | Author(s) | Key Changes |
|---------|------|-----------|-------------|
| 5.4 | September 2025 | Dev Team | Consolidated GDD, aligned with manifest-driven terrain (observatory-environment), added multiplayer room directory notes, and removed duplicate sections. |
| 5.3 | August 2025 | Dev Team | Refactored terrain into a unified, feature-based system. Implemented a content pipeline using pre-baked heightmaps for physics and chunked GLBs for visuals. |
| 5.2 | August 2025 | Dev Team | Completed feature-based architecture refactor for `player`, `performance`, and `lighting` systems. |
| 5.1 | August 2025 | Dev Team | Initial feature-based refactor: `multiplayer` and `conversation` systems consolidated into dedicated modules. |
| 5.0 | August 2025 | Dev Team | Updated conversation system architecture, fixed data structure mismatches, unified store-based dialog system. |
| 4.0 | August 2025 | Dev Team | Complete technical reference with multiplayer system documentation. |
| 3.1 | August 2025 | Dev Team | Technical architecture reference document. |
| 3.0 | August 2025 | Dev Team | Architecture audit and refactor plan. |
| 2.0 | July 22, 2025 | Dev Team | Technical architecture manual established. |

---

## Table of Contents

1.  [Overview](#overview)
2.  [Technical Architecture](#technical-architecture)
3.  [Architectural State & Recent Improvements](#architectural-state--recent-improvements)
4.  [File Structure](#file-structure)
5.  [Core Systems & Features](#core-systems--features)
    *   [Feature Modules](#feature-modules)
    *   [Level Management System](#level-management-system)
    *   [Hybrid ECS Architecture](#hybrid-ecs-architecture)
    *   [State Management](#state-management)
6.  [Component & System Reference](#component--system-reference)
    *   [HybridFireflyComponent](#hybridfireflycomponent)
    *   [OceanComponent](#oceancomponent)
    *   [Navigation System](#navigation-system)
    *   [Audio System](#audio-system)
    *   [EventBus System](#eventbus-system)
    *   [Terrain System](#terrain-system)
7.  [Feature Implementation](#feature-implementation)
    *   [Feature-Based Architecture](#feature-based-architecture)
    *   [Level System](#level-system)
    *   [Nature Pack Vegetation System](#nature-pack-vegetation-system)
    *   [Visual Style System (Ghibli Aesthetics)](#visual-style-system-ghibli-aesthetics)
    *   [Underwater Effects System](#underwater-effects-system)
8.  [Development Standards & Best Practices](#development-standards--best-practices)
    *   [Code Quality](#code-quality)
    *   [Component Development Rules](#component-development-rules)
    *   [ECS Best Practices](#ecs-best-practices)
    *   [Feature Organization Standards](#feature-organization-standards)
    *   [Memory Management](#memory-management)
    *   [Performance Targets](#performance-targets)

---

## Overview

MEGAMEAL is a first-person 3D exploration game built using modern web technologies. The game features interconnected levels that players can explore through immersive first-person controls, enhanced with peer-to-peer multiplayer capabilities and AI-powered character interactions.

The project implements a sophisticated, **feature-based architecture** built entirely with the `src/threlte` framework structure for improved maintainability and scalability.

### Core Features
-   **First-Person Movement**: WASD + mouse look controls with physics-based movement.
-   **Modern 3D Architecture**: A core system built on Threlte for declarative 3D.
-   **Hybrid ECS Architecture**: High-performance entity component system (BitECS) for dynamic objects.
-   **Advanced Rendering**: Features include a dynamic ocean, vegetation, stylized visuals, and LOD optimization.
-   **AI Character Interactions**: A self-contained feature module for intelligent firefly characters.
-   **P2P Multiplayer**: A self-contained feature module for real-time multiplayer with position synchronization and text chat.
-   **Cross-Platform**: Desktop and mobile support with adaptive controls.

---

## Technical Architecture

### Core Technologies
-   **Threlte**: Declarative 3D framework for Svelte.
-   **Svelte 5**: Reactive UI framework with modern stores.
-   **Rapier3D**: Physics engine for realistic movement and collisions.
-   **Three.js**: Underlying 3D engine (via Threlte).
-   **BitECS**: High-performance Entity Component System for dynamic objects.
-   **PeerJS**: Browser-to-browser P2P networking for multiplayer.
-   **Astro**: Static site generator with component islands.

### Architectural Philosophy

MEGAMEAL's architecture is defined by two core philosophies:

**1. Hybrid Paradigm (Declarative + Imperative)**
-   **Declarative Components (Threlte/Svelte)** are used for high-level scene composition, UI, and static elements.
-   **Imperative ECS (BitECS)** is used for performance-critical, dynamic systems like particles and large-scale object management.

**2. Feature-Based Organization**
-   Domain-specific functionality is encapsulated into **self-contained feature modules**.
-   Each feature (e.g., `player`, `multiplayer`, `performance`) manages its own components, services, stores, and UI.
-   A **barrel file (`index.ts`)** in each feature's root provides a clean, stable public API, decoupling features from each other.

---

## Architectural State & Recent Improvements

### Recent Architectural Improvements (v5.2)

1.  **Completed Feature-Based Refactor:**
    *   **Problem Resolved:** Multiple core systems (`player`, `performance`, `lighting`) were scattered across generic directories, making them hard to maintain.
    *   **Solution:** Consolidated all related files for these systems into their own dedicated feature modules: `features/player`, `features/performance`, and `features/lighting`.
    *   **Impact:** The entire codebase now follows a consistent, feature-based organization, significantly improving modularity and developer experience.

2.  **Player Feature Module:**
    *   **Problem Resolved:** Player controls, mobile controls, and state were in separate locations.
    *   **Solution:** Grouped `Player.svelte`, `ThrelteMobileControls.svelte`, and `mobileInputStore.ts` into `features/player`.
    *   **Impact:** All code related to player control and input is now co-located.

3.  **Performance Feature Module:**
    *   **Problem Resolved:** Optimization logic, performance monitoring components, and utility functions were spread across five different directories.
    *   **Solution:** Created a comprehensive `features/performance` module containing the `OptimizationManager`, LOD systems, performance stores, and UI panels.
    *   **Impact:** Performance-related logic is now fully encapsulated and easier to manage.

### Previous Architectural Improvements (v5.1 & v5.0)
-   **Multiplayer & Conversation Modules:** Initiated the feature-based refactor by consolidating the `multiplayer` and `conversation` systems.
-   **Unified Conversation System:** Resolved architectural conflicts in the AI dialogue system, enabling reliable character interactions.
-   **Data Structure Harmonization:** Fixed data mismatches between different character personality types.

---

## File Structure

This reflects the fully refactored, feature-based architecture of the project.

```
src/
├── threlte/
│   ├── Game.svelte                         # Main game container
│   ├── core/                               # CORE, non-feature systems
│   │   ├── LevelManager.svelte
│   │   └── ...
│   ├── features/                           # ✨ FEATURE MODULES
│   │   ├── conversation/
│   │   ├── lighting/
│   │   ├── multiplayer/
│   │   ├── ocean/
│   │   ├── performance/
│   │   ├── player/
│   │   └── terrain/                        # ✨ NEW: Unified Terrain Feature
│   │       ├── index.ts                    # Public API for the terrain feature
│   │       ├── Terrain.svelte              # Main orchestrator component
│   │       ├── TerrainManager.ts           # Core logic (data loading, chunk management)
│   │       ├── terrainStore.ts             # Reactive state for terrain
│   │       ├── types.ts                    # All terrain-related types
│   │       └── components/
│   │           ├── TerrainChunk.svelte     # Renders a single visual chunk
│   │           └── TerrainCollider.svelte  # Creates the physics body from heightmap
│   ├── levels/
│   │   ├── HybridObservatory.svelte
│   │   └── SciFiRoom.svelte
│   └── ... (other shared folders: stores, systems, etc.)
```

---

## Architectural State & Recent Improvements

This section outlines the current state of the project and recent architectural improvements implemented to address technical debt and enhance system reliability.

### Current State
1.  **Modern Architecture:** The Threlte-based architecture implements comprehensive systems including unified conversation management, navigation, terrain, audio, event systems, and feature-based P2P multiplayer.
2.  **System Documentation:** All major systems are documented in this reference, including the newly unified conversation system, navigation systems, feature-based multiplayer components, and performance optimization components.
3.  **System Integration:** The codebase features seamless integration between ECS components, reactive Svelte stores, Threlte 3D systems, and self-contained feature modules.
4.  **Performance Optimization:** Multi-tiered optimization system with automatic quality scaling, memory management, and LOD systems.

### Recent Architectural Improvements (v5.1)

1.  **Feature-Based Architecture Implementation:**
    *   **Problem Resolved:** Scattered multiplayer code across multiple directories made maintenance difficult
    *   **Solution:** Consolidated all multiplayer functionality into a single, self-contained feature module
    *   **Impact:** Improved code organization, easier maintenance, and cleaner import structure

2.  **Barrel File Export System:**
    *   **Problem Resolved:** Complex import paths and tight coupling between modules
    *   **Solution:** Implemented centralized barrel file exports for the multiplayer feature
    *   **Impact:** Clean, maintainable imports and loose coupling between feature modules

3.  **Multiplayer Store Consolidation:**
    *   **Problem Resolved:** Multiplayer-related stores scattered across the general stores directory
    *   **Solution:** Moved `multiplayerStore`, `chatStore`, `playerNameStore`, and `logStore` into the multiplayer feature module
    *   **Impact:** True feature isolation with all related functionality self-contained

### Previous Architectural Improvements (v5.0)

1.  **Unified Conversation System:**
    *   **Problem Resolved:** Eliminated conflicting conversation dialog systems that prevented AI interactions
    *   **Solution:** Single store-based conversation architecture with unified state management
    *   **Impact:** Firefly AI conversations now work reliably with proper character data flow

2.  **Data Structure Harmonization:**
    *   **Problem Resolved:** Fixed mismatch between `FireflyPersonality` (flat) and `NPCPersonality` (nested) structures
    *   **Solution:** Added automatic data conversion layer in `CharacterRegistry.convertToNPCPersonality()`
    *   **Impact:** AI memory management now receives properly structured character data

3.  **Case-Insensitive Character Loading:**
    *   **Problem Resolved:** Character files failed to load due to case sensitivity issues
    *   **Solution:** Implemented robust case-insensitive ID normalization
    *   **Impact:** Character loading is now reliable regardless of ID casing

### Architectural Strengths

1.  **AI Conversation System:**
    *   **Implementation:** Multi-character AI system with unified store-based architecture and advanced memory management
    *   **Features:** Interactive dialogue system with proper character personality integration and real-time UI updates
    *   **Technology:** Auto-discovery character system, store-based state management, smart memory decision logic, data conversion layer

2.  **Navigation System:**
    *   **Implementation:** 3D interactive field with raycasting-based interaction, timeline integration, and level transitions
    *   **Features:** Interactive exploration with procedural generation and mobile optimization
    *   **Technology:** Instanced mesh rendering, performance-scaled LOD, responsive touch controls

3.  **Performance Management:**
    *   **Implementation:** Comprehensive optimization system with terrain collision, audio management, and event bus architecture
    *   **Features:** Scalable performance across desktop and mobile devices with automatic quality adjustment
    *   **Technology:** Multi-level LOD, memory pooling, chunk-based streaming, reactive performance monitoring

4.  **Feature-Based Multiplayer System:**
    *   **Implementation:** Self-contained multiplayer feature module with comprehensive P2P networking
    *   **Features:** Complete multiplayer functionality organized in a single feature directory
    *   **Technology:** PeerJS networking, barrel file exports, modular store architecture, integrated UI components

### Architecture Extensibility

1.  **Level System:**
    *   **Framework:** Established navigation and conversation systems support additional environments
    *   **Capability:** Modular level creation using existing architectural patterns

2.  **Character System:**
    *   **Framework:** Dynamic character relationships with automatic data conversion and cross-character memory references
    *   **Capability:** Expandable dialogue system with shared experience tracking and robust character loading

3.  **Audio Integration:**
    *   **Framework:** Spatial audio integration with conversation and environmental systems
    *   **Capability:** Responsive audio architecture for interactive experiences

4.  **Feature Module System:**
    *   **Framework:** Feature-based architecture supports adding new domain-specific functionality
    *   **Capability:** Easy addition of new features with self-contained components, services, stores, and UI

---

## File Structure

This reflects the current file structure of the project, updated to show the new feature-based architecture.

```
src/
├── threlte/
│   ├── Game.svelte                         # Main game container
│   ├── components/
│   │   ├── OceanComponent.svelte           # Modern ocean system
│   │   ├── LightingComponent.svelte        # Dynamic lighting system
│   │   ├── HybridFireflyComponent.svelte   # ECS-based particle system with AI integration
│   │   ├── NaturePackVegetation.svelte     # Vegetation assets
│   │   ├── LevelTransitionHandler.svelte   # Level transition management
│   │   ├── StarInteractionComponent.svelte # Star interaction system
│   │   ├── StarNavigationSystem.svelte     # Navigation between star locations
│   │   ├── StarSprite.svelte               # Individual star rendering
│   │   ├── TerrainCollider.svelte          # Terrain collision detection
│   │   └── VegetationSystem.svelte         # Vegetation management system
│   ├── controls/
│   │   └── ThrelteMobileControls.svelte    # Mobile touch controls
│   ├── core/
│   │   ├── LevelManager.svelte             # Central level management system
│   │   ├── LevelSystem.ts                  # Component registry and messaging
│   │   ├── ECSIntegration.ts               # BitECS integration
│   │   └── StyleManager.ts                 # Global style coordination
│   ├── effects/
│   │   ├── UnderwaterCollider.svelte       # Underwater collision detection
│   │   ├── UnderwaterEffect.svelte         # Underwater visual effects
│   │   └── UnderwaterOverlay.svelte        # Screen overlay for underwater tint
│   ├── features/                           # ✨ NEW: Feature-based architecture
│   │   ├── multiplayer/                    # Self-contained multiplayer feature
│   │   │   ├── index.ts                    # Barrel file for clean imports
│   │   │   ├── components/
│   │   │   │   ├── MultiplayerManager.svelte   # Multiplayer avatar coordination
│   │   │   │   ├── PlayerAvatar.svelte         # Dedicated player firefly avatar  
│   │   │   │   └── RemotePlayerAvatar.svelte   # Remote player representation
│   │   │   ├── services/
│   │   │   │   └── MultiplayerService.ts       # P2P networking and communication
│   │   │   ├── stores/
│   │   │   │   ├── multiplayerStore.ts         # P2P multiplayer state
│   │   │   │   ├── chatStore.ts                # Chat message history
│   │   │   │   ├── playerNameStore.ts          # Player name management
│   │   │   │   └── logStore.ts                 # Multiplayer event logging
│   │   │   └── ui/
│   │   │       ├── MultiplayerControls.svelte  # Multiplayer connection controls
│   │   │       ├── ChatBox.svelte              # Real-time text chat interface
│   │   │       ├── HostPanel.svelte            # Host management interface
│   │   │       └── LogTerminal.svelte          # Event log display
│   │   ├── player/                         # Player-specific functionality
│   │   │   └── Player.svelte               # First-person controller
│   │   └── conversation/                   # Unified conversation system
│   │       ├── ConversationDialog.svelte   # Store-based UI for dialogue interactions
│   │       ├── ConversationManager.ts      # Core dialogue flow orchestration
│   │       ├── MemoryManagerAgent.ts       # AI-driven conversation memory
│   │       ├── README.md                   # Conversation system documentation
│   │       ├── conversationStores.ts       # Reactive conversation state management
│   │       ├── index.ts                    # System exports
│   │       ├── types.ts                    # Conversation type definitions
│   │       ├── worldKnowledge.ts           # Game world knowledge base
│   │       └── characters/                 # Character definitions and registry
│   │           ├── CharacterComponent.ts    # Base character component
│   │           ├── CharacterRegistry.ts     # Character database with data conversion
│   │           ├── index.ts                # Character system exports
│   │           ├── types.ts                # Character type definitions
│   │           └── definitions/            # Individual character definitions
│   │               ├── character-a.ts      # Character definition example
│   │               ├── character-b.ts      # Character definition example
│   │               ├── character-c.ts      # Character definition example
│   │               ├── character-d.ts      # Character definition example
│   │               ├── character-e.ts      # Character definition example
│   │               ├── character-f.ts      # Character definition example
│   │               ├── character-g.ts      # Character definition example
│   │               ├── primary-npc.ts      # Primary NPC character
│   │               ├── character-h.ts      # Character definition example
│   │               └── character-i.ts      # Character definition example
│   ├── levels/
│   │   ├── HybridObservatory.svelte        # Primary observatory level
│   │   └── SciFiRoom.svelte                # Secondary sci-fi environment
│   ├── optimization/
│   │   └── OptimizationManager.ts          # Performance settings management
│   ├── services/
│   │   └── TimelineDataService.ts          # Timeline and narrative data management
│   ├── stores/
│   │   ├── gameStateStore.ts               # Core reactive game state
│   │   ├── underwaterStore.ts              # Underwater effects state
│   │   ├── mobileInputStore.ts             # Mobile controls state
│   │   ├── performanceStore.ts             # Performance metrics store
│   │   ├── postProcessingStore.ts          # Post-processing state
│   │   ├── hostStore.ts                    # Host session management
│   │   └── uiStore.ts                      # UI state management
│   ├── styles/
│   │   ├── GhibliStyleSystem.svelte        # Main toon shading and post-processing
│   │   └── StylePalettes.ts                # Color palettes and utility functions
│   ├── systems/
│   │   ├── SpawnSystem.svelte              # ECS entity spawning system
│   │   ├── Physics.svelte                  # Physics world setup
│   │   ├── LOD.svelte                      # Level-of-Detail system
│   │   ├── AssetLoader.svelte              # Asset loading and management
│   │   ├── Audio.svelte                    # Audio system management
│   │   ├── EventBus.svelte                 # Cross-system event communication
│   │   ├── InteractionSystem.svelte        # Enhanced interaction management
│   │   ├── Optimization.svelte             # Runtime optimization system
│   │   ├── Performance.svelte              # Performance monitoring
│   │   ├── Renderer.svelte                 # Custom rendering pipeline
│   │   ├── SimplePostProcessing.svelte     # Basic post-processing effects
│   │   ├── Skybox.svelte                   # Sky rendering system
│   │   ├── NavigationField.svelte          # Interactive field and navigation
│   │   ├── StaticEnvironment.svelte        # Static world objects
│   │   ├── TerrainSystem.ts                # Terrain generation and management
│   │   └── Time.svelte                     # Game time management
│   ├── tests/
│   │   ├── PerformanceBenchmark.svelte     # Performance testing component
│   │   └── validate-performance.ts         # Performance validation utilities
│   ├── ui/
│   │   ├── PerformancePanel.svelte         # Debug performance info
│   │   ├── StyleControls.svelte            # Visual style testing interface
│   │   ├── MobileEnhancements.svelte       # Mobile-specific UI improvements
│   │   ├── TimelineCard.svelte             # Timeline/narrative UI component
│   │   ├── SettingsButton.svelte           # Settings menu trigger
│   │   └── SettingsPanel.svelte            # Unified settings interface
│   └── utils/
│       ├── lodUtils.ts                     # LOD utility functions
│       ├── materialUtils.ts                # Material and shader utilities
│       ├── performanceUtils.ts             # Performance measurement tools
│       └── HeightmapCache.ts               # Terrain heightmap caching
```

---

## Core Systems

### Level Management System
A professional-grade level management system (`core/LevelManager.svelte`, `core/LevelSystem.ts`) based on Unity/Unreal patterns. It provides event-driven communication between different game systems with standardized level lifecycle management.

### Hybrid ECS Architecture
The project correctly uses a hybrid ECS architecture with **BitECS** for performance-critical systems like particles and vegetation, while using declarative **Svelte/Threlte** components for scene composition and UI. This is a solid foundation.

### ECS Spawn System
A robust, queue-based spawn system (`systems/SpawnSystem.svelte`) that handles physics-safe spawning for entities, prevents duplicates, and supports expansion for NPCs and items.

### Unified Conversation System
A comprehensive AI-driven conversation system that provides interactive character dialogues with advanced memory management. The system has been unified to use a single store-based architecture for reliable character interactions.

**Key Features:**
- **Unified Architecture**: Single store-based conversation system eliminates conflicts and ensures reliable UI updates
- **Data Conversion Layer**: Automatic transformation between `FireflyPersonality` and `NPCPersonality` formats
- **Case-Insensitive Loading**: Robust character loading that handles various ID formats and casing
- **Multi-Agent Memory Management**: Intelligent memory orchestration with compression and retrieval
- **Auto-Discovery Character System**: New characters are automatically available by creating a single file
- **ECS Integration**: Clean component-based architecture that integrates seamlessly with the game's ECS system

### Player Control System
The system provides modern first-person controls via `features/player/Player.svelte`. Mobile controls have been separated into `controls/ThrelteMobileControls.svelte`, which is a good separation of concerns.

### Feature-Based Multiplayer System

A comprehensive peer-to-peer multiplayer system organized as a self-contained feature module that enables real-time communication and shared gameplay experiences without requiring dedicated servers.

**Feature Architecture:**
```typescript
// Clean barrel file imports
import { 
  MultiplayerManager,
  PlayerAvatar,
  RemotePlayerAvatar,
  MultiplayerService,
  multiplayerStore,
  chatStore,
  playerNameStore,
  logStore,
  MultiplayerControls,
  ChatBox,
  HostPanel,
  LogTerminal
} from './features/multiplayer';
```

**Self-Contained Structure:**
- **Components**: MultiplayerManager, PlayerAvatar, RemotePlayerAvatar
- **Services**: Unified MultiplayerService with P2P networking
- **Stores**: All multiplayer-related state management (multiplayer, chat, player names, logs)
- **UI**: Complete user interface suite (controls, chat, host panel, logging)
- **Barrel Exports**: Centralized, clean import system

**Architecture Benefits:**
- **Complete Feature Isolation**: All multiplayer functionality contained in one directory
- **Clean Imports**: Barrel file eliminates complex import paths
- **Maintainable Code**: Related functionality grouped together
- **Scalable Design**: Easy to add new multiplayer features
- **Reduced Coupling**: Clear boundaries between feature modules

**Technical Implementation:**
- **P2P Networking**: Built on PeerJS for direct browser-to-browser communication
- **Host-Client Model**: Star network topology with one player acting as host
- **Real-time Synchronization**: Position updates and chat messages at 10fps
- **Visual Player Representation**: Remote players appear as distinctive blue firefly avatars
- **Room Directory**: Cloudflare Worker (`cloudflare-worker/src/index.ts`) handles room registration/lookup; clients join via `?room=<roomName>`

**Room Directory Implementation:**
The multiplayer system uses a Cloudflare Worker as a lightweight room directory service:

```typescript
// Room registration (POST /register)
await fetch(WORKER_URL + '/register', {
  method: 'POST',
  body: JSON.stringify({ roomName: 'my-room', hostId: 'host123' })
})

// Room lookup (GET /lookup/room-name)  
const response = await fetch(WORKER_URL + '/lookup/my-room')
const { roomName, hostId } = await response.json()

// Join flow: Game.svelte reads ?room=<name> URL parameter
const urlParams = new URLSearchParams(window.location.search)
const roomName = urlParams.get('room')
if (roomName) {
  // Lookup room and attempt to connect to host
}
```

**Room Directory Features:**
- **6-hour TTL**: Rooms automatically expire after 6 hours of inactivity
- **CORS Support**: Cross-origin requests enabled for browser clients
- **Error Handling**: Graceful handling of room not found scenarios
- **Human-readable Names**: Support for descriptive room names like 'game-night' or 'test-session'

**Key Features:**
- **Real-time Chat**: Text-based communication with timestamps and player identification
- **Player Avatars**: Remote players rendered as bright blue fireflies with pulsing light emission
- **Host Management**: Comprehensive hosting interface with room registration
- **Event Logging**: Real-time multiplayer event tracking and debugging
- **Mobile Support**: Touch-friendly interface with responsive design

### State Management
The game has correctly migrated to a modern, reactive state management system using **Svelte Stores**. Core game stores remain in the central `stores/` directory, while feature-specific stores are organized within their respective feature modules.

---

## Component & System Reference

This section provides detailed technical specifications for all major components and systems, serving as a practical reference for developers working with these systems.

### HybridFireflyComponent

**Description:** The single source of truth for the firefly particle system. It uses BitECS for high-performance simulation and integrates with the lighting system and AI conversation system.

**Props:**
```typescript
interface FireflyProps {
  count: number                    // Number of fireflies (default: 100)
  colors: number[]                // A palette of colors for the fireflies
  emissiveIntensity: number       // Material emissive strength (default: 15.0)
  lightIntensity: number          // Point light intensity (default: 50.0)
  lightRange: number              // Light falloff distance (default: 500)
  cycleDuration: number           // Light cycle time in seconds (default: 24.0)
  fadeSpeed: number               // Fade transition speed (default: 4.0)
  heightRange: { min: number; max: number }  // Y position range
  radius: number                  // Distribution radius (default: 180)
  size: number                    // Firefly sphere size (default: 0.015)
  pointSize: number               // Visual glow size (default: 25.0)
  movement: {
    speed: number                 // Animation speed (default: 0.01)
    wanderSpeed: number          // Wandering speed (default: 0.002)
    wanderRadius: number         // Wander distance (default: 4)
    floatAmplitude: Vector3      // Floating motion range
    lerpFactor: number           // Position interpolation factor
  }
  enableAIConversations: boolean  // Enable AI-powered conversations
  conversationChance: number     // Percentage of fireflies that are conversational (0.0 - 1.0)
  getHeightAt?: (x: number, z: number) => number  // Terrain height function
}
```

**API Methods:**
```typescript
// External control interface
export function setIntensity(intensity: number): void
export function setEmotionalState(wonder: number, melancholy: number, hope: number, discovery: number): void
export function triggerDiscovery(): void
export function getStats(): FireflyStats
export function getActiveLights(): ActiveLight[]
```

**AI Integration:**
The component now integrates directly with the unified conversation system, automatically assigning AI characters to a percentage of fireflies based on the `conversationChance` prop. Character data is converted from `FireflyPersonality` to `NPCPersonality` format for seamless AI interaction.

### OceanComponent

**Description:** Modular water system with real-time lighting integration and shader-based wave animation.

**Props:**
```typescript
interface OceanProps {
  size: { width: number; height: number }  // Water plane dimensions
  color: number                            // Base water color (default: 0x006994)
  opacity: number                          // Water transparency (default: 0.95)
  position: [number, number, number]       // World position
  segments: { width: number; height: number }  // Geometry resolution
  enableAnimation: boolean                 // Enable wave animation
  animationSpeed: number                   // Animation time multiplier (default: 0.1)
}
```

**Shader Integration:**
- **Vertex Displacement:** Real-time wave geometry
- **Fragment Lighting:** Integration with firefly point lights
- **Normal Mapping:** Surface detail for realistic lighting
- **Reflection System:** Real-time reflection of environment lights

### LightingComponent

**Description:** Multi-light environmental lighting system that coordinates with dynamic light sources.

**Key Responsibilities:**
* Managing ambient and directional lighting
* Integrating with dynamic point lights from firefly system
* Handling light intensity scaling based on performance settings
* Coordinating with post-processing effects

### Unified Conversation Architecture

**Description:** The unified conversation system provides reliable AI-driven dialogue flow with advanced memory management, character state persistence, and seamless UI integration. This system has been completely refactored to eliminate architectural conflicts and ensure proper data flow.

**Architecture Components:**

1. **Store-Based State Management (`conversationStores.ts`)**:
```typescript
// Core conversation management via reactive stores
export const conversationActions = {
  async startConversation(npcId: string, personality: NPCPersonality, context: any): Promise<ConversationSession>
  async sendMessage(message: string): Promise<void>
  async endConversation(): Promise<void>
  startReadOnlyConversation(npcId: string, personality: any, message: string, duration?: number): void
}

// Reactive state stores
export const activeConversationSession: Writable<ConversationSession | null>
export const conversationUIState: Writable<ConversationUIState>
export const isConversationActive: Derived<boolean>
```

2. **Character Data Conversion (`CharacterRegistry.ts`)**:
```typescript
// Automatic data structure conversion
export class CharacterRegistry {
  convertToNPCPersonality(character: CharacterDefinition): NPCPersonality {
    // Converts FireflyPersonality (flat) → NPCPersonality (nested)
    return {
      personality: {
        core: firefly.core,        // flat → nested
        traits: firefly.traits,
        // ... other mappings
      }
      // ... complete structure transformation
    }
  }
  
  // Case-insensitive character loading
  private normalizeId(characterId: string): string {
    return characterId.toLowerCase() // + additional normalization
  }
}
```

3. **UI Integration (`ConversationDialog.svelte`)**:
```typescript
// Single dialog component connected to stores
{#if $isConversationActive}
  <ConversationDialog
    visible={$conversationUIState.isVisible}
    position={$conversationUIState.position}
    on:close={() => conversationActions.endConversation()}
  />
{/if}
```

**Key Architectural Improvements:**
- **Single Source of Truth**: Only store-based system active, eliminates state conflicts
- **Automatic Data Conversion**: Seamless transformation between character formats
- **Case-Insensitive Loading**: Robust character ID handling
- **Real-time UI Updates**: Reactive store integration ensures immediate dialog response
- **Memory Management Integration**: Proper personality data flow to MemoryManagerAgent

**Integration Points:**
- **HybridFireflyComponent**: Uses `conversationActions.startConversation()` directly
- **CharacterRegistry**: Provides data conversion and character loading
- **MemoryManagerAgent**: Receives properly formatted `NPCPersonality` data
- **Level Components**: No longer need to manage ConversationManager instances

### Navigation System

**Description:** Comprehensive ECS-based navigation system that manages interactive field elements, timeline integration, and level transitions. Provides the bridge between visual elements and game progression mechanics.

**Core Components:**
- **NavigationSystem**: Central coordinator for interactive elements and timeline functionality
- **InteractionComponent**: Handles raycast-based selection and 3D interaction detection  
- **InteractiveField**: Generates the visual field with both timeline events and procedural elements
- **InteractiveSprite**: Individual element rendering with instanced mesh optimization

**Key Features:**
* **3D Raycasting**: Precise element selection using Three.js raycasting with instanced meshes
* **Timeline Integration**: Interactive elements represent timeline events with rich metadata
* **Level Transition System**: Elements can trigger navigation to different game levels
* **Procedural Generation**: Background elements generated procedurally for immersive environment
* **Mobile Optimization**: Touch-friendly interaction system with responsive UI elements
* **Real-time Analytics**: Tracks interactions and player progression metrics

**API:**
```typescript
// Core navigation control
export function selectElementById(elementId: string): boolean
export function clearSelection(): void
export function getSelectedElement(): InteractiveElementData | null
export function setSystemActive(active: boolean): void

// Event handling
export interface NavigationEvents {
  elementSelected: { element: InteractiveElementData, timestamp: number, source: string }
  elementDeselected: { timestamp: number, source: string }  
  levelTransition: { levelType: string, fromElement: InteractiveElementData }
  elementInteraction: { element: InteractiveElementData, screenPosition: Vector2, worldPosition: Vector3 }
}

// Interactive element data structure
export interface InteractiveElementData {
  uniqueId: string
  title: string
  description: string
  timelineYear?: number
  timelineEra?: string
  timelineLocation?: string
  isKeyEvent: boolean
  isLevel: boolean
  levelId?: string
  tags: string[]
  category: string
  clickable: boolean
  hoverable: boolean
  unlocked: boolean
}
```

### Audio System

**Description:** Reactive audio management system built on Howler.js that provides spatial audio, dynamic volume control, and performance-optimized sound loading.

**Key Features:**
* **Howler.js Integration**: Professional-grade web audio with fallbacks and cross-browser compatibility
* **Spatial Audio**: 3D positional audio with distance-based attenuation
* **Performance Optimized**: Disabled by default, on-demand loading, memory management
* **Dynamic Volume Control**: Master volume control with individual sound scaling
* **Error Handling**: Graceful fallbacks when audio context is blocked or unavailable

**API:**
```typescript
// Core audio management
export class SimpleAudioManager {
  async initialize(): Promise<void>
  setMasterVolume(volume: number): void
  getMasterVolume(): number
  loadSound(id: string, src: string | string[], options?: AudioOptions): Howl
  playSound(id: string, options?: PlayOptions): number | null
  stopSound(id: string): void
  pauseSound(id: string): void
  resumeSound(id: string): void
}

// Configuration options
interface AudioOptions {
  volume?: number         // Individual sound volume (0-1)
  loop?: boolean         // Whether to loop the sound
  spatial?: boolean      // Enable 3D spatial audio
  preload?: boolean      // Preload the audio file
}
```

### EventBus System

**Description:** Centralized event communication system that bridges Threlte components with reactive Svelte stores for cross-system messaging.

**Key Features:**
* **Reactive Store Integration**: Connects event system with Svelte's reactive stores
* **Type-Safe Events**: Strongly typed event system with error handling
* **Component Bridge**: Links Threlte 3D components with Svelte UI components
* **Event Pooling**: Memory-efficient event listener management
* **Error Boundaries**: Isolated error handling prevents event system crashes

**API:**
```typescript
// Core event bus interface
export class SimpleEventBus {
  on(event: string, callback: (data?: any) => void): void
  off(event: string, callback: (data?: any) => void): void
  emit(event: string, data?: any): void
  clear(): void
  getListenerCount(event?: string): number
}

// Reactive store exports
export const gameStateStore: Writable<any>
export const levelTransitionStore: Writable<any>
export const interactionStore: Writable<any>
export const errorStore: Writable<any>
```

### Unified Terrain Feature

**Description:** A professional, feature-based terrain system that consolidates four previously conflicting terrain systems into a single, unified architecture. The system provides scalable, performant, and visually detailed environments built on a "single source of truth" philosophy, where a pre-baked heightmap image drives both physics simulation and visual LOD management, while chunked 3D models provide detailed visuals.

**Architecture Consolidation:**
The unified terrain feature consolidates logic from multiple previous systems:
- **HeightmapCache.ts** → `TerrainManager.generateFromImage()` - Image-based height data generation
- **TerrainCollider.svelte** → `TerrainManager.getHeightAt()` - Bilinear interpolation for smooth physics
- **TerrainManager.svelte** → `TerrainManager.getVisibleChunks()` - Player-based chunk visibility and LOD calculations  
- **TerrainSystem.ts** → `TerrainManager.resolutionMapping` - Performance-based optimization levels

**Content Pipeline (Offline Tools):**
The terrain system relies on an offline content pipeline managed by the tools in the `/tools` directory:

* **`tools/app.js`**: Web-based UI for terrain processing with enhanced mesh quality controls
* **`tools/levelprocessor/simplified-processor.js`**: Standalone Python-based GLB processor using trimesh
* **`tools/unified-terrain-pipeline.js`**: Complete pipeline orchestrator

**Processing Steps:**
1. **Source GLB Processing**: Input terrain model is chunked into a configurable grid (e.g., 4x4 chunks)
2. **LOD Generation**: Each chunk generates multiple detail levels using quadratic decimation  
3. **Mesh Quality Enhancement**: Optional safe normal recalculation using `unmerge_vertices()` + `vertex_normals`
4. **Heightmap Baking**: Generates grayscale PNG from mesh geometry for physics collision
5. **File Organization**: Outputs organized chunk files with consistent naming: `chunk_{x}_{z}_LOD{level}.glb`

**Runtime Architecture (Feature Module):**
The entire runtime system is encapsulated within `src/threlte/features/terrain/` with a clean barrel export pattern:

* **`Terrain.svelte`**: Main orchestrator component with reactive chunk management and race condition fixes
* **`TerrainManager.ts`**: Core consolidated logic class with bilinear interpolation physics and LOD calculations
* **`terrainStore.ts`**: Reactive Svelte store for terrain state management
* **`components/TerrainCollider.svelte`**: Simplified collider component receiving pre-processed height data
* **`components/TerrainChunk.svelte`**: Streamlined chunk renderer with fixed coordinate system consistency
* **`index.ts`**: Barrel file providing clean public API for the feature

**Technical Improvements:**
- **Race Condition Resolution**: Fixed chunks not appearing by making `visibleChunks` reactive to `terrainStore` state
- **Coordinate System Consistency**: Resolved Y vs Z naming conflicts throughout the pipeline  
- **Double Transformation Fix**: Eliminated chunk positioning conflicts between level processor and game engine
- **Performance Optimization**: Dynamic resolution adjustment based on optimization levels
- **Memory Management**: Efficient Float32Array height data with automatic cleanup

**Usage in a Level (`HybridObservatory.svelte`):**

Note: In production, these values are sourced from the generated manifest (`public/terrain/observatory-environment.manifest.json`) and heightmap config.

```typescript
<script lang="ts">
  import { Terrain, type TerrainConfig } from '../features/terrain'

  const terrainConfig: TerrainConfig = {
    heightmapUrl: '/terrain/heightmaps/observatory-environment_heightmap.png',
    worldSize: 393.5526885986328,  // from manifest.physics.worldSize
    minHeight: -1.8438290357589722, // from heightmap config (heightOffset)
    maxHeight: 56.307861328125,     // heightOffset + heightScale
    chunkPathTemplate: '/terrain/levels/observatory-environment/chunk_{x}_{z}_LOD{lod}.glb',
    chunkSize: 98.3881721496582,    // from manifest.physics.chunkSize  
    gridSize: [4, 4],               // from manifest.physics.gridX/gridY
    lods: [
      { level: 0, distance: 1000 }
    ]
  }
</script>

<Terrain 
  config={terrainConfig} 
  on:terrainReady={() => console.log('🏔️ Terrain ready for player spawn')}
/>
```

**Performance Features:**
- **Automatic LOD Switching**: Distance-based Level of Detail switching for optimal performance
- **Chunk Culling**: Only visible chunks are loaded and rendered based on player position
- **Adaptive Resolution**: Heightmap resolution scales with performance optimization levels
- **Memory Efficient**: Single physics collider for entire terrain, minimal memory footprint

### OptimizationManager

**Description:** Central performance management system that automatically adjusts quality settings based on device capabilities and runtime performance. This system provides comprehensive performance scaling across all game components including firefly lighting, ocean rendering, vegetation density, and terrain detail.

**Optimization Levels:**
```typescript
enum OptimizationLevel {
  ULTRA_LOW = 'ultra_low',    // Emergency fallback for very low-end devices
  LOW = 'low',                // Minimal visual effects, maximum performance
  MEDIUM = 'medium',          // Balanced performance and quality
  HIGH = 'high',              // High quality with good performance
  ULTRA = 'ultra'             // Maximum quality for high-end devices
}
```

**Quality Settings by Level:**
```typescript
interface QualitySettings {
  // Firefly system settings
  maxFireflyLights: number           // 5-25 based on level
  fireflyCount: number               // 40-100 based on level
  
  // Ocean rendering settings
  oceanSegments: { width: number; height: number }  // 32x32 to 128x128
  enableReflections: boolean         // Disabled on LOW and below
  enableRefractions: boolean         // Disabled on MEDIUM and below
  
  // Visual effects settings
  enableProceduralTextures: boolean // Disabled on ULTRA_LOW
  enableNormalMaps: boolean          // Disabled on LOW and below
  enablePostProcessing: boolean      // Disabled on ULTRA_LOW
  
  // Terrain settings
  terrainResolution: number          // 64x64 to 256x256 samples
  vegetationDensity: number          // 0.3 to 1.0 multiplier
  
  // Performance targets
  targetFrameRate: number            // 20-60 fps based on level
  enableAdaptiveQuality: boolean     // Auto-adjustment based on performance
}
```

**Auto-Detection Algorithm:**
```typescript
// Device capability detection
interface DeviceCapabilities {
  gpuTier: 'low' | 'medium' | 'high'    // Based on WebGL renderer info
  memoryEstimate: number                 // Estimated VRAM in MB
  isMobile: boolean                      // Mobile device detection
  supportedExtensions: string[]          // WebGL extensions
  maxTextureSize: number                 // Maximum texture resolution
}

// Performance-based auto-adjustment
interface PerformanceMetrics {
  averageFrameTime: number              // Rolling average of frame times
  memoryUsage: number                   // Estimated memory usage
  frameDropCount: number                // Count of missed frames
  gpuUtilization: number                // Estimated GPU load
}
```

**API Methods:**
```typescript
// Core optimization interface
export class OptimizationManager {
  static getInstance(): OptimizationManager
  
  // Quality management
  getQualitySettings(): QualitySettings
  getOptimizationLevel(): OptimizationLevel
  setOptimizationLevel(level: OptimizationLevel): void
  
  // Auto-detection and adjustment
  detectOptimalLevel(): OptimizationLevel
  enableAutoAdjustment(enabled: boolean): void
  updatePerformanceMetrics(metrics: PerformanceMetrics): void
  
  // Component integration
  registerComponent(component: OptimizedComponent): void
  notifyQualityChange(newLevel: OptimizationLevel): void
  
  // Performance monitoring
  getPerformanceStats(): PerformanceStats
  getFrameTimeHistory(): number[]
  isPerformanceTargetMet(): boolean
}

// Component integration interface
interface OptimizedComponent {
  id: string
  applyQualitySettings(settings: QualitySettings): void
  getPerformanceImpact(): number
}
```

**Integration Examples:**
```typescript
// Firefly component integration
export class HybridFireflyComponent implements OptimizedComponent {
  applyQualitySettings(settings: QualitySettings): void {
    this.maxLights = settings.maxFireflyLights
    this.count = settings.fireflyCount
    this.updateInstancedMesh()
  }
}

// Ocean component integration
export class OceanComponent implements OptimizedComponent {
  applyQualitySettings(settings: QualitySettings): void {
    this.segments = settings.oceanSegments
    this.enableReflections = settings.enableReflections
    this.enableRefractions = settings.enableRefractions
    this.recreateGeometry()
  }
}
```

**Performance Monitoring:**
- **Real-time FPS tracking**: Continuous frame time measurement with rolling averages
- **Memory usage estimation**: Tracks texture and geometry memory usage
- **Automatic quality adjustment**: Reduces quality when performance targets are missed
- **Component performance profiling**: Individual system performance impact tracking

### Player

**Description:** Core first-person controller component that handles user input, movement physics, and camera controls. Serves as the primary interface between player actions and the game world.

**Location:** `features/player/Player.svelte` (organized within the player feature module)

**Key Features:**
* **First-Person Controls**: WASD movement with mouse look camera
* **Physics Integration**: Rapier3D physics for realistic movement and collision
* **Mobile Support**: Touch controls integration for cross-platform compatibility
* **Multiplayer Integration**: Position updates sent to multiplayer system via barrel imports
* **Configurable Movement**: Adjustable speed, jump force, and physics parameters

**Props:**
```typescript
interface PlayerProps {
  speed?: number              // Movement speed (default: 5.0)
  jumpForce?: number          // Jump strength (default: 8.0)
  enableJump?: boolean        // Enable/disable jumping (default: true)
  sensitivity?: number        // Mouse look sensitivity (default: 0.002)
  enableMobileControls?: boolean  // Enable touch controls (default: auto-detect)
}
```

**Key Responsibilities:**
* **Input Handling**: Processes keyboard (WASD, Space) and mouse input for movement
* **Physics Movement**: Applies forces to Rapier physics body for realistic movement
* **Camera Control**: Manages first-person camera rotation and position
* **Multiplayer Updates**: Sends position data to MultiplayerService for synchronization using clean imports
* **Mobile Adaptation**: Seamlessly switches to touch controls on mobile devices

**Integration Points:**
```typescript
// Clean multiplayer integration via barrel imports
import { multiplayerStore, sendPlayerUpdate } from '../multiplayer';

// Multiplayer position synchronization
export function sendPlayerUpdate(): void {
  if (multiplayerService.isConnected()) {
    multiplayerService.sendPlayerUpdate({
      position: [player.position.x, player.position.y, player.position.z]
    })
  }
}

// Physics integration
export function applyMovement(direction: Vector3): void {
  if (rigidBody) {
    rigidBody.applyImpulse(direction.multiplyScalar(speed), true)
  }
}
```

**Performance Considerations:**
- **Throttled Updates**: Position updates limited to 10fps for multiplayer
- **Input Debouncing**: Smooth input handling prevents frame rate spikes
- **LOD Integration**: Player movement triggers LOD updates for nearby objects
- **Memory Efficient**: Minimal memory footprint with object pooling for vectors

### PlayerAvatar

**Description:** Self-contained firefly avatar component designed for multiplayer player representation. Uses StarSprite technology with integrated lighting and physics-ready design.

**Location:** `features/multiplayer/components/PlayerAvatar.svelte`

**Key Features:**
* **Hardcoded Appearance**: Consistent blue firefly appearance (0x00BFFF) across all players
* **Integrated Lighting**: Built-in pulsing light emission without external dependencies
* **Self-Contained**: No external imports required, preventing dependency conflicts
* **Physics-Ready**: Compatible with Threlte AutoColliders for collision detection

**Technical Implementation:**
```typescript
// Hardcoded appearance values
const playerColor = 0x00BFFF;        // Bright blue color
const playerSize = 0.15;             // Fixed size for consistency
const playerIntensity = 2.0;         // High intensity for visibility
const pulseSpeed = 2.0;              // Pulsing animation speed
const pulseRange = 0.6;              // Intensity variation range
```

**Props:**
```typescript
interface PlayerAvatarProps {
  position: [number, number, number]  // World position (required)
  // All other appearance properties are hardcoded for consistency
}
```

**Lighting System:**
- **Integrated Point Light**: Built-in Three.js PointLight with blue emission
- **Pulsing Animation**: Sine wave-based intensity modulation
- **Performance Optimized**: Single light source per avatar
- **Render Order**: Proper depth sorting for correct rendering

**Usage in Multiplayer:**
```svelte
<!-- Local player representation -->
<PlayerAvatar position={$multiplayerStore.localPosition} />

<!-- Remote player representation -->
{#each Object.values($multiplayerStore.players) as player}
  <PlayerAvatar position={player.position} />
{/each}
```

### RemotePlayerAvatar

**Description:** Physics-enabled wrapper for remote player representation in multiplayer games. Combines PlayerAvatar visual representation with collision detection capabilities.

**Location:** `features/multiplayer/components/RemotePlayerAvatar.svelte`

**Key Features:**
* **Physics Integration**: Uses Threlte AutoColliders for capsule collision
* **Visual Consistency**: Uses PlayerAvatar component for consistent appearance
* **Collision Detection**: Remote players have physical presence in the world
* **Performance Optimized**: Minimal overhead wrapper design

**Technical Implementation:**
```typescript
interface RemotePlayerAvatarProps {
  position: [number, number, number]  // Remote player world position
}
```

**Physics Configuration:**
```svelte
<T.Group {position}>
  <AutoColliders shape={'capsule'}>
    <PlayerAvatar {position} />
  </AutoColliders>
</T.Group>
```

**Collision Properties:**
- **Capsule Shape**: Standard humanoid collision approximation
- **Non-Interactive**: Remote players don't affect local physics simulation
- **Proper Positioning**: Collision shape matches visual representation
- **Performance**: Lightweight collision detection suitable for multiple players

**Integration with Multiplayer System:**
```svelte
<!-- In Game.svelte or MultiplayerManager.svelte -->
{#each Object.entries($multiplayerStore.players) as [playerId, playerState]}
  <RemotePlayerAvatar position={playerState.position} />
{/each}
```

---

## Feature Implementation

### Feature-Based Architecture

**Implementation Status:** ✅ **Completed - Multiplayer Feature Module**

The project has successfully implemented a feature-based architecture pattern, starting with the comprehensive refactoring of the multiplayer system. This architectural approach provides significant benefits for code organization, maintainability, and scalability.

**Multiplayer Feature Module Structure:**
```
features/multiplayer/
├── index.ts                    # Barrel file for clean imports
├── components/                 # Feature-specific components
├── services/                   # Feature-specific business logic
├── stores/                     # Feature-specific state management
└── ui/                        # Feature-specific user interfaces
```

**Key Architectural Benefits:**

1. **Self-Contained Functionality:**
   - All multiplayer-related code is contained within a single feature directory
   - Dependencies are clearly defined and minimized
   - Feature can be easily understood, modified, or extended

2. **Clean Import System:**
   ```typescript
   // Before: Complex import paths
   import { multiplayerStore } from '../../../stores/multiplayerStore';
   import MultiplayerControls from '../../../ui/MultiplayerControls.svelte';
   import { sendPlayerUpdate } from '../../../services/MultiplayerService';
   
   // After: Clean barrel file imports
   import { multiplayerStore, MultiplayerControls, sendPlayerUpdate } from '../multiplayer';
   ```

3. **Improved Maintainability:**
   - Related functionality is co-located
   - Changes to multiplayer features are contained within the feature module
   - Easier to debug and test individual features

4. **Scalable Design:**
   - Pattern established for future feature modules (conversation, navigation, etc.)
   - Clear boundaries between different domains of functionality
   - Easy to add new features without affecting existing code

**Feature Module Standards:**
- **Barrel File Exports**: Each feature provides a centralized `index.ts` for clean imports
- **Self-Contained Dependencies**: Features minimize external dependencies
- **Consistent Structure**: Standard directory layout (components, services, stores, ui)
- **Clear Boundaries**: Well-defined interfaces between features and core systems

**Future Feature Candidates:**
Based on the current codebase structure, the following systems are candidates for feature module refactoring:
- Conversation System (already partially organized)
- Navigation System
- Performance/Optimization System
- Audio System

### Level System
-   **Reference Implementation:** The HybridObservatory and SciFiRoom levels serve as architectural references for the level management system.
-   **Navigation Integration:** The navigation system provides framework for transitioning between levels via timeline events.
-   **Transition Framework:** The `gameStateStore` and `LevelTransitionHandler` provide fully operational level transition capabilities.

### Performance Optimization
The project uses a sophisticated LOD system (`systems/LOD.svelte`) and a comprehensive `optimization/OptimizationManager.ts` that provides automatic quality scaling, device capability detection, and performance monitoring across all game systems.

### Nature Pack Vegetation System
This system is well-implemented, using professional assets with biome-based distribution and tight integration with the LOD and terrain systems.

### Visual Style System (Ghibli Aesthetics)
This system (`styles/GhibliStyleSystem.svelte`) successfully implements a stylized rendering pipeline. The `core/StyleManager.ts` handles material caching and style coordination.

### Underwater Effects System
The architecture features a reactive environmental system (`components/OceanComponent.svelte`) and environmental effects system (`effects/`). This demonstrates self-contained, component-based feature implementation.

---

## Development Standards & Best Practices

This section establishes the coding standards, architectural patterns, and performance requirements that ensure code quality and maintainability across the project.

### Code Quality

- **TypeScript:** Strict mode enabled, no `any` types allowed
- **ESLint:** Enforced code standards with project-specific rules
- **Prettier:** Consistent formatting across all files
- **Component Props:** Full interface definitions required for all components
- **Error Handling:** Graceful fallbacks required for all operations

### Component Development Rules

All major, self-contained systems intended to be modular across levels (e.g., Fireflies, Ocean, Lighting) should extend BaseLevelComponent. Core controllers (Player.svelte) or simple, single-purpose visual components may be exempt.

Standardized lifecycle for BaseLevelComponent:

```typescript
abstract class BaseLevelComponent {
  readonly id: string
  readonly type: ComponentType
  
  protected abstract onInitialize(): Promise<void>
  protected abstract onUpdate(deltaTime: number): void
  protected abstract onMessage(message: SystemMessage): void
  protected abstract onDispose(): void
}
```

**Key Requirements:**
1. **Extend BaseLevelComponent:** Always use the standard lifecycle
2. **Resource Cleanup:** Dispose of Three.js resources in `onDispose()`
3. **Performance Aware:** Integrate with OptimizationManager
4. **Cross-System Communication:** Use SystemMessage pattern for component interaction
5. **TypeScript First:** Full type safety for all interfaces

### ECS Best Practices

**Good ECS Usage:**
```typescript
// Use ECS for high-frequency updates
class HybridFireflyComponent extends BaseLevelComponent {
  protected onUpdate(deltaTime: number): void {
    // Let ECS handle entity logic
    this.updateInstancedRendering()  // Only handle rendering
    this.updateLightingSystem()      // Only handle system integration
  }
}
```

**What NOT to do:**
```typescript
// Bad: Do not place game logic (e.g., physics, AI, state changes)
// inside a component's rendering loop. This logic belongs in an ECS system.
```

**Rules for ECS vs. Svelte Components:**
- **Use ECS for:** High-frequency state changes, game logic, and performance-critical calculations
- **Use Svelte Components for:** Rendering the state managed by the ECS. It is a valid and encouraged pattern to loop over ECS query results within a component's useTask to update visual properties of a THREE.InstancedMesh or other rendered objects

### Feature Organization Standards

**Feature Module Structure:**
All feature modules must follow a consistent directory structure and export pattern to maintain architectural coherence.

**Required Structure:**
```
features/[feature-name]/
├── index.ts                    # Barrel file (required)
├── components/                 # Feature-specific components
├── services/                   # Business logic and external integrations
├── stores/                     # Feature-specific state management
└── ui/                        # User interface components
```

**Barrel File Requirements:**
```typescript
// features/[feature-name]/index.ts
// Components
export { default as ComponentName } from './components/ComponentName.svelte';

// Services  
export * from './services/ServiceName';

// Stores
export { storeName } from './stores/storeName';

// UI
export { default as UIComponentName } from './ui/UIComponentName.svelte';
```

**Feature Development Rules:**
1. **Self-Contained:** Features should minimize external dependencies outside of core systems
2. **Barrel Exports:** All public APIs must be exported through the feature's `index.ts`
3. **Clear Boundaries:** Features should not directly import from other features
4. **Consistent Naming:** Use descriptive, domain-specific names for all exports
5. **Type Safety:** All feature APIs must be fully typed with TypeScript

**Import Standards:**
```typescript
// Good: Use barrel file imports
import { MultiplayerControls, multiplayerStore } from '../multiplayer';

// Bad: Direct file imports
import MultiplayerControls from '../multiplayer/ui/MultiplayerControls.svelte';
import { multiplayerStore } from '../multiplayer/stores/multiplayerStore';
```

**Integration Guidelines:**
- Features may import from core systems (components, stores, systems)
- Features should communicate through well-defined interfaces
- Feature-to-feature communication should go through core systems when possible
- Use event systems or shared stores for feature coordination

### Memory Management

**Required Cleanup Pattern:**
```typescript
// Always implement proper cleanup
protected onDispose(): void {
  if (this.geometry) this.geometry.dispose()
  if (this.material) this.material.dispose()
  if (this.instancedMesh) this.instancedMesh.dispose()
  
  // Clear arrays
  this.entities = []
  this.positions = []
}
```

**Performance Optimization Patterns:**
```typescript
// Good: Batch operations
fireflyPositions.forEach((position, index) => {
  tempMatrix.setPosition(position)
  instancedMesh.setMatrixAt(index, tempMatrix)
})
instancedMesh.instanceMatrix.needsUpdate = true

// Bad: Individual operations
// Don't update matrices one by one
```

### Performance Targets

- **Desktop (1080p):** 60fps with full effects
- **Mobile (720p):** 30fps with optimized effects  
- **Low-end devices:** 20fps with essential effects only

**Performance Monitoring:**
```typescript
// Built-in performance tracking
let frameCount = 0
let lastFrameTime = performance.now()

// Monitor frame time and adjust quality
if (frameTime > 20) { // Reduce quality
  this.maxLights = Math.floor(this.maxLights * 0.8)
} else if (frameTime < 12) { // Increase quality
  this.maxLights = Math.min(this.maxLights * 1.1, this.targetMaxLights)
}
```

**Browser Support:**
- Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- WebGL 2.0 required
- ES2020+ JavaScript features

**Resource Management:**
- **Automatic LOD:** Distance-based quality reduction
- **Memory Pooling:** Reuse objects to minimize garbage collection
- **Asset Streaming:** Progressive loading of high-quality assets
- **Texture Compression:** WebP for color, PNG for normal maps

---

## Conclusion

Version 5.4 of the MEGAMEAL Game Design Document consolidates prior work, aligns documentation with the current codebase, and clarifies the manifest-driven terrain pipeline. The feature-based architecture remains the organizing principle across terrain, multiplayer, ocean, player, and conversation systems.

### Key Achievements in v5.4:

1. **Unified Terrain (Manifest-Driven):** Terrain configuration sourced from generated manifests and heightmap configs; values and usage updated to match `observatory-environment`.
2. **Multiplayer Documentation:** Added Cloudflare Worker room directory details and join flow (`?room=<name>`), reflecting the production path.
3. **Document Consolidation:** Removed duplicate sections and improved structure for easier navigation and maintenance.
4. **Verified Modules:** Cross-checked and aligned component references (terrain, ocean, player, performance, conversation) with the actual code.

### Architectural Benefits:

- **Modularity:** Self-contained features with clear interfaces
- **Maintainability:** Easier debugging, testing, and modification of individual features  
- **Scalability:** Simple to add new features without affecting existing code
- **Developer Productivity:** Clean imports and well-organized code structure

The feature-based architecture maintains the project's commitment to modern web technologies while providing an even more stable and maintainable codebase for future development. This foundation positions MEGAMEAL for continued evolution and feature expansion.
