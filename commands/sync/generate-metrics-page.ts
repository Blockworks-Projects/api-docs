import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Metric } from '../sync.types'
import { colors as c, OUTPUT_DIR } from './const'
import { fetchMetricSampleData } from './fetch-metric-sample-data'
import * as templates from './templates'
import { escapeYamlString, getUnit, toTitleCase } from './utils'

/**
 * Generate a single metric page
 */
export const generateMetricPage = async (metric: Metric, allMetrics?: Metric[]): Promise<void> => {
  const categoryFolder = metric.category.toLowerCase().replace(/\s+/g, '-')
  const projectDir = join(OUTPUT_DIR, metric.project, categoryFolder)
  const filePath = join(projectDir, `${metric.identifier}.mdx`)

  console.log(c.muted(`   + ${metric.project}/${categoryFolder}/${metric.identifier}.mdx`))

  // Ensure directory exists
  await mkdir(projectDir, { recursive: true })

  // Fetch sample data
  const sampleData = await fetchMetricSampleData(metric.identifier, metric.project)

  // Format the response
  const exampleResponse = JSON.stringify(sampleData, null, 2)
  const unit = getUnit(metric)

  // Generate content from template
  let content = templates.METRIC_PAGE
    .replace(/\{metric_name\}/g, escapeYamlString(metric.name))
    .replace('{metric_description}', escapeYamlString(metric.description))
    .replace(/\{metric_identifier\}/g, metric.identifier)
    .replace(/\{metric_project\}/g, metric.project)
    .replace('{metric_project_title}', toTitleCase(metric.project))
    .replace('{metric_unit}', unit)
    .replace(/\{metric_interval\}/g, unit === 'string' ? 'N/A' : metric.interval)
    .replace('{metric_source}', metric.source)
    .replace('{metric_interval}', metric.interval)
    .replace('{example_response}', exampleResponse)

  // Add USD/non-USD cross-references if allMetrics provided
  if (allMetrics) {
    const crossReference = generateCrossReference(metric, allMetrics)
    if (crossReference) {
      content += `\n${crossReference}`
    }
  }

  // Write the file
  await writeFile(filePath, content, 'utf-8')
}

/**
 * Generate cross-reference for USD/non-USD metric pairs
 */
function generateCrossReference(metric: Metric, allMetrics: Metric[]): string | null {
  const isUsd = metric.identifier.endsWith('-usd')
  const baseIdentifier = isUsd ? metric.identifier.slice(0, -4) : metric.identifier
  const counterpartIdentifier = isUsd ? baseIdentifier : `${metric.identifier}-usd`

  // Find counterpart in same project
  const counterpart = allMetrics.find(m =>
    m.project === metric.project && m.identifier === counterpartIdentifier
  )

  if (!counterpart) return null

  if (isUsd) {
    return `\n<Note>For native values, see **[${counterpart.name}](./${baseIdentifier})**.</Note>`
  } else {
    return `\n<Note>For fiat values, see **[${counterpart.name}](./${counterpartIdentifier})**.</Note>`
  }
}