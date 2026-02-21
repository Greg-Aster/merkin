/**
 * TimelineDataService.ts
 * 
 * Bridges the existing timeline system with the new ECS star navigation.
 * Loads timeline events from blog post frontmatter and formats them for 3D star display.
 */

import type { TimelineEvent } from '../../services/TimelineConfig'
import { 
  ERA_COLORS, 
  COLOR_SPECTRUM, 
  CONSTELLATION_CONFIG,
  getStarColor,
  getStarType,
  getSizeFactor,
  hashCode 
} from '../../utils/starUtils'

export interface StarEventData extends TimelineEvent {
  // 3D positioning data
  position?: [number, number, number]
  azimuth?: number
  elevation?: number
  
  // Visual properties
  starColor?: string
  starType?: string
  sizeFactor?: number
  uniqueId?: string
  
  // ECS properties
  clickable?: boolean
  hoverable?: boolean
  unlocked?: boolean
  animationOffset?: number
  twinkleSpeed?: number
  
  // Level navigation (if the timeline event represents a level)
  isLevel?: boolean
  levelId?: string | null
  
  // Screen positioning for timeline cards
  screenPosition?: {
    cardClass?: string
    x?: number
    y?: number
  }
}

export class TimelineDataService {
  private cachedEvents: StarEventData[] = []
  private lastFetchTime = 0
  private readonly cacheTimeout = 30000 // 30 seconds

  /**
   * Load timeline events from API endpoint and format them for the star navigation system
   */
  async loadStarEvents(options: {
    category?: string
    startYear?: number
    endYear?: number
    era?: string
    onlyKeyEvents?: boolean
    includeDrafts?: boolean
  } = {}): Promise<StarEventData[]> {
    const now = Date.now()
    
    // Use cache if recent
    if (this.cachedEvents.length > 0 && (now - this.lastFetchTime) < this.cacheTimeout) {
      console.log('📊 TimelineDataService: Using cached star events')
      return this.filterEvents(this.cachedEvents, options)
    }

    try {
      console.log('📊 TimelineDataService: Loading timeline events from API...')
      
      // Build query parameters
      const params = new URLSearchParams()
      if (options.category) params.set('category', options.category)
      if (options.startYear) params.set('startYear', options.startYear.toString())
      if (options.endYear) params.set('endYear', options.endYear.toString())
      if (options.era) params.set('era', options.era)
      if (options.onlyKeyEvents) params.set('onlyKeyEvents', 'true')
      if (options.includeDrafts !== undefined) params.set('includeDrafts', options.includeDrafts.toString())
      
      // Fetch from API endpoint
      const response = await fetch(`/api/timeline-events?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'API returned error')
      }
      
      const timelineEvents = data.events as TimelineEvent[]
      console.log(`📊 Loaded ${timelineEvents.length} timeline events from API`)

      // Transform timeline events into star data
      this.cachedEvents = timelineEvents.map((event, index) => 
        this.transformTimelineEventToStarData(event, index)
      )

      this.lastFetchTime = now
      
      console.log(`✅ TimelineDataService: Processed ${this.cachedEvents.length} star events`)
      return this.filterEvents(this.cachedEvents, options)
      
    } catch (error) {
      console.error('❌ TimelineDataService: Failed to load timeline events:', error)
      return []
    }
  }

  /**
   * Transform a timeline event into star data suitable for 3D display
   * Public method for use by components
   */
  transformEventToStarData(event: TimelineEvent, index: number): StarEventData {
    return this.transformTimelineEventToStarData(event, index)
  }

  /**
   * Transform a timeline event into star data suitable for 3D display
   */
  private transformTimelineEventToStarData(event: TimelineEvent, index: number): StarEventData {
    // Generate unique ID for consistency
    const uniqueId = event.slug || `timeline_event_${index}`
    
    // Calculate 3D position using constellation system
    const position = this.calculateStarPosition(event, index)
    
    // Determine visual properties
    const starColor = getStarColor(uniqueId, event.era, true)
    const starType = getStarType(uniqueId, event.isKeyEvent || false)
    const sizeFactor = getSizeFactor(event.isKeyEvent || false)
    
    // Check if this event represents a level
    const { isLevel, levelId } = this.checkIfEventIsLevel(event)
    
    return {
      ...event,
      uniqueId,
      position,
      starColor,
      starType,
      sizeFactor,
      
      // ECS properties
      clickable: true,
      hoverable: true,
      unlocked: true,
      animationOffset: (hashCode(uniqueId) % 1000) / 1000,
      twinkleSpeed: 0.5 + Math.random() * 1.5,
      
      // Level navigation
      isLevel,
      levelId,
      
      // Screen positioning
      screenPosition: {
        cardClass: 'bottom'
      }
    }
  }

  /**
   * Calculate 3D position for a star based on constellation configuration
   */
  private calculateStarPosition(event: TimelineEvent, index: number): [number, number, number] {
    const era = event.era || 'unknown'
    const config = CONSTELLATION_CONFIG[era as keyof typeof CONSTELLATION_CONFIG]
    
    if (!config) {
      console.warn(`No constellation config for era: ${era}`)
      // Fallback to scattered positioning at skybox radius
      const angle = Math.random() * Math.PI * 2
      const elevation = (Math.random() - 0.5) * 0.8 // -0.4 to 0.4 radians
      const radius = 1000 // Match skybox radius
      return [
        Math.cos(elevation) * Math.cos(angle) * radius,
        Math.sin(elevation) * radius,
        Math.cos(elevation) * Math.sin(angle) * radius
      ]
    }

    // Use constellation-based positioning similar to the original system
    const azimuthDeg = config.center[0] + (Math.random() - 0.5) * config.spread
    const elevationDeg = config.center[1] + (Math.random() - 0.5) * config.spread * 0.5
    
    // Convert to 3D coordinates - Match skybox radius exactly
    const radius = 1000 // Base radius for star field (matches skybox)
    const azimuthRad = (azimuthDeg * Math.PI) / 180
    const elevationRad = (elevationDeg * Math.PI) / 180
    
    const x = radius * Math.cos(elevationRad) * Math.cos(azimuthRad)
    const y = radius * Math.sin(elevationRad)
    const z = radius * Math.cos(elevationRad) * Math.sin(azimuthRad)
    
    return [x, y, z]
  }

  /**
   * Check if a timeline event represents a navigable level
   */
  private checkIfEventIsLevel(event: TimelineEvent): { isLevel: boolean, levelId: string | null } {
    // Check if the event has level-specific metadata
    // This could be expanded based on your blog post frontmatter conventions
    
    // Example patterns for level detection:
    const levelPatterns = [
      { pattern: /miranda/i, levelId: 'miranda-ship-level' },
      { pattern: /restaurant|kitchen/i, levelId: 'restaurant-backroom-level' },
      { pattern: /library|infinite.*library/i, levelId: 'infinite-library-level' },
      { pattern: /jerry.*room|personal.*room/i, levelId: 'jerrys-room-level' },
      { pattern: /observatory/i, levelId: 'observatory-level' }
    ]

    // Check title and description for level patterns
    const textToCheck = `${event.title} ${event.description || ''}`.toLowerCase()
    
    for (const { pattern, levelId } of levelPatterns) {
      if (pattern.test(textToCheck)) {
        return { isLevel: true, levelId }
      }
    }

    // Check for explicit level markers in categories or tags
    if (event.category === 'level' || event.category === 'game-level') {
      return { isLevel: true, levelId: event.slug + '-level' }
    }

    return { isLevel: false, levelId: null }
  }

  /**
   * Filter events based on provided options
   */
  private filterEvents(events: StarEventData[], options: {
    category?: string
    startYear?: number
    endYear?: number
    era?: string
    onlyKeyEvents?: boolean
  }): StarEventData[] {
    return events.filter(event => {
      if (options.category && event.category !== options.category) return false
      if (options.startYear && event.year < options.startYear) return false
      if (options.endYear && event.year > options.endYear) return false
      if (options.era && event.era !== options.era) return false
      if (options.onlyKeyEvents && !event.isKeyEvent) return false
      return true
    })
  }

  /**
   * Get events grouped by era (useful for constellation display)
   */
  async getEventsByEra(options: any = {}): Promise<Record<string, StarEventData[]>> {
    const events = await this.loadStarEvents(options)
    const eventsByEra: Record<string, StarEventData[]> = {}
    
    events.forEach(event => {
      const era = event.era || 'unknown'
      if (!eventsByEra[era]) {
        eventsByEra[era] = []
      }
      eventsByEra[era].push(event)
    })
    
    return eventsByEra
  }

  /**
   * Get statistics about loaded events
   */
  async getEventStatistics(): Promise<{
    totalEvents: number
    keyEvents: number
    levelEvents: number
    eras: string[]
    categories: string[]
  }> {
    const events = await this.loadStarEvents()
    
    const eras = [...new Set(events.map(e => e.era).filter(Boolean))]
    const categories = [...new Set(events.map(e => e.category).filter(Boolean))]
    
    return {
      totalEvents: events.length,
      keyEvents: events.filter(e => e.isKeyEvent).length,
      levelEvents: events.filter(e => e.isLevel).length,
      eras,
      categories
    }
  }

  /**
   * Clear the cache (useful for development)
   */
  clearCache(): void {
    this.cachedEvents = []
    this.lastFetchTime = 0
    console.log('📊 TimelineDataService: Cache cleared')
  }

  /**
   * Get a specific event by slug
   */
  async getEventBySlug(slug: string): Promise<StarEventData | null> {
    const events = await this.loadStarEvents()
    return events.find(event => event.slug === slug) || null
  }

  /**
   * Search events by title or description
   */
  async searchEvents(query: string): Promise<StarEventData[]> {
    const events = await this.loadStarEvents()
    const lowercaseQuery = query.toLowerCase()
    
    return events.filter(event => 
      event.title.toLowerCase().includes(lowercaseQuery) ||
      (event.description && event.description.toLowerCase().includes(lowercaseQuery))
    )
  }
}

// Export a singleton instance
export const timelineDataService = new TimelineDataService()