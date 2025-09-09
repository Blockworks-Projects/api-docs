import { Project } from '../classes'
import { fetchAllMetrics } from './metrics-api'
import { catalogExistingMetrics } from '../cleanup/metrics-catalog'

type ApiStageConfig = { 
  outputDir: string
  updateOnlyMode?: boolean 
}

export const runApiStage = async ({ 
  outputDir, 
  updateOnlyMode = false 
}: ApiStageConfig): Promise<{ 
  existingMetrics: Set<string>
  projects: Map<string, Project>
  shouldContinue: boolean 
}> => {
  const existingMetrics = await catalogExistingMetrics(outputDir)
  const { projects, shouldContinue } = await fetchAllMetrics(updateOnlyMode)
  
  return { existingMetrics, projects, shouldContinue }
}