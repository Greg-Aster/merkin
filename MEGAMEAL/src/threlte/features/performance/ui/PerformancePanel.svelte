<!-- 
  Threlte Performance Monitoring Panel
  Real-time performance metrics and optimization controls
-->
<script lang="ts">
import { onMount, onDestroy } from 'svelte'
import {
  fpsStore,
  frameTimeStore,
  memoryStore,
  renderInfoStore,
  qualityLevelStore,
  performanceGradeStore,
  performanceScoreStore,
  optimizationRecommendationsStore,
} from '../stores/performanceStore'

// Props
export let visible = false
export let position = 'top-right'
export let compact = false

// Performance data
let fps = 60
let frameTime = 16.67
let memory = { geometries: 0, textures: 0, programs: 0 }
let renderInfo = { calls: 0, triangles: 0, points: 0, lines: 0 }
let qualityLevel = 'medium'
let performanceGrade = 'A'
let performanceScore = 100
let recommendations = []

// Chart data for performance history
let performanceHistory: Array<{time: number, fps: number, frameTime: number}> = []
let maxHistoryLength = 60 // 60 seconds of data

// Subscribe to performance stores
const unsubscribeFPS = fpsStore.subscribe(value => {
  fps = value
  updatePerformanceHistory()
})

const unsubscribeFrameTime = frameTimeStore.subscribe(value => {
  frameTime = value
})

const unsubscribeMemory = memoryStore.subscribe(value => {
  memory = value
})

const unsubscribeRenderInfo = renderInfoStore.subscribe(value => {
  renderInfo = value
})

const unsubscribeQuality = qualityLevelStore.subscribe(value => {
  qualityLevel = value
})

const unsubscribeGrade = performanceGradeStore.subscribe(value => {
  performanceGrade = value
})

const unsubscribeScore = performanceScoreStore.subscribe(value => {
  performanceScore = value
})

const unsubscribeRecommendations = optimizationRecommendationsStore.subscribe(value => {
  recommendations = value
})

function updatePerformanceHistory() {
  const now = Date.now()
  performanceHistory.push({ time: now, fps, frameTime })
  
  // Keep only recent data
  const cutoff = now - maxHistoryLength * 1000
  performanceHistory = performanceHistory.filter(entry => entry.time >= cutoff)
}

function getPerformanceGradeColor(grade: string): string {
  switch (grade) {
    case 'A': return '#22c55e'
    case 'B': return '#84cc16'  
    case 'C': return '#eab308'
    case 'D': return '#f97316'
    case 'F': return '#ef4444'
    default: return '#6b7280'
  }
}

function getQualityLevelColor(level: string): string {
  switch (level) {
    case 'ultra': return '#8b5cf6'
    case 'high': return '#3b82f6'
    case 'medium': return '#10b981'
    case 'low': return '#f59e0b'
    case 'ultra_low': return '#ef4444'
    default: return '#6b7280'
  }
}

function formatNumber(num: number, decimals = 0): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k'
  }
  return num.toFixed(decimals)
}

onDestroy(() => {
  unsubscribeFPS()
  unsubscribeFrameTime()
  unsubscribeMemory()
  unsubscribeRenderInfo()
  unsubscribeQuality()
  unsubscribeGrade()
  unsubscribeScore()
  unsubscribeRecommendations()
})
</script>

{#if visible}
  <div 
    class="performance-panel {position} {compact ? 'compact' : 'full'}"
    class:inline={position === 'inline'}
    class:top-left={position === 'top-left'}
    class:top-right={position === 'top-right'}
    class:bottom-left={position === 'bottom-left'}
    class:bottom-right={position === 'bottom-right'}
  >
    <!-- Header -->
    <div class="panel-header">
      <h3>⚡ Performance Monitor</h3>
      <div class="performance-grade" style="color: {getPerformanceGradeColor(performanceGrade)}">
        Grade: {performanceGrade}
      </div>
    </div>

    <!-- Performance Metrics -->
    <div class="metrics-grid">
      <!-- FPS Display -->
      <div class="metric-card fps-card">
        <div class="metric-label">FPS</div>
        <div class="metric-value" class:good={fps >= 55} class:warning={fps >= 30 && fps < 55} class:critical={fps < 30}>
          {fps}
        </div>
        <div class="metric-target">Target: 60</div>
      </div>

      <!-- Frame Time -->
      <div class="metric-card">
        <div class="metric-label">Frame Time</div>
        <div class="metric-value">{frameTime.toFixed(2)}ms</div>
        <div class="metric-target">Target: 16.67ms</div>
      </div>

      <!-- Performance Score -->
      <div class="metric-card">
        <div class="metric-label">Score</div>
        <div class="metric-value">{performanceScore}/100</div>
        <div class="metric-progress">
          <div class="progress-bar" style="width: {performanceScore}%; background-color: {getPerformanceGradeColor(performanceGrade)}"></div>
        </div>
      </div>

      <!-- Quality Level -->
      <div class="metric-card">
        <div class="metric-label">Quality</div>
        <div class="metric-value quality-badge" style="background-color: {getQualityLevelColor(qualityLevel)}">
          {qualityLevel.toUpperCase()}
        </div>
      </div>
    </div>

    {#if !compact}
      <!-- Memory Usage -->
      <div class="section">
        <h4>Memory Usage</h4>
        <div class="memory-grid">
          <div class="memory-item">
            <span>Geometries:</span>
            <span>{memory.geometries}</span>
          </div>
          <div class="memory-item">
            <span>Textures:</span>
            <span>{memory.textures}</span>
          </div>
          <div class="memory-item">
            <span>Programs:</span>
            <span>{memory.programs}</span>
          </div>
        </div>
      </div>

      <!-- Render Statistics -->
      <div class="section">
        <h4>Render Info</h4>
        <div class="render-grid">
          <div class="render-item">
            <span>Draw Calls:</span>
            <span class:warning={renderInfo.calls > 100}>{renderInfo.calls}</span>
          </div>
          <div class="render-item">
            <span>Triangles:</span>
            <span class:warning={renderInfo.triangles > 500000}>{formatNumber(renderInfo.triangles)}</span>
          </div>
          <div class="render-item">
            <span>Points:</span>
            <span>{formatNumber(renderInfo.points)}</span>
          </div>
          <div class="render-item">
            <span>Lines:</span>
            <span>{formatNumber(renderInfo.lines)}</span>
          </div>
        </div>
      </div>

      <!-- Performance Chart -->
      <div class="section">
        <h4>Performance History</h4>
        <div class="chart-container">
          <svg class="performance-chart" viewBox="0 0 300 100">
            <!-- Grid lines -->
            {#each Array(5) as _, i}
              <line 
                x1="0" 
                y1={i * 20} 
                x2="300" 
                y2={i * 20} 
                stroke="#333" 
                stroke-width="0.5"
                opacity="0.3"
              />
            {/each}

            <!-- FPS line -->
            {#if performanceHistory.length > 1}
              <polyline
                points={performanceHistory.map((entry, i) => {
                  const x = (i / (performanceHistory.length - 1)) * 300
                  const y = 100 - (entry.fps / 80) * 100 // Scale to 80 FPS max
                  return `${x},${Math.max(0, Math.min(100, y))}`
                }).join(' ')}
                fill="none"
                stroke="#22c55e"
                stroke-width="2"
              />
            {/if}

            <!-- Frame time line (scaled) -->
            {#if performanceHistory.length > 1}
              <polyline
                points={performanceHistory.map((entry, i) => {
                  const x = (i / (performanceHistory.length - 1)) * 300
                  const y = (entry.frameTime / 50) * 100 // Scale to 50ms max
                  return `${x},${Math.max(0, Math.min(100, y))}`
                }).join(' ')}
                fill="none"
                stroke="#f59e0b"
                stroke-width="1"
                opacity="0.7"
              />
            {/if}
          </svg>
          <div class="chart-legend">
            <span style="color: #22c55e">— FPS</span>
            <span style="color: #f59e0b">— Frame Time</span>
          </div>
        </div>
      </div>

      <!-- Optimization Recommendations -->
      {#if recommendations.length > 0}
        <div class="section">
          <h4>🎯 Recommendations</h4>
          <div class="recommendations">
            {#each recommendations as recommendation}
              <div class="recommendation-item">
                {recommendation}
              </div>
            {/each}
          </div>
        </div>
      {/if}
    {/if}
  </div>
{/if}

<style>
  .performance-panel {
    position: fixed;
    z-index: 1000;
    background: rgba(0, 0, 0, 0.9);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 16px;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    color: #ffffff;
    min-width: 280px;
    max-height: 80vh;
    overflow-y: auto;
  }

  .performance-panel.compact {
    min-width: 200px;
    padding: 12px;
  }

  .performance-panel.inline {
    position: relative;
    z-index: auto;
    background: none;
    border: none;
    padding: 0;
  }

  .top-left {
    top: 20px;
    left: 20px;
  }

  .top-right {
    top: 20px;
    right: 20px;
  }

  .bottom-left {
    bottom: 20px;
    left: 20px;
  }

  .bottom-right {
    bottom: 20px;
    right: 20px;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding-bottom: 8px;
  }

  .panel-header h3 {
    margin: 0;
    font-size: 14px;
    font-weight: bold;
  }

  .performance-grade {
    font-weight: bold;
    font-size: 13px;
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin-bottom: 16px;
  }

  .metric-card {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    padding: 12px;
    text-align: center;
  }

  .metric-label {
    font-size: 10px;
    color: #cccccc;
    margin-bottom: 4px;
  }

  .metric-value {
    font-size: 18px;
    font-weight: bold;
    margin-bottom: 4px;
  }

  .metric-value.good {
    color: #22c55e;
  }

  .metric-value.warning {
    color: #f59e0b;
  }

  .metric-value.critical {
    color: #ef4444;
  }

  .metric-target {
    font-size: 9px;
    color: #888888;
  }

  .quality-badge {
    display: inline-block;
    padding: 4px 8px;
    border-radius: 4px;
    color: white;
    font-size: 10px;
    font-weight: bold;
  }

  .metric-progress {
    width: 100%;
    height: 4px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
    overflow: hidden;
    margin-top: 4px;
  }

  .progress-bar {
    height: 100%;
    transition: width 0.3s ease;
  }

  .section {
    margin-bottom: 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding-top: 12px;
  }

  .section h4 {
    margin: 0 0 8px 0;
    font-size: 12px;
    color: #cccccc;
  }

  .memory-grid,
  .render-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .memory-item,
  .render-item {
    display: flex;
    justify-content: space-between;
    padding: 4px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 4px;
  }

  .render-item span.warning {
    color: #f59e0b;
    font-weight: bold;
  }

  .chart-container {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 6px;
    padding: 8px;
  }

  .performance-chart {
    width: 100%;
    height: 60px;
  }

  .chart-legend {
    display: flex;
    justify-content: center;
    gap: 16px;
    margin-top: 4px;
    font-size: 10px;
  }

  .recommendations {
    max-height: 100px;
    overflow-y: auto;
  }

  .recommendation-item {
    background: rgba(255, 165, 0, 0.1);
    border-left: 3px solid #f59e0b;
    padding: 8px;
    margin-bottom: 4px;
    font-size: 11px;
    border-radius: 0 4px 4px 0;
  }

  /* Scrollbar styling */
  .performance-panel::-webkit-scrollbar,
  .recommendations::-webkit-scrollbar {
    width: 6px;
  }

  .performance-panel::-webkit-scrollbar-track,
  .recommendations::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
  }

  .performance-panel::-webkit-scrollbar-thumb,
  .recommendations::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 3px;
  }

  .performance-panel::-webkit-scrollbar-thumb:hover,
  .recommendations::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.5);
  }
</style>