import chalk from 'chalk'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Metric } from '../sync.types'
import { OUTPUT_DIR } from './const'
import { fetchMetricSampleData } from './fetch-metric-sample-data'
import * as templates from './templates'
import { escapeYamlString, getUnitFromDataType, toTitleCase } from './utils'

/**
 * Generate a single metric page
 */
export const generateMetricPage = async (metric: Metric): Promise<void> => {
  const categoryFolder = metric.category.toLowerCase().replace(/\s+/g, '-')
  const projectDir = join(OUTPUT_DIR, metric.project, categoryFolder)
  const filePath = join(projectDir, `${metric.identifier}.mdx`)

  console.log(chalk.grey(`   + ${metric.project}/${categoryFolder}/${metric.identifier}.mdx`))

  // Ensure directory exists
  await mkdir(projectDir, { recursive: true })

  // Fetch sample data
  const sampleData = await fetchMetricSampleData(metric.identifier, metric.project)

  // Format the response
  const exampleResponse = JSON.stringify(sampleData, null, 2)

  // Generate content from template
  const aggregation = toTitleCase(metric.aggregation.toLowerCase())
  const content = templates.METRIC_PAGE
    .replace('{metric_name}', escapeYamlString(metric.name))
    .replace('{metric_description}', escapeYamlString(metric.description))
    .replace('{metric_identifier}', metric.identifier)
    .replace('{metric_unit}', getUnitFromDataType(metric.data_type))
    .replace(/\{metric_aggregation\}/g, aggregation)
    .replace('{metric_source}', metric.source)
    .replace('{metric_interval}', metric.interval)
    .replace('{example_response}', exampleResponse)

  // Write the file
  await writeFile(filePath, content, 'utf-8')
}