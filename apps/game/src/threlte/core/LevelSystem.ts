/**
 * Industry-Standard Level System Architecture
 * Based on Unity/Unreal patterns adapted for Three.js/Threlte
 * 
 * This replaces the broken component binding approach with a proper
 * event-driven architecture that allows true modular composition.
 */

import * as THREE from 'three'
import type { LightingManager } from '../features/lighting/LightingManager'

// Core interfaces that any level component must implement
export interface LevelComponent {
  readonly id: string
  readonly type: ComponentType
  initialize(context: LevelContext): Promise<void>
  update(deltaTime: number): void
  handleMessage(message: SystemMessage): void
  dispose(): void
}

export interface LevelContext {
  scene: THREE.Scene
  camera: THREE.Camera
  renderer: THREE.WebGLRenderer
  eventBus: EventTarget
  registry: SystemRegistry
  lighting: LightingManager
  ecsWorld?: any // ECSWorldManager - optional to avoid circular import
}

export enum ComponentType {
  ENVIRONMENT = 'environment',
  LIGHTING = 'lighting', 
  OCEAN = 'ocean',
  PARTICLE_SYSTEM = 'particle_system',
  AUDIO = 'audio',
  PHYSICS = 'physics',
  UI = 'ui'
}

export enum MessageType {
  LIGHTING_UPDATE = 'lighting_update',
  COMPONENT_READY = 'component_ready',
  PERFORMANCE_WARNING = 'performance_warning',
  USER_INTERACTION = 'user_interaction'
}

export interface SystemMessage {
  type: MessageType
  source: string
  target?: string // undefined = broadcast to all
  data: any
  timestamp: number
  priority: 'low' | 'normal' | 'high' | 'critical'
}

/**
 * Central System Registry - This is what makes modular levels possible
 */
export class SystemRegistry {
  private components = new Map<string, LevelComponent>()
  private componentsByType = new Map<ComponentType, LevelComponent[]>()
  private messageQueue: SystemMessage[] = []
  private eventBus = new EventTarget()
  private isProcessingMessages = false

  constructor() {
    // Process message queue every frame
    this.startMessageProcessing()
  }

  registerComponent(component: LevelComponent): void {
    console.log(`📋 Registering component: ${component.id} (${component.type})`)
    
    this.components.set(component.id, component)
    
    if (!this.componentsByType.has(component.type)) {
      this.componentsByType.set(component.type, [])
    }
    this.componentsByType.get(component.type)!.push(component)

    // Notify other components that a new component is ready
    this.sendMessage({
      type: MessageType.COMPONENT_READY,
      source: 'registry',
      data: { componentId: component.id, componentType: component.type },
      timestamp: Date.now(),
      priority: 'normal'
    })
  }

  unregisterComponent(componentId: string): void {
    const component = this.components.get(componentId)
    if (component) {
      component.dispose()
      this.components.delete(componentId)
      
      const typeComponents = this.componentsByType.get(component.type)
      if (typeComponents) {
        const index = typeComponents.indexOf(component)
        if (index > -1) {
          typeComponents.splice(index, 1)
        }
      }
      console.log(`📋 Unregistered component: ${componentId}`)
    }
  }

  getComponent<T extends LevelComponent>(componentId: string): T | undefined {
    return this.components.get(componentId) as T
  }

  getComponentsByType<T extends LevelComponent>(type: ComponentType): T[] {
    return (this.componentsByType.get(type) || []) as T[]
  }

  sendMessage(message: SystemMessage): void {
    // Add to queue for processing
    this.messageQueue.push(message)
    
    // Critical messages get processed immediately
    if (message.priority === 'critical') {
      this.processMessage(message)
    }
  }

  private processMessage(message: SystemMessage): void {
    if (message.target) {
      // Direct message to specific component
      const component = this.components.get(message.target)
      if (component) {
        component.handleMessage(message)
      }
    } else {
      // Broadcast to all components
      for (const component of this.components.values()) {
        if (component.id !== message.source) {
          component.handleMessage(message)
        }
      }
    }

    // Also dispatch to event bus for external listeners
    this.eventBus.dispatchEvent(new CustomEvent('system-message', { detail: message }))
  }

  private startMessageProcessing(): void {
    if (this.isProcessingMessages) return
    this.isProcessingMessages = true

    const processQueue = () => {
      // Process messages by priority
      const criticalMessages = this.messageQueue.filter(m => m.priority === 'critical')
      const highMessages = this.messageQueue.filter(m => m.priority === 'high')
      const normalMessages = this.messageQueue.filter(m => m.priority === 'normal')
      const lowMessages = this.messageQueue.filter(m => m.priority === 'low')

      // Process critical and high priority immediately
      criticalMessages.concat(highMessages).forEach(message => {
        this.processMessage(message)
      })

      // Process normal messages (batch up to 10 per frame)
      normalMessages.slice(0, 10).forEach(message => {
        this.processMessage(message)
      })

      // Process low priority messages (batch up to 5 per frame)
      lowMessages.slice(0, 5).forEach(message => {
        this.processMessage(message)
      })

      // Clear processed messages
      this.messageQueue = this.messageQueue.filter(m => 
        m.priority !== 'critical' && 
        m.priority !== 'high' && 
        !(normalMessages.slice(0, 10).includes(m)) &&
        !(lowMessages.slice(0, 5).includes(m))
      )

      requestAnimationFrame(processQueue)
    }

    requestAnimationFrame(processQueue)
  }

  addEventListener(type: string, listener: EventListener): void {
    this.eventBus.addEventListener(type, listener)
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.eventBus.removeEventListener(type, listener)
  }

  dispose(): void {
    this.isProcessingMessages = false
    for (const component of this.components.values()) {
      component.dispose()
    }
    this.components.clear()
    this.componentsByType.clear()
    this.messageQueue = []
  }
}


/**
 * Base Component Class - Extend this for any level component
 */
export abstract class BaseLevelComponent implements LevelComponent {
  abstract readonly id: string
  abstract readonly type: ComponentType

  protected context?: LevelContext
  protected isInitialized = false
  protected isDisposed = false

  async initialize(context: LevelContext): Promise<void> {
    if (this.isInitialized) {
      console.warn(`Component ${this.id} already initialized`)
      return
    }

    this.context = context
    await this.onInitialize()
    this.isInitialized = true
    
    console.log(`✅ Component ${this.id} initialized`)
  }

  update(deltaTime: number): void {
    if (!this.isInitialized || this.isDisposed) return
    this.onUpdate(deltaTime)
  }

  handleMessage(message: SystemMessage): void {
    if (this.isDisposed) return
    this.onMessage(message)
  }

  dispose(): void {
    if (this.isDisposed) return
    
    this.onDispose()
    this.isDisposed = true
    this.context = undefined
    
    console.log(`🧹 Component ${this.id} disposed`)
  }

  protected sendMessage(type: MessageType, data: any, target?: string, priority: 'low' | 'normal' | 'high' | 'critical' = 'normal'): void {
    if (!this.context) return
    
    this.context.registry.sendMessage({
      type,
      source: this.id,
      target,
      data,
      timestamp: Date.now(),
      priority
    })
  }

  protected abstract onInitialize(): Promise<void>
  protected abstract onUpdate(deltaTime: number): void
  protected abstract onMessage(message: SystemMessage): void
  protected abstract onDispose(): void
}