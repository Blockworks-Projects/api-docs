import chalk from 'chalk'
import { readFile, writeFile } from 'node:fs/promises'
import type { Metric } from '../sync.types'
import { toTitleCase } from './utils'

/**
 * Generate docs.json navigation structure for metrics
 */
export const updateNavigation = async (metrics: Metric[]): Promise<void> => {
  const docsPath = './docs.json'

  // Read existing docs.json
  const docsContent = await readFile(docsPath, 'utf-8')
  const docs = JSON.parse(docsContent)

  // Group metrics by project and category
  const projectGroups = new Map<string, Map<string, Metric[]>>()

  console.log(chalk.magentaBright.bold('\n  1. Grouping metrics by project and category...'))

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
    console.log(chalk.yellowBright.bold(`\n   🔎 ${project.toUpperCase()}`))
    for (const [category, categoryMetrics] of categoryMap.entries()) {
      console.log(chalk.yellow(`      + ${category}:`), chalk.white(categoryMetrics.length), 'metrics')
    }
  }

  // Find the Metrics group in docs.json
  const metricsGroup = docs.navigation.tabs[0].groups.find((g: any) => g.group === 'Metrics')
  if (!metricsGroup) {
    throw new Error('Metrics group not found in docs.json')
  }

  // Clear existing project pages (keep about and catalog)
  const staticPages = metricsGroup.pages.filter((page: any) =>
    typeof page === 'string' && (page.includes('/about') || page.includes('/catalog'))
  )

  metricsGroup.pages = staticPages

  console.log(chalk.magentaBright.bold('\n  2. Processing projects...'))

  // Generate navigation for each project (sorted alphabetically)
  const sortedProjects = Array.from(projectGroups.entries()).sort(([a], [b]) => a.localeCompare(b))

  for (const [project, categoryMap] of sortedProjects) {
    const projectName = toTitleCase(project)
    console.log(chalk.yellowBright.bold(`\n   🛠️ ${project.toUpperCase()}`))

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

      console.log(chalk.grey(`      + Creating ${category} subgroup with ${sortedMetrics.length} metrics`))

      // Always create subgroup for categories (even single metrics)
      const categoryGroup = {
        group: category,
        pages: sortedMetrics.map(metric => `api-reference/metrics/${project}/${categoryFolder}/${metric.identifier}`)
      }
      projectGroup.pages.push(categoryGroup)
    }

    metricsGroup.pages.push(projectGroup)
  }

  // Write updated docs.json
  await writeFile(docsPath, JSON.stringify(docs, null, 2), 'utf-8')
  console.log(chalk.greenBright('\n✅ Updated docs.json navigation structure'))
}