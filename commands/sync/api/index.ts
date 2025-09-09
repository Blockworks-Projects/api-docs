import { Project } from '../classes'
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
  projects: Map<string, Project>
  shouldContinue: boolean 
}> {
  // Stage 1: Catalog existing metrics
  const existingMetrics = await catalogExistingMetrics(outputDir)
  
  // Stage 2: Fetch metrics from API
  const { projects, shouldContinue } = await fetchAllMetrics(updateOnlyMode)
  
  return { existingMetrics, projects, shouldContinue }
}