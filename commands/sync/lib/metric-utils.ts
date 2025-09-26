import type { Metric } from '../types'

/**
 * Group metrics by project
 */
export function groupMetricsByProject(metrics: Metric[]): Map<string, Metric[]> {
  const groups = new Map<string, Metric[]>()
  
  for (const metric of metrics) {
    if (!groups.has(metric.project)) {
      groups.set(metric.project, [])
    }
    groups.get(metric.project)!.push(metric)
  }
  
  return groups
}

/**
 * Group metrics by project and category
 */
export function groupMetricsByProjectAndCategory(metrics: Metric[]): Map<string, Map<string, Metric[]>> {
  const groups = new Map<string, Map<string, Metric[]>>()
  
  for (const metric of metrics) {
    if (!groups.has(metric.project)) {
      groups.set(metric.project, new Map())
    }
    
    const projectGroup = groups.get(metric.project)!
    if (!projectGroup.has(metric.category)) {
      projectGroup.set(metric.category, [])
    }
    
    projectGroup.get(metric.category)!.push(metric)
  }
  
  return groups
}

/**
 * Sort metrics alphabetically by name, with native versions before USD versions for same-named metrics
 */
export function sortMetricsAlphabetically(metrics: Metric[]): Metric[] {
  return [...metrics].sort((a, b) => {
    // First sort by name
    const nameComparison = a.name.localeCompare(b.name)
    if (nameComparison !== 0) {
      return nameComparison
    }

    // If names are equal, put native versions before USD versions
    // USD metrics have denomination "USD", others come first
    if (a.denomination === 'USD' && b.denomination !== 'USD') {
      return 1 // a comes after b
    }
    if (a.denomination !== 'USD' && b.denomination === 'USD') {
      return -1 // a comes before b
    }

    // If both are USD or both are non-USD, maintain original order
    return 0
  })
}

/**
 * Get unique projects from metrics
 */
export function getUniqueProjects(metrics: Metric[]): string[] {
  return [...new Set(metrics.map(m => m.project))]
}

/**
 * Get unique categories from metrics
 */
export function getUniqueCategories(metrics: Metric[]): string[] {
  return [...new Set(metrics.map(m => m.category))]
}

/**
 * Find metric by project and identifier
 */
export function findMetric(metrics: Metric[], project: string, identifier: string): Metric | undefined {
  return metrics.find(m => m.project === project && m.identifier === identifier)
}

/**
 * Check if a USD metric has a title conflict with non-USD metrics in the given scope
 */
export const hasUsdTitleConflict = (metric: Metric, scopeMetrics: Metric[]): boolean => {
  if (metric.denomination !== 'USD') return false

  return scopeMetrics.some(other =>
    other.identifier !== metric.identifier &&
    other.title === metric.title &&
    other.denomination !== 'USD'
  )
}