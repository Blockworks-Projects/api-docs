import { join } from 'node:path'
import { Metric } from '../classes'
import { colors as c, OUTPUT_DIR } from '../lib/constants'
import { fetchMetricSampleData } from '../api/metrics-api'
import { ensureDirectory, writeTextFile } from '../lib/file-operations'
import { findMetric } from '../lib/metric-utils'
import * as templates from '../templates'
import { escapeYamlString, getUnit } from '../lib/utils'

/**
 * Generate a single metric page
 */
export async function generateMetricPage(metric: Metric, allMetrics?: Metric[]): Promise<void> {
  const projectDir = join(OUTPUT_DIR, metric.project)
  const filePath = join(projectDir, `${metric.identifier}.mdx`)

  // Ensure directory exists
  await ensureDirectory(projectDir)

  // Fetch sample data
  const sampleData = await fetchMetricSampleData(metric.identifier, metric.project)

  // Format the response
  const exampleResponse = JSON.stringify(sampleData, null, 2)
  const unit = getUnit(metric)

  // Generate content from template
  let content = templates.METRIC_PAGE
    .replace('{metric_page_title}', escapeYamlString(metric.pageTitle))
    .replace('{metric_sidebar_title}', escapeYamlString(metric.title))
    .replace('{metric_description}', escapeYamlString(metric.description))
    .replace(/\{metric_identifier\}/g, metric.identifier)
    .replace(/\{metric_project\}/g, metric.project)
    .replace('{metric_unit}', unit)
    .replace(/\{metric_interval\}/g, unit === 'string' ? 'N/A' : metric.interval)
    .replace('{metric_source}', metric.source)
    .replace('{example_response}', exampleResponse)

  // Add USD/non-USD cross-references if allMetrics provided
  if (allMetrics) {
    const crossReference = generateCrossReference(metric, allMetrics)
    if (crossReference) {
      content += `\n${crossReference}`
    }
  }

  // Write the file
  await writeTextFile(filePath, content)
}

/**
 * Generate cross-reference for USD/non-USD metric pairs
 */
function generateCrossReference(metric: Metric, allMetrics: Metric[]): string | null {
  const isUsd = metric.identifier.endsWith('-usd')
  const baseIdentifier = isUsd ? metric.identifier.slice(0, -4) : metric.identifier
  const counterpartIdentifier = isUsd ? baseIdentifier : `${metric.identifier}-usd`

  // Find counterpart in same project
  const counterpart = findMetric(allMetrics, metric.project, counterpartIdentifier)

  if (!counterpart) return null

  if (isUsd) {
    return `\n<Note>For native values, see **[${counterpart.name}](./${baseIdentifier})**.</Note>`
  } else {
    return `\n<Note>For fiat values, see **[${counterpart.name}](./${counterpartIdentifier})**.</Note>`
  }
}