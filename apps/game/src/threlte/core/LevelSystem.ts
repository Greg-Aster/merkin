/** Component registry and message bus for modular level subsystems. */

import * as THREE from 'three'
import type { RuntimeLightingController } from '../features/lighting/RuntimeLightingController'
import { runtimeDebugLog } from '../utils/runtimeLog'

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
  scene: THREE.Scene | null
  camera: THREE.Camera | null
  renderer: THREE.WebGLRenderer | null
  eventBus: EventTarget
  registry: SystemRegistry
  lighting: RuntimeLightingController
  ecsWorld?: unknown
}

export enum ComponentType {
  ENVIRONMENT = 'environment',
  LIGHTING = 'lighting',
  OCEAN = 'ocean',
  PARTICLE_SYSTEM = 'particle_system',
  AUDIO = 'audio',
  PHYSICS = 'physics',
  UI = 'ui',
}

export enum MessageType {
  LIGHTING_UPDATE = 'lighting_update',
  COMPONENT_READY = 'component_ready',
  PERFORMANCE_WARNING = 'performance_warning',
  USER_INTERACTION = 'user_interaction',
}

export interface SystemMessage {
  type: MessageType
  source: string
  target?: string
  data: unknown
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
  private messageFrameId: number | null = null

  constructor() {
    this.startMessageProcessing()
  }

  registerComponent(component: LevelComponent): void {
    if (this.components.has(component.id)) {
      this.unregisterComponent(component.id)
    }

    runtimeDebugLog(
      `Registering component: ${component.id} (${component.type})`,
    )

    this.components.set(component.id, component)

    if (!this.componentsByType.has(component.type)) {
      this.componentsByType.set(component.type, [])
    }
    this.componentsByType.get(component.type)!.push(component)

    this.sendMessage({
      type: MessageType.COMPONENT_READY,
      source: 'registry',
      data: { componentId: component.id, componentType: component.type },
      timestamp: Date.now(),
      priority: 'normal',
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
      runtimeDebugLog(`Unregistered component: ${componentId}`)
    }
  }

  getComponent<T extends LevelComponent>(componentId: string): T | undefined {
    return this.components.get(componentId) as T
  }

  getComponentsByType<T extends LevelComponent>(type: ComponentType): T[] {
    return (this.componentsByType.get(type) || []) as T[]
  }

  sendMessage(message: SystemMessage): void {
    if (message.priority === 'critical') {
      this.processMessage(message)
      return
    }

    this.messageQueue.push(message)
  }

  updateComponents(deltaTime: number): void {
    for (const component of this.components.values()) {
      component.update(deltaTime)
    }
  }

  private processMessage(message: SystemMessage): void {
    if (message.target) {
      const component = this.components.get(message.target)
      if (component) {
        component.handleMessage(message)
      }
    } else {
      for (const component of this.components.values()) {
        if (component.id !== message.source) {
          component.handleMessage(message)
        }
      }
    }

    this.eventBus.dispatchEvent(
      new CustomEvent('system-message', { detail: message }),
    )
  }

  private startMessageProcessing(): void {
    if (this.isProcessingMessages) return
    this.isProcessingMessages = true

    const processQueue = () => {
      if (!this.isProcessingMessages) {
        this.messageFrameId = null
        return
      }

      const criticalMessages = this.messageQueue.filter(
        m => m.priority === 'critical',
      )
      const highMessages = this.messageQueue.filter(m => m.priority === 'high')
      const normalMessages = this.messageQueue.filter(
        m => m.priority === 'normal',
      )
      const lowMessages = this.messageQueue.filter(m => m.priority === 'low')

      criticalMessages.concat(highMessages).forEach(message => {
        this.processMessage(message)
      })

      normalMessages.slice(0, 10).forEach(message => {
        this.processMessage(message)
      })

      lowMessages.slice(0, 5).forEach(message => {
        this.processMessage(message)
      })

      this.messageQueue = this.messageQueue.filter(
        m =>
          m.priority !== 'critical' &&
          m.priority !== 'high' &&
          !normalMessages.slice(0, 10).includes(m) &&
          !lowMessages.slice(0, 5).includes(m),
      )

      this.messageFrameId = requestAnimationFrame(processQueue)
    }

    this.messageFrameId = requestAnimationFrame(processQueue)
  }

  addEventListener(type: string, listener: EventListener): void {
    this.eventBus.addEventListener(type, listener)
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.eventBus.removeEventListener(type, listener)
  }

  dispose(): void {
    this.isProcessingMessages = false
    if (this.messageFrameId !== null) {
      cancelAnimationFrame(this.messageFrameId)
      this.messageFrameId = null
    }
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

    runtimeDebugLog(`Component ${this.id} initialized`)
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

    runtimeDebugLog(`Component ${this.id} disposed`)
  }

  protected sendMessage(
    type: MessageType,
    data: unknown,
    target?: string,
    priority: 'low' | 'normal' | 'high' | 'critical' = 'normal',
  ): void {
    if (!this.context) return

    this.context.registry.sendMessage({
      type,
      source: this.id,
      target,
      data,
      timestamp: Date.now(),
      priority,
    })
  }

  protected abstract onInitialize(): Promise<void>
  protected abstract onUpdate(deltaTime: number): void
  protected abstract onMessage(message: SystemMessage): void
  protected abstract onDispose(): void
}
