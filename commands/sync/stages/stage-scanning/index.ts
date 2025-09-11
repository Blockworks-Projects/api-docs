import { catalogExistingMetrics, compareMetrics } from './metrics-catalog'

/**
 * Scanning stage - catalog existing metrics and compare with incoming
 */
export async function runScanningStage(outputDir: string): Promise<Set<string>> {
  return await catalogExistingMetrics(outputDir)
}

export { catalogExistingMetrics, compareMetrics }