import type { Metric } from '../types'
import type { ProjectCategories } from '../categorizers/project-categorizer'
import { colors as c } from '../lib/constants'
import { sortMetricsAlphabetically } from '../lib/metric-utils'
import { toTitleCase } from '../lib/utils'

interface NavigationGroup {
  group: string
  pages: any[]
  tag?: string
  icon?: string
}

/**
 * Build navigation structure for all project categories
 */
export function buildNavigationStructure(
  categories: ProjectCategories,
  expandOptions?: string[]
): { 
  chainsGroup: NavigationGroup
  projectsGroup: NavigationGroup
  equitiesGroup: NavigationGroup
  assetsUpdate?: any
} {
  console.log(c.subHeader('\n  Building navigation structure...'))

  // Create navigation groups
  const chainsGroup = buildChainsNavigation(categories.chains)
  const projectsGroup = buildProjectsNavigation(categories.projects)
  const equitiesGroup = buildEquitiesNavigation(categories.equities)

  // Build assets navigation if expand options provided
  const assetsUpdate = expandOptions ? buildAssetsNavigation(expandOptions) : undefined

  return { chainsGroup, projectsGroup, equitiesGroup, assetsUpdate }
}

/**
 * Build navigation for Chain projects (with categories)
 */
function buildChainsNavigation(chains: Map<string, Map<string, Metric[]>>): NavigationGroup {
  console.log(c.subHeader('\n  Processing Chain projects...'))
  
  const chainsGroup: NavigationGroup = {
    group: 'Metrics : Chains',
    pages: [],
    tag: `${chains.size}`
  }

  const sortedChains = Array.from(chains.entries()).sort(([a], [b]) => a.localeCompare(b))
  
  for (const [project, categoryMap] of sortedChains) {
    console.log(c.warning(`\n   🔗 ${project.toUpperCase()}`))

    const projectGroup: any = {
      group: toTitleCase(project),
      icon: "link",
      pages: []
    }

    // Sort categories alphabetically
    const sortedCategories = Array.from(categoryMap.keys()).sort()

    for (const category of sortedCategories) {
      const categoryMetrics = categoryMap.get(category)!
      const sortedMetrics = sortMetricsAlphabetically(categoryMetrics)

      console.log(c.muted(`      + Creating ${category} subgroup with ${c.number(sortedMetrics.length)} metrics`))

      // Chains keep category subgroups in navigation
      const categoryGroup = {
        group: category,
        pages: sortedMetrics.map(metric => `api-reference/metrics/${project}/${metric.identifier}`)
      }
      projectGroup.pages.push(categoryGroup)
    }

    chainsGroup.pages.push(projectGroup)
  }

  return chainsGroup
}

/**
 * Build navigation for Project projects (flat list)
 */
function buildProjectsNavigation(projects: Map<string, Map<string, Metric[]>>): NavigationGroup {
  console.log(c.subHeader('\n  Processing Project projects...'))
  
  const projectsGroup: NavigationGroup = {
    group: 'Metrics : Projects',
    pages: [],
    tag: `${projects.size}`
  }

  const sortedProjects = Array.from(projects.entries()).sort(([a], [b]) => a.localeCompare(b))
  
  for (const [project, categoryMap] of sortedProjects) {
    console.log(c.warning(`\n   📊 ${project.toUpperCase()}`))

    const projectGroup: any = {
      group: toTitleCase(project),
      icon: "cube",
      pages: []
    }

    // Collect all metrics from all categories and sort alphabetically
    const allMetrics: Metric[] = []
    for (const categoryMetrics of categoryMap.values()) {
      allMetrics.push(...categoryMetrics)
    }
    const sortedMetrics = sortMetricsAlphabetically(allMetrics)

    console.log(c.muted(`      + Adding ${c.number(sortedMetrics.length)} metrics (no category groups)`))

    // Projects don't have category subgroups - flat list of metrics
    projectGroup.pages = sortedMetrics.map(metric => `api-reference/metrics/${project}/${metric.identifier}`)

    projectsGroup.pages.push(projectGroup)
  }

  return projectsGroup
}

/**
 * Build navigation for Equity projects (flat list)
 */
function buildEquitiesNavigation(equities: Map<string, Map<string, Metric[]>>): NavigationGroup {
  console.log(c.subHeader('\n  Processing Equity projects...'))
  
  const equitiesGroup: NavigationGroup = {
    group: 'Metrics : Equities',
    pages: [],
    tag: `${equities.size}`
  }

  const sortedEquities = Array.from(equities.entries()).sort(([a], [b]) => a.localeCompare(b))
  
  for (const [project, categoryMap] of sortedEquities) {
    console.log(c.warning(`\n   📈 ${project.toUpperCase()}`))

    const projectGroup: any = {
      group: toTitleCase(project),
      icon: "chart-line",
      pages: []
    }

    // Collect all metrics from all categories and sort alphabetically
    const allMetrics: Metric[] = []
    for (const categoryMetrics of categoryMap.values()) {
      allMetrics.push(...categoryMetrics)
    }
    const sortedMetrics = sortMetricsAlphabetically(allMetrics)

    console.log(c.muted(`      + Adding ${c.number(sortedMetrics.length)} metrics (no category groups)`))

    // Equities don't have category subgroups - flat list of metrics
    projectGroup.pages = sortedMetrics.map(metric => `api-reference/metrics/${project}/${metric.identifier}`)

    equitiesGroup.pages.push(projectGroup)
  }

  return equitiesGroup
}

/**
 * Build assets navigation with expand options
 */
function buildAssetsNavigation(expandOptions: string[]): any {
  console.log(c.subHeader('\n  Building Assets navigation...'))

  const expandOptionsGroup = {
    group: 'Add-On Information',
    pages: expandOptions.map(option => `api-reference/assets/expand/${option.replace(/\./g, '-')}`)
  }

  console.log(c.muted(`      ✓ Added Add-On Information dropdown with ${c.number(expandOptions.length)} options`))

  return expandOptionsGroup
}