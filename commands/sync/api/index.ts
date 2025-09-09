import type { Metric } from '../types'
import { fetchAllMetrics } from './metrics-api'
import { catalogExistingMetrics } from '../cleanup/metrics-catalog'

/**
 * API stage - handles all API-related operations
 */
export async function runApiStage(
  outputDir: string, 
  updateOnlyMode: boolean = false
): Promise<{ 
  existingMetrics: Set<string>
  metrics: Metric[]
  shouldContinue: boolean 
}> {
  // Stage 1: Catalog existing metrics
  const existingMetrics = await catalogExistingMetrics(outputDir)
  
  // Stage 2: Fetch metrics from API
  const { metrics, shouldContinue } = await fetchAllMetrics(updateOnlyMode)
  
  return { existingMetrics, metrics, shouldContinue }
}