import { Metric } from '../classes'
import { generateMetricPage } from './metric-page-generator'
import { updateOpenApiSpec } from './openapi-generator'
import { updateNavigation } from './navigation-generator'
import { updateAssetExpansionOptions } from './asset-expansion-options-generator'
import { syncMiscMetrics } from './misc-metrics-generator'
import { generateMetricsCatalog } from './catalog-generator'
import * as text from '../lib/text'
import { createProgressBar } from '../lib/createProgressBar'

type GeneratorsConfig = { metrics: Metric[] }

export const runGenerators = async ({ metrics }: GeneratorsConfig) => {
  await generateMetricPages({ metrics })
  
  text.header('📖 Generating metrics catalog...')
  await generateMetricsCatalog(metrics)

  await updateOpenApiSpec(metrics)
  
  const expandOptions = await updateAssetExpansionOptions()
  await syncMiscMetrics()
  await updateNavigation(metrics, expandOptions)
}

const generateMetricPages = async ({ metrics }: { metrics: Metric[] }) => {
  text.header('✏️ Generating metric pages...')

  const progressBar = createProgressBar()
  progressBar.start(metrics.length, 0)

  let completed = 0
  const promises = metrics.map(async (metric) => {
    await generateMetricPage({ metric, allMetrics: metrics })
    completed++
    progressBar.update(completed)
  })

  await Promise.all(promises)
  progressBar.stop()
}