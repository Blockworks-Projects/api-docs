import chalk from 'chalk'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Metric } from '../sync.types'
import { OUTPUT_DIR } from './const'
import * as templates from './templates'
import { toTitleCase } from './utils'

/**
 * Generate metrics catalog
 */
export const generateMetricsCatalog = async (metrics: Metric[]): Promise<void> => {
  const catalogPath = join('./api-reference/metrics', 'catalog.mdx')

  // Group metrics by category, then by identifier
  const categoryGroups = new Map<string, Map<string, Metric[]>>()

  metrics.forEach(metric => {
    if (!categoryGroups.has(metric.category)) {
      categoryGroups.set(metric.category, new Map())
    }

    const metricGroups = categoryGroups.get(metric.category)!
    if (!metricGroups.has(metric.identifier)) {
      metricGroups.set(metric.identifier, [])
    }
    metricGroups.get(metric.identifier)!.push(metric)
  })

  // Sort categories alphabetically
  const sortedCategories = Array.from(categoryGroups.keys()).sort()

  let catalogContent = templates.CATALOG_HEADER

  console.log('📖 Generating catalog with categories:', sortedCategories.join(', '))

  // Generate each category section
  for (const category of sortedCategories) {
    catalogContent += `# ${category}\n\n`

    const metricGroups = categoryGroups.get(category)!
    const sortedIdentifiers = Array.from(metricGroups.keys()).sort()

    console.log(chalk.grey(`   + Category "${category}" has ${sortedIdentifiers.length} unique metrics`))

    // Generate each metric entry within this category
    for (const identifier of sortedIdentifiers) {
      const metricsForIdentifier = metricGroups.get(identifier)!
      const firstMetric = metricsForIdentifier[0]

      // Generate table rows for each project, sorted by project name
      const catalogRows = metricsForIdentifier
        .sort((a, b) => a.project.localeCompare(b.project))
        .map(metric => {
          const categoryFolder = metric.category.toLowerCase().replace(/\s+/g, '-')
          const projectLink = `/api-reference/metrics/${metric.project}/${categoryFolder}/${metric.identifier}`
          return `| [${toTitleCase(metric.project)}](${projectLink}) | \`${metric.identifier}\` | ${metric.source} | ${metric.interval} | ${metric.data_type} |`
        })
        .join('\n')

      const entry = templates.CATALOG_ENTRY
        .replace('{metric_name}', firstMetric?.name ?? '')
        .replace('{metric_description}', firstMetric?.description ?? '')
        .replace('{catalog_rows}', catalogRows)

      catalogContent += entry + '\n'
    }
  }

  // Ensure directory exists
  await mkdir(OUTPUT_DIR, { recursive: true })

  // Write catalog
  await writeFile(catalogPath, catalogContent, 'utf-8')
}
