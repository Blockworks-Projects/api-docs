import { colors as c } from './constants'

/**
 * Progress bar utility for visual feedback during long operations
 */
export class ProgressBar {
  private total: number
  private current: number = 0
  private width: number = 50
  private label: string
  private startTime: number = Date.now()

  constructor(total: number, label: string = 'Progress', width: number = 50) {
    this.total = total
    this.label = label
    this.width = width
  }

  /**
   * Update progress and render bar
   */
  update(current: number): void {
    this.current = current
    this.render()
  }

  /**
   * Increment progress by 1
   */
  increment(): void {
    this.current = Math.min(this.current + 1, this.total)
    this.render()
  }

  /**
   * Complete the progress bar
   */
  complete(): void {
    this.current = this.total
    this.render()
    process.stdout.write('\n')
  }

  /**
   * Render the progress bar
   */
  private render(): void {
    const percent = this.total > 0 ? this.current / this.total : 0
    const filled = Math.round(this.width * percent)
    const empty = this.width - filled
    
    const bar = '#'.repeat(filled) + '.'.repeat(empty)
    const percentage = Math.round(percent * 100)
    
    const elapsed = Math.round((Date.now() - this.startTime) / 1000)
    const rate = this.current / Math.max(elapsed, 1)
    const eta = this.current > 0 ? Math.round((this.total - this.current) / rate) : 0
    
    const info = `${this.current}/${this.total} (${percentage}%) ${elapsed}s`
    
    // Clear line and write progress
    process.stdout.write(`\r   [${c.darkGreen(bar)}] ${info}`)
    
    if (this.current === this.total) {
      process.stdout.write(` ${c.green('✓')}`)
    }
  }
}

/**
 * Console utilities for stage output
 */
export class StageLogger {
  /**
   * Start a stage without newline
   */
  static start(message: string): void {
    process.stdout.write(c.subHeader(`\n  ${message}...`))
  }

  /**
   * Mark stage as successful
   */
  static ok(summary?: string): void {
    process.stdout.write(` ${c.green('ok')}`)
    if (summary) {
      process.stdout.write(c.muted(` (${summary})`))
    }
    process.stdout.write('\n')
  }

  /**
   * Mark stage as failed with error details
   */
  static error(error: string): void {
    process.stdout.write(` ${c.red('error')}\n`)
    console.log(c.warning(`     ${error}`))
  }

  /**
   * Add details without newline (for progress bars, etc.)
   */
  static details(message: string): void {
    process.stdout.write(`\n     ${c.muted(message)}`)
  }
}