import type { Metric } from '../types'
import { groupMetricsByProjectAndCategory } from '../lib/metric-utils'

export type ProjectCategories = Record<'chains' | 'projects' | 'etfs' | 'treasuries', Map<string, Map<string, Metric[]>>>

/**
 * Categorize projects into Chains, Projects, and Equities based on their metrics
 */
export function categorizeProjects(metrics: Metric[]): ProjectCategories {
  const projectGroups = groupMetricsByProjectAndCategory(metrics)

  const output: ProjectCategories = {
    chains: new Map(),
    projects: new Map(),
    etfs: new Map(),
    treasuries: new Map()
  }

  const lut = {
    'chain': 'chains',
    'project': 'projects',
    'etf': 'etfs',
    'treasury': 'treasuries'
  }

  for (const [project, categoryMap] of projectGroups.entries()) {
    const category = determineProjectCategory(project, categoryMap)
    output[lut[category] as keyof ProjectCategories].set(project, categoryMap)
  }

  return output
}

/**
 * Determine if a project is a Chain, Project, or Equity
 */
function determineProjectCategory(
  project: string,
  categoryMap: Map<string, Metric[]>
): 'chain' | 'project' | 'etf' | 'treasury' {
  const allMetrics = Array.from(categoryMap.values()).flat()

  if (allMetrics.some(metric => metric.identifier === 'transactions-failed') || project.toLowerCase() === 'bitcoin')
    return 'chain'

  if (allMetrics.some(metric => metric.category === 'Treasury'))
    return 'treasury'

  if (allMetrics.some(metric => metric.category === 'ETF'))
    return 'etf'

  return 'project'
}

/**
 * Get categorization summary for logging
 */
export function getCategorySummary(categories: ProjectCategories): {
  chainCount: number
  projectCount: number
  etfCount: number
  treasuryCount: number
  totalMetrics: number
} {
  const chainCount = categories.chains.size
  const projectCount = categories.projects.size
  const etfCount = categories.etfs.size
  const treasuryCount = categories.treasuries.size

  const totalMetrics = [
    ...categories.chains.values(),
    ...categories.projects.values(),
    ...categories.etfs.values(),
    ...categories.treasuries.values()
  ].reduce((total, categoryMap) => {
    return total + Array.from(categoryMap.values()).flat().length
  }, 0)

  return { chainCount, projectCount, etfCount, treasuryCount, totalMetrics }
}