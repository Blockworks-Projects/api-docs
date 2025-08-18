import { exists, rm } from 'node:fs/promises'
import { join } from 'node:path'
import type { Metric } from '../sync.types'
import { colors as c } from './const'

/**
 * Clean up existing asset folders for projects found in metrics
 */
export const cleanupExistingContent = async (metrics: Metric[], outputDir: string): Promise<void> => {
  // Get unique project names from metrics
  const projects = [...new Set(metrics.map(m => m.project))]

  for (const project of projects) {
    const projectDir = join(outputDir, project)

    try {
      // Check if directory exists
      if (await exists(projectDir)) {
        // Remove the entire project directory to clean up old structure
        await rm(projectDir, { recursive: true, force: true })
        console.log(c.muted(`   - Removed ${project}/`))
      }
    } catch (error) {
      console.warn(`⚠️  Failed to remove ${project}/ directory:`, error)
    }
  }
}