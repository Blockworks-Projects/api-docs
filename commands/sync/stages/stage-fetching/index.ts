import { Project } from '../../classes'
import { fetchAllMetrics } from './metrics-api'
import { catalogExistingMetrics } from '../stage-scanning/metrics-catalog'

type FetchingStageConfig = { 
  outputDir: string
  updateOnlyMode?: boolean 
}

export const runFetchingStage = async ({ 
  outputDir, 
  updateOnlyMode = false 
}: FetchingStageConfig): Promise<{ 
  existingMetrics: Set<string>
  projects: Map<string, Project>
  shouldContinue: boolean 
}> => {
  const existingMetrics = await catalogExistingMetrics(outputDir)
  const { projects, shouldContinue } = await fetchAllMetrics(updateOnlyMode)
  
  return { existingMetrics, projects, shouldContinue }
}

// Re-export for backwards compatibility
export const runApiStage = runFetchingStage