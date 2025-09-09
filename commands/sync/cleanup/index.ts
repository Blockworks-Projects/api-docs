import type { Metric } from '../types'
import { cleanupObsoleteContent, cleanupExistingContent } from './content-cleaner'
import { ensureDirectory } from '../lib/file-operations'

/**
 * Cleanup stage - handles all cleanup operations
 */
export async function runCleanupStage(
  existingMetrics: Set<string>,
  metrics: Metric[],
  outputDir: string
): Promise<{ removedFiles: string[], removedDirs: string[] }> {
  // Stage 1: Clean up obsolete content
  const { removedFiles, removedDirs } = await cleanupObsoleteContent(existingMetrics, metrics, outputDir)
  
  // Stage 2: Wipe existing content for regeneration
  await cleanupExistingContent(metrics, outputDir)
  
  // Stage 3: Ensure output directory exists
  await ensureDirectory(outputDir)
  
  return { removedFiles, removedDirs }
}