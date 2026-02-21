# MEGAMEAL Game Design Document
## Threlte-Based 3D Web Game

**Version:** 5.0 (Complete Technical Reference - Updated)
**Date:** August 2025
**Engine:** Threlte + Svelte 5 + Rapier Physics + BitECS + PeerJS

---

## Version History

| Version | Date | Author(s) | Key Changes |
|---------|------|-----------|-------------|
| 5.0 | August 2025 | Dev Team | Updated conversation system architecture, fixed data structure mismatches, unified store-based dialog system |
| 4.0 | August 2025 | Dev Team | Complete technical reference with multiplayer system documentation |
| 3.1 | August 2025 | Dev Team | Technical architecture reference document |
| 3.0 | August 2025 | Dev Team | Architecture audit and refactor plan |
| 2.0 | July 22, 2025 | Dev Team | Technical architecture manual established |

---

## Table of Contents

1.  [Overview](#overview)
2.  [Technical Architecture](#technical-architecture)
3.  [Architectural State & Recent Improvements](#architectural-state--recent-improvements)
4.  [File Structure](#file-structure)
5.  [Core Systems](#core-systems)
    *   [Level Management System](#level-management-system)
    *   [Hybrid ECS Architecture](#hybrid-ecs-architecture)
    *   [ECS Spawn System](#ecs-spawn-system)
    *   [Unified Conversation System](#unified-conversation-system)
    *   [Player Control System](#player-control-system)
    *   [Multiplayer System](#multiplayer-system)
    *   [State Management](#state-management)
6.  [Component & System Reference](#component--system-reference)
    *   [HybridFireflyComponent](#hybridfireflycomponent)
    *   [OceanComponent](#oceancomponent)
    *   [LightingComponent](#lightingcomponent)
    *   [Unified Conversation Architecture](#unified-conversation-architecture)
    *   [Navigation System](#navigation-system)
    *   [Audio System](#audio-system)
    *   [EventBus System](#eventbus-system)
    *   [Terrain System](#terrain-system)
    *   [OptimizationManager](#optimizationmanager)
    *   [Player](#player)
    *   [PlayerAvatar](#playeravatar)
    *   [RemotePlayerAvatar](#remoteplayeravatar)
7.  [Feature Implementation](#feature-implementation)
    *   [Level System](#level-system)
    *   [Performance Optimization](#performance-optimization)
    *   [Nature Pack Vegetation System](#nature-pack-vegetation-system)
    *   [Visual Style System (Ghibli Aesthetics)](#visual-style-system-ghibli-aesthetics)
    *   [Underwater Effects System](#underwater-effects-system)
8.  [Development Standards & Best Practices](#development-standards--best-practices)
    *   [Code Quality](#code-quality)
    *   [Component Development Rules](#component-development-rules)
    *   [ECS Best Practices](#ecs-best-practices)
    *   [Memory Management](#memory-management)
    *   [Performance Targets](#performance-targets)

---

## Overview

MEGAMEAL is a first-person 3D exploration game built using modern web technologies. The game features interconnected levels that players can explore through immersive first-person controls, enhanced with peer-to-peer multiplayer capabilities and AI-powered character interactions.

The project implements a sophisticated, modern architecture built entirely with the `src/threlte` framework structure.

### Core Features
-   **First-Person Movement**: WASD + mouse look controls with physics-based movement.
-   **Modern 3D Architecture**: A core system built on Threlte for declarative 3D.
-   **Hybrid ECS Architecture**: High-performance entity component system (BitECS) for dynamic objects.
-   **Advanced Rendering**: Features include a dynamic ocean, vegetation, stylized visuals, and LOD optimization.
-   **AI Character Interactions**: Unified conversation system with intelligent firefly characters powered by AI.
-   **P2P Multiplayer**: Real-time multiplayer system with position synchronization and text chat.
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

### Hybrid Architecture Philosophy
MEGAMEAL uses a unique hybrid approach combining the best of both declarative and imperative paradigms:

**Declarative Components (Threlte/Svelte)** - For high-level scene composition:
-   Level layout and static objects (`HybridObservatory.svelte`, `SciFiRoom.svelte`).
-   UI components and state management.
-   Lighting and environmental effects.

**Imperative ECS (BitECS)** - For performance-critical dynamic systems:
-   Particle systems (e.g., `HybridFireflyComponent.svelte`).
-   Large-scale object management (e.g., `VegetationSystem.svelte`).
-   Performance-sensitive calculations.

---

## Architectural State & Recent Improvements

This section outlines the current state of the project and recent architectural improvements implemented to address technical debt and enhance system reliability.

### Current State
1.  **Modern Architecture:** The Threlte-based architecture implements comprehensive systems including unified conversation management, navigation, terrain, audio, event systems, and P2P multiplayer.
2.  **System Documentation:** All major systems are documented in this reference, including the newly unified conversation system, navigation systems, multiplayer components, and performance optimization components.
3.  **System Integration:** The codebase features seamless integration between ECS components, reactive Svelte stores, Threlte 3D systems, and P2P networking.
4.  **Performance Optimization:** Multi-tiered optimization system with automatic quality scaling, memory management, and LOD systems.

### Recent Architectural Improvements (v5.0)

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

4.  **Multiplayer System:**
    *   **Implementation:** Peer-to-peer multiplayer with position synchronization and text chat
    *   **Features:** Browser-to-browser communication without dedicated servers, visual player representation
    *   **Technology:** PeerJS networking, host-client star topology, firefly avatar system

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

4.  **Multiplayer Extensibility:**
    *   **Framework:** P2P networking system supports additional features like voice chat, file sharing
    *   **Capability:** Expandable to support more complex multiplayer mechanics

---

## File Structure

This reflects the current file structure of the project.

```
src/
├── threlte/
│   ├── Game.svelte                         # Main game container
│   ├── components/
│   │   ├── Player.svelte                   # First-person controller
│   │   ├── OceanComponent.svelte           # Modern ocean system
│   │   ├── LightingComponent.svelte        # Dynamic lighting system
│   │   ├── HybridFireflyComponent.svelte   # ECS-based particle system with AI integration
│   │   ├── NaturePackVegetation.svelte     # Vegetation assets
│   │   ├── LevelTransitionHandler.svelte   # Level transition management
│   │   ├── StarInteractionComponent.svelte # Star interaction system
│   │   ├── StarNavigationSystem.svelte     # Navigation between star locations
│   │   ├── StarSprite.svelte               # Individual star rendering
│   │   ├── TerrainCollider.svelte          # Terrain collision detection
│   │   ├── VegetationSystem.svelte         # Vegetation management system
│   │   ├── PlayerAvatar.svelte             # Dedicated player firefly avatar
│   │   ├── RemotePlayerAvatar.svelte       # Remote player representation
│   │   └── MultiplayerManager.svelte       # Multiplayer avatar coordination
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
│   ├── levels/
│   │   ├── HybridObservatory.svelte        # Primary observatory level
│   │   └── SciFiRoom.svelte                # Secondary sci-fi environment
│   ├── optimization/
│   │   └── OptimizationManager.ts          # Performance settings management
│   ├── services/
│   │   ├── TimelineDataService.ts          # Timeline and narrative data management
│   │   └── MultiplayerService.ts           # P2P networking and communication
│   ├── stores/
│   │   ├── gameStateStore.ts               # Core reactive game state
│   │   ├── underwaterStore.ts              # Underwater effects state
│   │   ├── mobileInputStore.ts             # Mobile controls state
│   │   ├── performanceStore.ts             # Performance metrics store
│   │   ├── postProcessingStore.ts          # Post-processing state
│   │   ├── multiplayerStore.ts             # P2P multiplayer state
│   │   ├── chatStore.ts                    # Chat message history
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
│   │   ├── Time.svelte                     # Game time management
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
│   ├── tests/
│   │   ├── PerformanceBenchmark.svelte     # Performance testing component
│   │   └── validate-performance.ts         # Performance validation utilities
│   ├── ui/
│   │   ├── PerformancePanel.svelte         # Debug performance info
│   │   ├── StyleControls.svelte            # Visual style testing interface
│   │   ├── MobileEnhancements.svelte       # Mobile-specific UI improvements
│   │   ├── TimelineCard.svelte             # Timeline/narrative UI component
│   │   ├── SettingsButton.svelte           # Settings menu trigger
│   │   ├── SettingsPanel.svelte            # Unified settings interface
│   │   ├── MultiplayerControls.svelte      # Multiplayer connection controls
│   │   └── ChatBox.svelte                  # Real-time text chat interface
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

**Architectural Evolution:**
The conversation system underwent significant improvements in v5.0:

```
OLD (v4.0 - Broken):
Firefly Click → ConversationManager.svelte (internal state) → No UI response
               ↓
            ConversationDialog.svelte (store state) → Never triggered

NEW (v5.0 - Working):
Firefly Click → conversationActions.startConversation() → Store updates → Dialog shows → AI responds
```

**Data Flow Architecture:**
```
User Input → Character Registry → Data Conversion → Memory Manager Agent → Cloudflare Worker → AI Model → Response
              ↓                     ↓                   ↓
         Case-insensitive      FireflyPersonality    Character Knowledge
         ID normalization  →   to NPCPersonality   →  Auto-Discovery +
                               conversion             Smart Memory System
```

**Performance Metrics:**
- **Data Conversion**: Seamless transformation between personality formats with no performance impact
- **Character Loading**: Reliable loading with case-insensitive ID handling
- **Memory Management**: 80-96% token savings compared to loading full knowledge bases
- **UI Responsiveness**: Real-time conversation state updates via reactive stores

### Player Control System
The system provides modern first-person controls via `components/Player.svelte`. Mobile controls have been separated into `controls/ThrelteMobileControls.svelte`, which is a good separation of concerns.

### Multiplayer System
A comprehensive peer-to-peer multiplayer system that enables real-time communication and shared gameplay experiences without requiring dedicated servers.

**Architecture:**
- **P2P Networking**: Built on PeerJS for direct browser-to-browser communication
- **Host-Client Model**: Star network topology with one player acting as host
- **Real-time Synchronization**: Position updates and chat messages at 10fps
- **Visual Player Representation**: Remote players appear as distinctive blue firefly avatars

**Key Components:**
```typescript
// Core multiplayer service
class MultiplayerService {
  createRoom(): void                    // Become host and create room
  joinRoom(hostId: string): void        // Connect to existing room
  sendPlayerUpdate(state: PlayerState): void  // Broadcast position
  sendChatMessage(message: string): void       // Send chat message
}

// State management
interface MultiplayerState {
  peerId: string | null               // Unique player identifier
  hostId: string | null              // Room host identifier  
  isHost: boolean                    // Whether this player is the host
  isConnected: boolean               // Connection status
  players: Record<string, PlayerState>  // All connected players
}

// Player representation
interface PlayerState {
  position: [number, number, number]  // 3D world position
  // Future: rotation, animation state, etc.
}
```

**Multiplayer Features:**
- **Real-time Chat**: Text-based communication with timestamps and player identification
- **Player Avatars**: Remote players rendered as bright blue fireflies with pulsing light emission
- **Settings Integration**: Multiplayer controls embedded in unified settings menu
- **Mobile Support**: Touch-friendly interface with responsive design
- **Keyboard Shortcuts**: Quick chat access via Enter or T keys

**Technical Implementation:**
```typescript
// Network message structure
interface NetworkMessage {
  type: 'player_update' | 'chat_message' | 'full_state'
  payload: PlayerState | ChatMessage | PlayerState[]
}

// Chat message format
interface ChatMessage {
  senderId: string                    // Player who sent the message
  text: string                       // Message content (max 200 chars)
  timestamp: string                  // ISO date string
}
```

**UI Components:**
- **`MultiplayerControls.svelte`**: Connection interface for creating/joining rooms
- **`ChatBox.svelte`**: Real-time text chat with auto-scroll and player identification
- **`PlayerAvatar.svelte`**: Dedicated firefly avatar with integrated lighting
- **`RemotePlayerAvatar.svelte`**: Physics-enabled remote player representation

**Performance Optimizations:**
- **Throttled Updates**: Position sync limited to 10fps to reduce bandwidth
- **Host Broadcasting**: Centralized state distribution prevents message flooding
- **Self-contained Components**: Minimized dependencies and import conflicts
- **Physics Preservation**: Remote avatars maintain collision detection via AutoColliders

**Integration Points:**
- **Settings Menu**: Accessed via gear icon (top-right) or F1 key
- **Player Physics**: Remote avatars use same capsule collision as local player
- **Audio System**: Chat and multiplayer sounds integrated with global audio toggle
- **UI State**: Multiplayer controls properly handle mouse input conflicts

### State Management
The game has correctly migrated to a modern, reactive state management system using **Svelte Stores** (`stores/`). Key stores for game state, performance, multiplayer state, and UI are present. This is a scalable approach.

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

**Timeline Event Integration:**
```typescript
// Navigation system level mapping
const levelMap = {
  'level-type-a': 'level_a',
  'level-type-b': 'level_b',
  'level-type-c': 'level_c', 
  'level-type-d': 'level_d'
}

// Timeline metadata structure
interface TimelineEvent {
  id: string
  title: string
  description: string
  year: number
  era: string
  location: string
  isKeyEvent: boolean
  isLevel: boolean
  levelId?: string
  category: string
  tags: string[]
}
```

**Performance Features:**
- **Instanced Rendering**: Efficient rendering of thousands of elements using Three.js instanced meshes
- **LOD System**: Level-of-detail scaling based on distance and device capabilities
- **Event Pooling**: Optimized event handling to prevent memory leaks
- **Selective Raycasting**: Smart intersection detection that only processes nearby elements

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

### Terrain System

**Description:** Professional heightfield-based terrain system providing efficient collision detection and performance-scaled terrain generation for large game worlds.

**Key Features:**
* **Heightfield Collision**: Efficient terrain collision using heightmaps instead of complex mesh collision
* **Performance Scaling**: Automatic LOD adjustment based on device capabilities via OptimizationManager
* **Chunk-Based Loading**: Memory-efficient terrain streaming with chunk management
* **Cache System**: 1-minute LRU cache for terrain height data with automatic cleanup
* **Bounds Optimization**: Pre-computed terrain bounds for fast culling and collision queries

**API:**
```typescript
// Core terrain interface
export class TerrainSystem {
  static getInstance(): TerrainSystem
  getHeightAt(x: number, z: number): number
  generateTerrain(config: TerrainConfig): TerrainChunk[]
  getTerrainBounds(): { min: Vector3, max: Vector3 }
  clearCache(): void
  getPerformanceStats(): PerformanceStats
}

// Configuration and data structures
interface TerrainConfig {
  worldSize: number      // Physical terrain size in world units
  heightScale: number    // Vertical scaling factor
}

interface TerrainChunk {
  x: number
  z: number
  size: number
  heightData: Float32Array
  resolution: number
  bounds: { minY: number; maxY: number }
}
```

**Performance Optimization:**
- **Adaptive Resolution**: Terrain resolution scales with OptimizationLevel (64x64 to 256x256 samples)
- **Memory Management**: Automatic cache cleanup and chunk unloading
- **LOD Scaling**: Distance-based detail reduction for large terrains
- **Bounds Culling**: Fast rejection of out-of-bounds collision queries

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

**Key Features:**
* **First-Person Controls**: WASD movement with mouse look camera
* **Physics Integration**: Rapier3D physics for realistic movement and collision
* **Mobile Support**: Touch controls integration for cross-platform compatibility
* **Multiplayer Integration**: Position updates sent to multiplayer system
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
* **Multiplayer Updates**: Sends position data to MultiplayerService for synchronization
* **Mobile Adaptation**: Seamlessly switches to touch controls on mobile devices

**Integration Points:**
```typescript
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

Version 5.0 of the MEGAMEAL Game Design Document reflects significant architectural improvements that enhance system reliability and user experience. The unified conversation system eliminates previous conflicts and provides a robust foundation for AI character interactions. The data conversion layer ensures compatibility between different personality formats, while case-insensitive character loading improves system resilience.

These improvements maintain the project's commitment to modern web technologies while providing a more stable and maintainable codebase for future development.