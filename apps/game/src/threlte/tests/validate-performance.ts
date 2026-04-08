/**
 * Threlte Performance Validation Script
 * Comprehensive testing and comparison utilities
 */

interface PerformanceMetrics {
  fps: {
    average: number
    min: number
    max: number
    p95: number
    p99: number
  }
  frameTime: {
    average: number
    min: number
    max: number
    p95: number
    p99: number
  }
  memory: {
    initial: number
    peak: number
    final: number
    delta: number
  }
  render: {
    drawCalls: number
    triangles: number
    textures: number
    geometries: number
  }
  test: {
    duration: number
    samples: number
    timestamp: number
    testName: string
  }
}

interface ValidationResult {
  passed: boolean
  score: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  metrics: PerformanceMetrics
  recommendations: string[]
  comparison?: {
    baseline: PerformanceMetrics
    improvement: {
      fps: number
      frameTime: number
      memory: number
    }
  }
}

export class PerformanceValidator {
  private samples: Array<{
    timestamp: number
    fps: number
    frameTime: number
    memory: number
  }> = []
  
  private renderInfo: any = null
  private startTime: number = 0
  private endTime: number = 0
  private isRunning: boolean = false

  /**
   * Start performance monitoring
   */
  public startMonitoring(testName: string): void {
    if (this.isRunning) {
      console.warn('Performance monitoring already running')
      return
    }

    console.log(`🔬 Starting performance monitoring: ${testName}`)
    
    this.samples = []
    this.startTime = performance.now()
    this.isRunning = true
    
    // Start sampling
    this.samplePerformance()
  }

  /**
   * Stop performance monitoring and return results
   */
  public stopMonitoring(testName: string): PerformanceMetrics {
    if (!this.isRunning) {
      throw new Error('Performance monitoring not running')
    }

    this.endTime = performance.now()
    this.isRunning = false

    console.log(`🏁 Stopping performance monitoring: ${testName}`)
    
    return this.calculateMetrics(testName)
  }

  /**
   * Sample performance metrics
   */
  private samplePerformance(): void {
    if (!this.isRunning) return

    const now = performance.now()
    const frameTime = now - (this.lastSampleTime || now)
    this.lastSampleTime = now

    const fps = frameTime > 0 ? 1000 / frameTime : 0
    const memory = this.getMemoryUsage()

    this.samples.push({
      timestamp: now,
      fps,
      frameTime,
      memory
    })

    // Continue sampling
    requestAnimationFrame(() => this.samplePerformance())
  }

  private lastSampleTime: number = 0

  /**
   * Get current memory usage
   */
  private getMemoryUsage(): number {
    if (performance.memory) {
      return performance.memory.usedJSHeapSize
    }
    return 0
  }

  /**
   * Calculate performance metrics from samples
   */
  private calculateMetrics(testName: string): PerformanceMetrics {
    if (this.samples.length === 0) {
      throw new Error('No performance samples collected')
    }

    const fpsSamples = this.samples.map(s => s.fps).filter(fps => fps > 0 && fps < 1000)
    const frameTimeSamples = this.samples.map(s => s.frameTime).filter(ft => ft > 0 && ft < 1000)
    const memorySamples = this.samples.map(s => s.memory).filter(m => m > 0)

    return {
      fps: {
        average: this.calculateAverage(fpsSamples),
        min: Math.min(...fpsSamples),
        max: Math.max(...fpsSamples),
        p95: this.calculatePercentile(fpsSamples, 95),
        p99: this.calculatePercentile(fpsSamples, 99)
      },
      frameTime: {
        average: this.calculateAverage(frameTimeSamples),
        min: Math.min(...frameTimeSamples),
        max: Math.max(...frameTimeSamples),
        p95: this.calculatePercentile(frameTimeSamples, 95),
        p99: this.calculatePercentile(frameTimeSamples, 99)
      },
      memory: {
        initial: memorySamples[0] || 0,
        peak: Math.max(...memorySamples),
        final: memorySamples[memorySamples.length - 1] || 0,
        delta: (memorySamples[memorySamples.length - 1] || 0) - (memorySamples[0] || 0)
      },
      render: this.renderInfo || {
        drawCalls: 0,
        triangles: 0,
        textures: 0,
        geometries: 0
      },
      test: {
        duration: this.endTime - this.startTime,
        samples: this.samples.length,
        timestamp: Date.now(),
        testName
      }
    }
  }

  /**
   * Calculate average of array
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0
    return values.reduce((sum, val) => sum + val, 0) / values.length
  }

  /**
   * Calculate percentile of array
   */
  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0
    
    const sorted = values.slice().sort((a, b) => a - b)
    const index = Math.ceil((percentile / 100) * sorted.length) - 1
    return sorted[Math.max(0, index)]
  }

  /**
   * Validate performance against targets
   */
  public validatePerformance(
    metrics: PerformanceMetrics,
    targets: {
      minFPS?: number
      maxFrameTime?: number
      maxMemoryDelta?: number
      maxDrawCalls?: number
    } = {}
  ): ValidationResult {
    const defaultTargets = {
      minFPS: 30,
      maxFrameTime: 33.33, // 30 FPS
      maxMemoryDelta: 50 * 1024 * 1024, // 50MB
      maxDrawCalls: 200,
      ...targets
    }

    const issues: string[] = []
    let score = 100

    // FPS validation
    if (metrics.fps.average < defaultTargets.minFPS) {
      issues.push(`Average FPS (${metrics.fps.average.toFixed(1)}) below target (${defaultTargets.minFPS})`)
      score -= 30
    }

    if (metrics.fps.min < defaultTargets.minFPS * 0.7) {
      issues.push(`Minimum FPS (${metrics.fps.min.toFixed(1)}) critically low`)
      score -= 20
    }

    // Frame time validation
    if (metrics.frameTime.p95 > defaultTargets.maxFrameTime) {
      issues.push(`95th percentile frame time (${metrics.frameTime.p95.toFixed(2)}ms) exceeds target`)
      score -= 15
    }

    // Memory validation
    if (metrics.memory.delta > defaultTargets.maxMemoryDelta) {
      issues.push(`Memory increase (${(metrics.memory.delta / 1024 / 1024).toFixed(1)}MB) exceeds target`)
      score -= 10
    }

    // Render validation
    if (metrics.render.drawCalls > defaultTargets.maxDrawCalls) {
      issues.push(`Draw calls (${metrics.render.drawCalls}) exceed target (${defaultTargets.maxDrawCalls})`)
      score -= 10
    }

    // Frame time consistency
    const frameTimeVariance = metrics.frameTime.max - metrics.frameTime.min
    if (frameTimeVariance > 50) {
      issues.push(`High frame time variance (${frameTimeVariance.toFixed(2)}ms)`)
      score -= 5
    }

    score = Math.max(0, score)

    const grade = this.calculateGrade(score)
    const recommendations = this.generateRecommendations(metrics, issues)

    return {
      passed: issues.length === 0,
      score,
      grade,
      metrics,
      recommendations
    }
  }

  /**
   * Calculate letter grade from score
   */
  private calculateGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A'
    if (score >= 80) return 'B'
    if (score >= 70) return 'C'
    if (score >= 60) return 'D'
    return 'F'
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(metrics: PerformanceMetrics, issues: string[]): string[] {
    const recommendations: string[] = []

    if (metrics.fps.average < 45) {
      recommendations.push('Consider reducing scene complexity or enabling LOD system')
    }

    if (metrics.render.drawCalls > 100) {
      recommendations.push('Implement geometry instancing to reduce draw calls')
    }

    if (metrics.render.triangles > 500000) {
      recommendations.push('Use mesh simplification or LOD for high polygon models')
    }

    if (metrics.memory.delta > 20 * 1024 * 1024) {
      recommendations.push('Check for memory leaks or excessive texture usage')
    }

    if (metrics.frameTime.p99 > 50) {
      recommendations.push('Optimize worst-case frame time spikes')
    }

    if (issues.length === 0 && metrics.fps.average > 55) {
      recommendations.push('Performance is excellent! Consider enabling higher quality settings')
    }

    return recommendations
  }

  /**
   * Compare two performance metrics
   */
  public comparePerformance(
    baseline: PerformanceMetrics,
    current: PerformanceMetrics
  ): ValidationResult {
    const comparison = {
      baseline,
      improvement: {
        fps: ((current.fps.average - baseline.fps.average) / baseline.fps.average) * 100,
        frameTime: ((baseline.frameTime.average - current.frameTime.average) / baseline.frameTime.average) * 100,
        memory: ((baseline.memory.delta - current.memory.delta) / Math.max(baseline.memory.delta, 1)) * 100
      }
    }

    const result = this.validatePerformance(current)
    result.comparison = comparison

    // Add comparison-specific recommendations
    if (comparison.improvement.fps > 10) {
      result.recommendations.unshift('Significant FPS improvement detected!')
    } else if (comparison.improvement.fps < -10) {
      result.recommendations.unshift('FPS regression detected - investigate recent changes')
    }

    if (comparison.improvement.memory > 20) {
      result.recommendations.unshift('Memory usage significantly improved!')
    } else if (comparison.improvement.memory < -20) {
      result.recommendations.unshift('Memory usage increased - check for leaks')
    }

    return result
  }

  /**
   * Export metrics for analysis
   */
  public exportMetrics(metrics: PerformanceMetrics): string {
    return JSON.stringify({
      ...metrics,
      exportedAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
      platform: navigator.platform
    }, null, 2)
  }

  /**
   * Set render info from external source
   */
  public setRenderInfo(renderInfo: any): void {
    this.renderInfo = renderInfo
  }
}

/**
 * Utility functions for performance testing
 */
export const PerformanceTestUtils = {
  /**
   * Create a standard performance test
   */
  async runStandardTest(
    testName: string,
    duration: number = 10000
  ): Promise<ValidationResult> {
    const validator = new PerformanceValidator()
    
    validator.startMonitoring(testName)
    
    // Wait for test duration
    await new Promise(resolve => setTimeout(resolve, duration))
    
    const metrics = validator.stopMonitoring(testName)
    return validator.validatePerformance(metrics)
  },

  /**
   * Compare Three.js vs Threlte performance
   */
  async compareVersions(
    threeJSMetrics: PerformanceMetrics,
    threlteMetrics: PerformanceMetrics
  ): Promise<{
    threeJS: ValidationResult
    threlte: ValidationResult
    comparison: ValidationResult
  }> {
    const validator = new PerformanceValidator()
    
    const threeJSResult = validator.validatePerformance(threeJSMetrics)
    const threlteResult = validator.validatePerformance(threlteMetrics)
    const comparisonResult = validator.comparePerformance(threeJSMetrics, threlteMetrics)
    
    return {
      threeJS: threeJSResult,
      threlte: threlteResult,
      comparison: comparisonResult
    }
  },

  /**
   * Generate performance report
   */
  generateReport(results: ValidationResult[]): string {
    let report = '# Performance Test Report\n\n'
    report += `Generated: ${new Date().toISOString()}\n\n`
    
    results.forEach((result, index) => {
      report += `## Test ${index + 1}: ${result.metrics.test.testName}\n\n`
      report += `**Grade: ${result.grade}** (Score: ${result.score}/100)\n\n`
      
      report += '### Metrics\n'
      report += `- Average FPS: ${result.metrics.fps.average.toFixed(1)}\n`
      report += `- Min FPS: ${result.metrics.fps.min.toFixed(1)}\n`
      report += `- Average Frame Time: ${result.metrics.frameTime.average.toFixed(2)}ms\n`
      report += `- Memory Delta: ${(result.metrics.memory.delta / 1024 / 1024).toFixed(1)}MB\n`
      report += `- Draw Calls: ${result.metrics.render.drawCalls}\n\n`
      
      if (result.recommendations.length > 0) {
        report += '### Recommendations\n'
        result.recommendations.forEach(rec => {
          report += `- ${rec}\n`
        })
        report += '\n'
      }
      
      if (result.comparison) {
        report += '### Comparison\n'
        report += `- FPS Improvement: ${result.comparison.improvement.fps.toFixed(1)}%\n`
        report += `- Frame Time Improvement: ${result.comparison.improvement.frameTime.toFixed(1)}%\n`
        report += `- Memory Improvement: ${result.comparison.improvement.memory.toFixed(1)}%\n\n`
      }
    })
    
    return report
  }
}

// Export for use in browser
if (typeof window !== 'undefined') {
  (window as any).PerformanceValidator = PerformanceValidator
  (window as any).PerformanceTestUtils = PerformanceTestUtils
}