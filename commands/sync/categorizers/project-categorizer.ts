import type { Metric } from '../types'
import { groupMetricsByProjectAndCategory } from '../lib/metric-utils'

export interface ProjectCategories {
  chains: Map<string, Map<string, Metric[]>>
  projects: Map<string, Map<string, Metric[]>>
  equities: Map<string, Map<string, Metric[]>>
}

/**
 * Categorize projects into Chains, Projects, and Equities based on their metrics
 */
export function categorizeProjects(metrics: Metric[]): ProjectCategories {
  const projectGroups = groupMetricsByProjectAndCategory(metrics)
  
  const chains = new Map<string, Map<string, Metric[]>>()
  const projects = new Map<string, Map<string, Metric[]>>()
  const equities = new Map<string, Map<string, Metric[]>>()

  for (const [project, categoryMap] of projectGroups.entries()) {
    const category = determineProjectCategory(project, categoryMap)
    
    switch (category) {
      case 'chain':
        chains.set(project, categoryMap)
        break
      case 'equity':
        equities.set(project, categoryMap)
        break
      default:
        projects.set(project, categoryMap)
        break
    }
  }

  return { chains, projects, equities }
}

/**
 * Determine if a project is a Chain, Project, or Equity
 */
function determineProjectCategory(
  project: string, 
  categoryMap: Map<string, Metric[]>
): 'chain' | 'project' | 'equity' {
  const allMetrics = Array.from(categoryMap.values()).flat()
  
  // Check if this project has a treasury-crypto-asset metric (Equity)
  const hasEquityMetric = allMetrics.some(metric => 
    metric.identifier === 'treasury-crypto-asset'
  )
  
  if (hasEquityMetric) {
    return 'equity'
  }
  
  // Check if this project has chain-specific metrics OR is Bitcoin (Chain)
  const hasChainMetric = allMetrics.some(metric => 
    metric.identifier === 'transactions-failed'
  )
  const isBitcoin = project.toLowerCase() === 'bitcoin'
  
  if (hasChainMetric || isBitcoin) {
    return 'chain'
  }
  
  return 'project'
}

/**
 * Get categorization summary for logging
 */
export function getCategorySummary(categories: ProjectCategories): {
  chainCount: number
  projectCount: number
  equityCount: number
  totalMetrics: number
} {
  const chainCount = categories.chains.size
  const projectCount = categories.projects.size
  const equityCount = categories.equities.size
  
  const totalMetrics = [
    ...categories.chains.values(),
    ...categories.projects.values(),
    ...categories.equities.values()
  ].reduce((total, categoryMap) => {
    return total + Array.from(categoryMap.values()).flat().length
  }, 0)
  
  return { chainCount, projectCount, equityCount, totalMetrics }
}