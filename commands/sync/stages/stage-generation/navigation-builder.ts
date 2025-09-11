import { createProgressBar } from '../../lib/createProgressBar'
import { sortMetricsAlphabetically } from '../../lib/metric-utils'
import * as text from '../../lib/text'
import { toTitleCase } from '../../lib/utils'
import type { Metric } from '../../types'

const GROUP_PREFIX = 'Metrics: '

// Legacy type for backward compatibility
type LegacyCategories = Record<'chains' | 'projects' | 'etfs' | 'treasuries', Map<string, Map<string, Metric[]>>>

interface NavigationGroup {
  group: string
  pages: any[]
  tag?: string
  icon?: string
}

interface CategoryConfig {
  name: string
  displayName: string
  icon: string
  subheaderText: string
  useCategories: boolean
}

const CATEGORY_CONFIGS: Record<string, CategoryConfig> = {
  chains: {
    name: 'chains',
    displayName: 'Chains',
    icon: 'link',
    subheaderText: 'Processing Chains...',
    useCategories: true
  },
  projects: {
    name: 'projects',
    displayName: 'Projects',
    icon: 'cube',
    subheaderText: 'Processing Projects...',
    useCategories: false
  },
  etfs: {
    name: 'etfs',
    displayName: 'ETFs',
    icon: 'chart-line',
    subheaderText: 'Processing ETFs...',
    useCategories: false
  },
  treasuries: {
    name: 'treasuries',
    displayName: 'Treasuries',
    icon: 'building-columns',
    subheaderText: 'Processing Treasuries...',
    useCategories: false
  }
}

/**
 * Build navigation structure for all project categories
 */
export function buildNavigationStructure(
  categories: LegacyCategories,
  expandOptions?: string[]
): {
  chainsGroup: NavigationGroup
  projectsGroup: NavigationGroup
  etfsGroup: NavigationGroup
  treasuriesGroup: NavigationGroup
  assetsUpdate?: any
} {
  text.detail('Building navigation structure...')

  // Create navigation groups using the consolidated function
  const chainsGroup = buildCategoryNavigation(categories.chains, CATEGORY_CONFIGS.chains)
  const projectsGroup = buildCategoryNavigation(categories.projects, CATEGORY_CONFIGS.projects)
  const etfsGroup = buildCategoryNavigation(categories.etfs, CATEGORY_CONFIGS.etfs)
  const treasuriesGroup = buildCategoryNavigation(categories.treasuries, CATEGORY_CONFIGS.treasuries)

  // Build assets navigation if expand options provided
  const assetsUpdate = expandOptions ? buildAssetsNavigation(expandOptions) : undefined

  return { chainsGroup, projectsGroup, etfsGroup, treasuriesGroup, assetsUpdate }
}

/**
 * Consolidated function to build navigation for any category type
 */
function buildCategoryNavigation(
  projects: Map<string, Map<string, Metric[]>>,
  config: CategoryConfig
): NavigationGroup {
  text.subheader(config.subheaderText)

  const categoryGroup: NavigationGroup = {
    group: `${GROUP_PREFIX}${config.displayName}`,
    pages: [],
    tag: `${projects.size}`
  }

  const sortedProjects = Array.from(projects.entries()).sort(([a], [b]) => a.localeCompare(b))
  
  // Only show progress bar for large datasets
  const showProgress = sortedProjects.length > 1
  const progressBar = showProgress ? createProgressBar() : null
  
  if (showProgress) {
    progressBar!.start(sortedProjects.length, 0)
  }

  for (let i = 0; i < sortedProjects.length; i++) {
    const [project, categoryMap] = sortedProjects[i]!

    const projectGroup: any = {
      group: toTitleCase(project),
      icon: config.icon,
      pages: []
    }

    if (config.useCategories && config.name === 'chains') {
      // Chains keep category subgroups in navigation
      const sortedCategories = Array.from(categoryMap.keys()).sort()

      for (const category of sortedCategories) {
        const categoryMetrics = categoryMap.get(category)!
        const sortedMetrics = sortMetricsAlphabetically(categoryMetrics)

        text.detail(text.withCount(`Creating ${category} category with {count} metrics`, categoryMetrics.length))

        const categoryGroup = {
          group: category,
          pages: sortedMetrics.map(metric => `api-reference/metrics/${project}/${metric.identifier}`)
        }
        projectGroup.pages.push(categoryGroup)
      }
    } else {
      // Other categories don't have category subgroups - flat list of metrics
      const allMetrics: Metric[] = []
      for (const categoryMetrics of categoryMap.values()) {
        allMetrics.push(...categoryMetrics)
      }
      const sortedMetrics = sortMetricsAlphabetically(allMetrics)

      projectGroup.pages = sortedMetrics.map(metric => `api-reference/metrics/${project}/${metric.identifier}`)
    }

    categoryGroup.pages.push(projectGroup)
    
    if (showProgress) {
      progressBar!.update(i + 1)
    }
  }

  if (showProgress) {
    progressBar!.stop()
  }

  return categoryGroup
}

/**
 * Build assets navigation with expand options
 */
function buildAssetsNavigation(expandOptions: string[]): any {
  text.subheader('Building Assets navigation...')

  const expandOptionsGroup = {
    group: 'Add-On Information',
    pages: expandOptions.map(option => `api-reference/assets/expand/${option.replace(/\./g, '-')}`)
  }

  text.pass(text.withCount(`Added Add-On Information dropdown with {count} options`, expandOptions.length))

  return expandOptionsGroup
}