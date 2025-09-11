import { join } from 'node:path'
import { Metric } from '../../classes'
import { OUTPUT_DIR } from '../../lib/constants'
import { fetchMetricSampleData } from '../stage-fetching/metrics-api'
import { ensureDirectory, writeTextFile } from '../../lib/file-operations'
import { findMetric } from '../../lib/metric-utils'
import { getMetricPage } from '../../templates/metric-page'

type GeneratePageConfig = { metric: Metric; allMetrics?: Metric[] }

export const generateMetricPage = async ({ metric, allMetrics }: GeneratePageConfig) => {
  const projectDir = join(OUTPUT_DIR, metric.project)
  const filePath = join(projectDir, `${metric.identifier}.mdx`)

  await ensureDirectory(projectDir)

  const sampleData = await fetchMetricSampleData(metric.identifier, metric.project)
  let content = getMetricPage({ metric, sampleData })

  if (allMetrics) {
    const crossReference = generateCrossReference(metric, allMetrics)
    if (crossReference) content += `\n${crossReference}`
  }

  await writeTextFile(filePath, content)
}

const generateCrossReference = (metric: Metric, allMetrics: Metric[]): string | null => {
  const isUsd = metric.identifier.endsWith('-usd')
  const baseIdentifier = isUsd ? metric.identifier.slice(0, -4) : metric.identifier
  const counterpartIdentifier = isUsd ? baseIdentifier : `${metric.identifier}-usd`
  const counterpart = findMetric(allMetrics, metric.project, counterpartIdentifier)

  if (!counterpart) return null

  return isUsd
    ? `\n<Note>For native values, see **[${counterpart.name}](./${baseIdentifier})**.</Note>`
    : `\n<Note>For fiat values, see **[${counterpart.name}](./${counterpartIdentifier})**.</Note>`
}