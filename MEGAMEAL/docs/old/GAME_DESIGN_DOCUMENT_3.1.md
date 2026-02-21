# MEGAMEAL Game Design Document
## Threlte-Based 3D Web Game

**Version:** 3.1 (Technical Architecture Reference)
**Date:** August 2025
**Engine:** Threlte + Svelte 5 + Rapier Physics + BitECS

---

## Version History

| Version | Date | Author(s) | Key Changes |
|---------|------|-----------|-------------|
| 3.1 | August 2025 | Dev Team | Technical architecture reference document |
| 3.0 | August 2025 | Dev Team | Architecture audit and refactor plan |
| 2.0 | July 22, 2025 | Dev Team | Technical architecture manual established |

---

## Table of Contents

1.  [Overview](#overview)
2.  [Technical Architecture](#technical-architecture)
3.  [Architectural State & Recommended Improvements](#architectural-state--recommended-improvements)
4.  [File Structure](#file-structure)
5.  [Core Systems](#core-systems)
    *   [Level Management System](#level-management-system)
    *   [Hybrid ECS Architecture](#hybrid-ecs-architecture)
    *   [ECS Spawn System](#ecs-spawn-system)
    *   [Conversation System](#conversation-system)
    *   [Player Control System](#player-control-system)
    *   [State Management](#state-management)
6.  [Component & System Reference](#component--system-reference)
    *   [HybridFireflyComponent](#hybridfireflycomponent)
    *   [OceanComponent](#oceancomponent)
    *   [LightingComponent](#lightingcomponent)
    *   [ConversationManager](#conversationmanager)
    *   [OptimizationManager](#optimizationmanager)
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

MEGAMEAL is a first-person 3D exploration game built using modern web technologies. The game features interconnected levels that players can explore through immersive first-person controls.

The project implements a sophisticated, modern architecture built entirely with the `src/threlte` framework structure.

### Core Features
-   **First-Person Movement**: WASD + mouse look controls with physics-based movement.
-   **Modern 3D Architecture**: A core system built on Threlte for declarative 3D.
-   **Hybrid ECS Architecture**: High-performance entity component system (BitECS) for dynamic objects.
-   **Advanced Rendering**: Features include a dynamic ocean, vegetation, stylized visuals, and LOD optimization.
-   **Cross-Platform**: Desktop and mobile support with adaptive controls.

---

## Technical Architecture

### Core Technologies
-   **Threlte**: Declarative 3D framework for Svelte.
-   **Svelte 5**: Reactive UI framework with modern stores.
-   **Rapier3D**: Physics engine for realistic movement and collisions.
-   **Three.js**: Underlying 3D engine (via Threlte).
-   **BitECS**: High-performance Entity Component System for dynamic objects.
-   **Astro**: Static site generator with component islands.

### Hybrid Architecture Philosophy
MEGAMEAL uses a unique hybrid approach combining the best of both declarative and imperative paradigms:

**Declarative Components (Threlte/Svelte)** - For high-level scene composition:
-   Level layout and static objects (`HybridObservatory.svelte`).
-   UI components and state management.
-   Lighting and environmental effects.

**Imperative ECS (BitECS)** - For performance-critical dynamic systems:
-   Particle systems (e.g., `HybridFireflyComponent.svelte`).
-   Large-scale object management (e.g., `VegetationSystem.svelte`).
-   Performance-sensitive calculations.

---

## Architectural State & Recommended Improvements

This section outlines the current state of the project and provides recommendations to address technical debt, unify the architecture, and guide future development.

### Current State
1.  **Modern Architecture:** The Threlte-based architecture implements comprehensive systems including conversation management, navigation, terrain, audio, and event systems.
2.  **System Documentation:** All major systems are documented in this reference, including conversation systems, navigation systems, and performance optimization components.
3.  **System Integration:** The codebase features seamless integration between ECS components, reactive Svelte stores, and Threlte 3D systems.
4.  **Performance Optimization:** Multi-tiered optimization system with automatic quality scaling, memory management, and LOD systems.

### Architectural Strengths

1.  **AI Conversation System:**
    *   **Implementation:** Multi-character AI system with advanced memory management achieving significant token savings
    *   **Features:** Interactive dialogue system with character personalities and knowledge bases
    *   **Technology:** Auto-discovery character system, ECS-aligned architecture, smart memory decision logic

2.  **Navigation System:**
    *   **Implementation:** 3D interactive field with raycasting-based interaction, timeline integration, and level transitions
    *   **Features:** Interactive exploration with procedural generation and mobile optimization
    *   **Technology:** Instanced mesh rendering, performance-scaled LOD, responsive touch controls

3.  **Performance Management:**
    *   **Implementation:** Comprehensive optimization system with terrain collision, audio management, and event bus architecture
    *   **Features:** Scalable performance across desktop and mobile devices with automatic quality adjustment
    *   **Technology:** Multi-level LOD, memory pooling, chunk-based streaming, reactive performance monitoring

### Architecture Extensibility

1.  **Level System:**
    *   **Framework:** Established navigation and conversation systems support additional environments
    *   **Capability:** Modular level creation using existing architectural patterns

2.  **Character System:**
    *   **Framework:** Dynamic character relationships and cross-character memory references
    *   **Capability:** Expandable dialogue system with shared experience tracking

3.  **Audio Integration:**
    *   **Framework:** Spatial audio integration with conversation and environmental systems
    *   **Capability:** Responsive audio architecture for interactive experiences

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
│   │   ├── HybridFireflyComponent.svelte   # ECS-based particle system
│   │   ├── NaturePackVegetation.svelte     # Vegetation assets
│   │   ├── LevelTransitionHandler.svelte   # Level transition management
│   │   ├── StarInteractionComponent.svelte # Star interaction system
│   │   ├── StarNavigationSystem.svelte     # Navigation between star locations
│   │   ├── StarSprite.svelte               # Individual star rendering
│   │   ├── StaticEnvironment.svelte        # Static environmental objects
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
│   │   └── ReferenceLevel.svelte            # Primary level implementation
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
│   │   ├── Interaction.svelte              # Object interaction system
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
│   │   └── conversation/                   # Comprehensive conversation system
│   │       ├── ConversationDialog.svelte   # UI for dialogue interactions
│   │       ├── ConversationManager.ts      # Dialogue flow orchestration
│   │       ├── FireflyAvatar.svelte        # Character avatar system
│   │       ├── MemoryManagerAgent.ts       # AI-driven conversation memory
│   │       ├── README.md                   # Conversation system documentation
│   │       ├── conversationStores.ts       # Reactive conversation state
│   │       ├── index.ts                    # System exports
│   │       ├── types.ts                    # Conversation type definitions
│   │       ├── worldKnowledge.ts           # Game world knowledge base
│   │       └── characters/                 # Character definitions and registry
│   │           ├── CharacterComponent.ts    # Base character component
│   │           ├── CharacterRegistry.ts     # Character database
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

### Conversation System
A comprehensive AI-driven conversation system that provides interactive character dialogues with advanced memory management. The system follows an ECS-aligned architecture with auto-discovery, centralized token management, and smart memory compression.

**Key Features:**
- **Multi-Agent Memory Management**: Intelligent memory orchestration that decides what memories to retrieve and compresses them for optimal performance
- **Auto-Discovery Character System**: New characters are automatically available by creating a single file - no manual registration required
- **Scalable Character Support**: Extensible knowledge bases, personalities, and backstories with thematic consistency
- **Smart Memory System**: Binary decision logic that determines when to retrieve memories vs. simple responses
- **ECS Integration**: Clean component-based architecture that integrates seamlessly with the game's ECS system

**Character System:**
- **Modular Architecture**: Auto-discovery system for character definitions
- **Knowledge Integration**: Extensible knowledge bases and personality systems
- **Memory Management**: Advanced conversation memory with compression and retrieval
- **Dialogue Framework**: Reactive conversation state management

**Technical Architecture:**
```
User Input → Memory Manager Agent → Cloudflare Worker → AI Model → Response
              ↓                       ↓
         Character Knowledge     Centralized Token
         Auto-Discovery +        Limit (200 tokens)
         Smart RAGate +          + Flexible Instructions
         Memory Compression
```

**Performance Metrics:**
- Token Savings: Significant reduction compared to loading full knowledge bases
- Memory Compression: Substantial reduction in memory size while preserving relevance
- Fast character loading with dynamic imports and caching
- Optimized character responses with knowledge integration

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
The game has correctly migrated to a modern, reactive state management system using **Svelte Stores** (`stores/`). Key stores for game state, performance, and UI are present. This is a scalable approach.

---

## Component & System Reference

This section provides detailed technical specifications for all major components and systems, serving as a practical reference for developers working with these systems.

### HybridFireflyComponent

**Description:** The single source of truth for the firefly particle system. It uses BitECS for high-performance simulation and integrates with the lighting system.

**Props:**
```typescript
interface FireflyProps {
  count: number                    // Number of fireflies (default: 80)
  maxLights: number               // Maximum active lights for performance scaling (default: 20)
  colors: number[]                // A palette of colors for the fireflies
  emissiveIntensity: number       // Material emissive strength (default: 15.0)
  lightIntensity: number          // Point light intensity (default: 15.0)
  lightRange: number              // Light falloff distance (default: 80)
  cycleDuration: number           // Light cycle time in seconds (default: 12.0)
  fadeSpeed: number               // Fade transition speed (default: 2.0)
  heightRange: { min: number; max: number }  // Y position range
  radius: number                  // Distribution radius (default: 180)
  size: number                    // Firefly sphere size (default: 0.015)
  movement: {
    speed: number                 // Animation speed (default: 0.2)
    wanderSpeed: number          // Wandering speed (default: 0.004)
    wanderRadius: number         // Wander distance (default: 4)
    floatAmplitude: Vector3      // Floating motion range
    lerpFactor: number           // Position interpolation factor
  }
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

### ConversationManager

**Description:** Orchestrates AI-driven dialogue flow with advanced memory management, character state persistence, and seamless UI integration. Uses the MemoryManagerAgent to achieve 80-96% token savings while maintaining authentic character responses.

**Key Responsibilities:**
* AI conversation orchestration with Cloudflare Workers integration
* Character memory retrieval and compression via MemoryManagerAgent
* Real-time conversation state management with reactive stores
* Integration with 10 unique character personalities and knowledge bases
* Smart RAGate system for optimal memory usage

**API:**
```typescript
// Core conversation management
export async function startConversation(characterId: string): Promise<void>
export async function sendMessage(message: string): Promise<string>
export function endConversation(): void

// Character and memory management  
export async function loadCharacter(characterId: string): Promise<CharacterDefinition>
export function getCurrentCharacter(): CharacterDefinition | null
export function getConversationHistory(): ConversationMessage[]

// Memory management integration
export function getMemoryManagerConfig(): MemoryManagerConfig
export function updateMemoryManagerConfig(config: Partial<MemoryManagerConfig>): void

// State management
export function getConversationState(): ConversationState
export function updateConversationState(updates: Partial<ConversationState>): void
```

**Memory Manager Configuration:**
```typescript
interface MemoryManagerConfig {
  maxMemories: number              // Default: 3 (optimized for character knowledge)
  maxTokensPerMemory: number       // Default: 400 (detailed character content)
  maxResponseTokens: number        // Default: 200 (flexible response limit)
  compressionRatio: number         // Target: 0.5 (balanced compression)
  relevanceThreshold: number       // Default: 1.0 (optimized retrieval)
  enableRAGate: boolean           // Smart binary memory decisions
}
```

**Character Integration:**
- **Auto-Discovery**: Characters loaded dynamically from definitions folder
- **Unified Interface**: All characters implement standardized `CharacterDefinition` interface
- **Embedded Knowledge**: Complete character knowledge embedded in single files
- **Thematic Consistency**: Character system supports consistent narrative themes

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

**Description:** Central performance management system that automatically adjusts quality settings based on device capabilities and runtime performance.

**Optimization Levels:**
```typescript
interface OptimizationLevel {
  ULTRA_LOW = 'ultra_low'
  LOW = 'low'
  MEDIUM = 'medium'
  HIGH = 'high'
  ULTRA = 'ultra'
}
```

**Quality Settings:**
```typescript
interface QualitySettings {
  maxFireflyLights: number
  oceanSegments: { width: number; height: number }
  enableReflections: boolean
  enableRefractions: boolean
  enableProceduralTextures: boolean
  enableNormalMaps: boolean
}
```

**API Methods:**
```typescript
// Performance management interface
export function getInstance(): OptimizationManager
export function getQualitySettings(): QualitySettings
export function getOptimizationLevel(): OptimizationLevel
export function setOptimizationLevel(level: OptimizationLevel): void
```

---
## Feature Implementation

### Level System
-   **Reference Implementation:** The primary level serves as the architectural reference for the level management system.
-   **Navigation Integration:** The navigation system provides framework for transitioning between levels via timeline events.
-   **Transition Framework:** The `gameStateStore` and `LevelTransitionHandler` provide fully operational level transition capabilities.

### Performance Optimization
The project uses a sophisticated LOD system (`systems/LOD.svelte`) and has a dedicated, but undocumented, `optimization/OptimizationManager.ts`. This indicates a strong focus on performance, but the manager's role should be clarified.

### Nature Pack Vegetation System
This system is well-implemented, using professional assets with biome-based distribution and tight integration with the LOD and terrain systems.

### Visual Style System (Ghibli Aesthetics)
This system (`styles/GhibliStyleSystem.svelte`) successfully implements a stylized rendering pipeline. The `core/StyleManager.ts` handles material caching and style coordination.

### Environmental Effects System
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

All components must extend the BaseLevelComponent class with standardized lifecycle:

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
// Bad: Manual entity management in components
// Don't manually loop through entities in components
```

**Rules for ECS vs. Svelte Components:**
- **Use ECS for:** High-frequency updates, large numbers of similar objects, performance-critical calculations
- **Use Svelte Components for:** UI, scene composition, high-level orchestration, reactive state management

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

