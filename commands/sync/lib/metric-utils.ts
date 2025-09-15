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
 * Sort metrics alphabetically by name
 */
export function sortMetricsAlphabetically(metrics: Metric[]): Metric[] {
  return [...metrics].sort((a, b) => a.name.localeCompare(b.name))
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