import { readFile, writeFile } from 'node:fs/promises'
import type { Metric } from '../sync.types'
import { colors as c } from './const'
import { toTitleCase } from './utils'

/**
 * Generate docs.json navigation structure for metrics and assets
 */
export const updateNavigation = async (metrics: Metric[], expandOptions?: string[]): Promise<void> => {
  const docsPath = './docs.json'

  // Read existing docs.json
  const docsContent = await readFile(docsPath, 'utf-8')
  const docs = JSON.parse(docsContent)

  // Group metrics by project and category
  const projectGroups = new Map<string, Map<string, Metric[]>>()

  console.log(c.subHeader('\n  1. Grouping metrics by project and category...'))

  metrics.forEach(metric => {
    if (!projectGroups.has(metric.project)) {
      projectGroups.set(metric.project, new Map())
    }

    const categoryMap = projectGroups.get(metric.project)!
    const categoryKey = metric.category

    if (!categoryMap.has(categoryKey)) {
      categoryMap.set(categoryKey, [])
    }

    categoryMap.get(categoryKey)!.push(metric)
  })

  // Log the grouping results
  for (const [project, categoryMap] of projectGroups.entries()) {
    console.log(c.warning(`\n   🔎 ${project.toUpperCase()}`))
    for (const [category, categoryMetrics] of categoryMap.entries()) {
      console.log(`      + ${category}:`, c.number(categoryMetrics.length), c.muted('metrics'))
    }
  }

  // Find the Metrics group in docs.json
  const metricsGroup = docs.navigation.tabs[0].groups.find((g: any) => g.group === 'Metrics')
  if (!metricsGroup) {
    throw new Error('Metrics group not found in docs.json')
  }

  // Clear existing project pages (keep about and catalog)
  const staticPages = metricsGroup.pages.filter((page: any) =>
    typeof page === 'string'
  )

  metricsGroup.pages = staticPages

  console.log(c.subHeader('\n  2. Processing projects...'))

  // Generate navigation for each project (sorted alphabetically)
  const sortedProjects = Array.from(projectGroups.entries()).sort(([a], [b]) => a.localeCompare(b))

  for (const [project, categoryMap] of sortedProjects) {
    const projectName = toTitleCase(project)
    console.log(c.warning(`\n   🛠️ ${project.toUpperCase()}`))

    const projectGroup: any = {
      group: projectName,
      pages: []
    }

    // Sort categories alphabetically
    const sortedCategories = Array.from(categoryMap.keys()).sort()

    for (const category of sortedCategories) {
      const categoryMetrics = categoryMap.get(category)!
      const categoryFolder = category.toLowerCase().replace(/\s+/g, '-')

      // Sort metrics alphabetically within category
      const sortedMetrics = categoryMetrics.sort((a, b) => a.identifier.localeCompare(b.identifier))

      console.log(c.muted(`      + Creating ${category} subgroup with ${c.number(sortedMetrics.length)} metrics`))

      // Always create subgroup for categories (even single metrics)
      const categoryGroup = {
        group: category,
        pages: sortedMetrics.map(metric => `api-reference/metrics/${project}/${categoryFolder}/${metric.identifier}`)
      }
      projectGroup.pages.push(categoryGroup)
    }

    metricsGroup.pages.push(projectGroup)
  }

  // Update Assets navigation if expand options are provided
  if (expandOptions && expandOptions.length > 0) {
    console.log(c.subHeader('\n  3. Updating Assets navigation...'))

    // Find the Assets group
    const assetsGroup = docs.navigation.tabs[0].groups
      .find((g: any) => g.group === 'API Reference')
      ?.pages?.find((p: any) => p.group === 'Assets')

    if (assetsGroup) {
      // Remove existing OHLCV page and any existing Expand Options groups
      assetsGroup.pages = assetsGroup.pages.filter((page: any) => {
        return page !== 'api-reference/assets/ohlcv' &&
               !(typeof page === 'object' && page.group === 'Expand Options')
      })

      // Create the Expand Options dropdown
      const expandOptionsGroup = {
        group: 'Expand Options',
        pages: expandOptions.map(option => `api-reference/assets/expand/${option.replace(/\./g, '-')}`)
      }

      // Add the dropdown to the Assets group
      assetsGroup.pages.push(expandOptionsGroup)

      console.log(c.muted(`      ✓ Added Expand Options dropdown with ${c.number(expandOptions.length)} options`))
    }
  }

  // Write updated docs.json
  await writeFile(docsPath, JSON.stringify(docs, null, 2), 'utf-8')
  console.log('\n  ✅ Updated docs.json navigation structure')
}