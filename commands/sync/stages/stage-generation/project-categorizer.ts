import { Project } from '../../classes'
import type { Metric } from '../../types'
import { groupMetricsByProjectAndCategory } from '../../lib/metric-utils'

export type ProjectCategories = Record<'chains' | 'projects' | 'etfs' | 'treasuries', Project[]>

/**
 * Categorize projects into Chains, Projects, ETFs and Treasuries using Project class
 */
export function categorizeProjects(projects: Map<string, Project>): ProjectCategories {
  const output: ProjectCategories = {
    chains: [],
    projects: [],
    etfs: [],
    treasuries: []
  }

  for (const project of projects.values()) {
    switch (project.type) {
      case 'chain':
        output.chains.push(project)
        break
      case 'etf':
        output.etfs.push(project)
        break
      case 'treasury':
        output.treasuries.push(project)
        break
      default:
        output.projects.push(project)
    }
  }

  return output
}

/**
 * Legacy categorization for backward compatibility
 */
export function categorizeMetrics(metrics: Metric[]): Record<'chains' | 'projects' | 'etfs' | 'treasuries', Map<string, Map<string, Metric[]>>> {
  const projectGroups = groupMetricsByProjectAndCategory(metrics)

  const output = {
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
    output[lut[category] as keyof typeof output].set(project, categoryMap)
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
  const chainCount = categories.chains.length
  const projectCount = categories.projects.length
  const etfCount = categories.etfs.length
  const treasuryCount = categories.treasuries.length

  const totalMetrics = [
    ...categories.chains,
    ...categories.projects,
    ...categories.etfs,
    ...categories.treasuries
  ].reduce((total, project) => total + project.metrics.length, 0)

  return { chainCount, projectCount, etfCount, treasuryCount, totalMetrics }
}