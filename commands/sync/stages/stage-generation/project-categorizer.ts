import { Project } from '../../classes'
import type { Metric } from '../../types'

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

/**
 * Convert new project categories to legacy format for navigation builder
 */
export function convertToLegacyFormat(categories: ProjectCategories): Record<'chains' | 'projects' | 'etfs' | 'treasuries', Map<string, Map<string, Metric[]>>> {
  const output = {
    chains: new Map(),
    projects: new Map(),
    etfs: new Map(),
    treasuries: new Map()
  }

  // Helper function to convert project to legacy format
  const convertProject = (project: Project) => {
    const categoryMap = new Map<string, Metric[]>()
    
    // Group metrics by category
    for (const metric of project.metrics) {
      const category = metric.category || 'General'
      if (!categoryMap.has(category)) {
        categoryMap.set(category, [])
      }
      categoryMap.get(category)!.push(metric)
    }
    
    return categoryMap
  }

  // Convert each category
  categories.chains.forEach(project => {
    output.chains.set(project.slug, convertProject(project))
  })
  
  categories.projects.forEach(project => {
    output.projects.set(project.slug, convertProject(project))
  })
  
  categories.etfs.forEach(project => {
    output.etfs.set(project.slug, convertProject(project))
  })
  
  categories.treasuries.forEach(project => {
    output.treasuries.set(project.slug, convertProject(project))
  })

  return output
}