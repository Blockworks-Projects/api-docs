import * as cliProgress from 'cli-progress'
import type { ProjectCategories } from '../categorizers/project-categorizer'
import { sortMetricsAlphabetically } from '../lib/metric-utils'
import * as text from '../lib/text'
import { toTitleCase } from '../lib/utils'
import type { Metric } from '../types'

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
  text.subheader('  Building navigation structure...')

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
  text.detail('Processing Chain projects...')

  const chainsGroup: NavigationGroup = {
    group: 'Metrics : Chains',
    pages: [],
    tag: `${chains.size}`
  }

  const sortedChains = Array.from(chains.entries()).sort(([a], [b]) => a.localeCompare(b))

  for (const [project, categoryMap] of sortedChains) {
    text.detail(`🔗 ${project.toUpperCase()}`)

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

      text.detail(text.withCount(`Creating {count} subgroup with {count} metrics`, sortedMetrics.length))

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
  text.detail('Processing Project projects...')

  const projectsGroup: NavigationGroup = {
    group: 'Metrics : Projects',
    pages: [],
    tag: `${projects.size}`
  }

  const sortedProjects = Array.from(projects.entries()).sort(([a], [b]) => a.localeCompare(b))

  const progressBar = new cliProgress.SingleBar({
    format: '   Progress |{bar}| {percentage}% || {value}/{total} projects',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true
  }, cliProgress.Presets.legacy)

  progressBar.start(sortedProjects.length, 0)

  for (let i = 0; i < sortedProjects.length; i++) {
    const [project, categoryMap] = sortedProjects[i]!

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

    // Projects don't have category subgroups - flat list of metrics
    projectGroup.pages = sortedMetrics.map(metric => `api-reference/metrics/${project}/${metric.identifier}`)

    projectsGroup.pages.push(projectGroup)
    progressBar.update(i + 1)
  }

  progressBar.stop()

  return projectsGroup
}

/**
 * Build navigation for Equity projects (flat list)
 */
function buildEquitiesNavigation(equities: Map<string, Map<string, Metric[]>>): NavigationGroup {
  text.subheader('Processing Equity projects...')

  const equitiesGroup: NavigationGroup = {
    group: 'Metrics : Equities',
    pages: [],
    tag: `${equities.size}`
  }

  const sortedEquities = Array.from(equities.entries()).sort(([a], [b]) => a.localeCompare(b))

  const progressBar = new cliProgress.SingleBar({
    format: '   Progress |{bar}| {percentage}% || {value}/{total} equities',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true
  })

  progressBar.start(sortedEquities.length, 0)

  for (let i = 0; i < sortedEquities.length; i++) {
    const [project, categoryMap] = sortedEquities[i]!

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

    // Equities don't have category subgroups - flat list of metrics
    projectGroup.pages = sortedMetrics.map(metric => `api-reference/metrics/${project}/${metric.identifier}`)

    equitiesGroup.pages.push(projectGroup)
    progressBar.update(i + 1)
  }

  progressBar.stop()

  return equitiesGroup
}

/**
 * Build assets navigation with expand options
 */
function buildAssetsNavigation(expandOptions: string[]): any {
  text.detail('Building Assets navigation...')

  const expandOptionsGroup = {
    group: 'Add-On Information',
    pages: expandOptions.map(option => `api-reference/assets/expand/${option.replace(/\./g, '-')}`)
  }

  text.pass(text.withCount(`Added Add-On Information dropdown with {count} options`, expandOptions.length))

  return expandOptionsGroup
}