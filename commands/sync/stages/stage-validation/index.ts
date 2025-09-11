import { Metric, ValidationError } from '../../classes'
import * as text from '../../lib/text'
import { fetchMetricDataWithTimeout } from './api-fetcher'
import { createProgressBar } from '../../lib/utils'
import { displayValidationResults } from './validation-reporter'

type ValidationResult = {
  issues: any[]
  totalChecked: number
  failedFetches: number
  metricDataCache: Map<string, any>
}

const validateMetrics = async (metrics: Metric[]): Promise<ValidationResult> => {
  const issues: any[] = []
  let failedFetches = 0
  const metricDataCache = new Map<string, any>()

  text.header('🔍 Validating metric data feeds...')

  // Stage 1: Data type validation (built into Metric class)
  text.detail(text.withCount(`Checking data_type consistency for {count} metrics`, metrics.length))
  let dataTypeIssueCount = 0
  metrics.forEach(metric => {
    const errors = metric.validateDataType()
    dataTypeIssueCount += errors.length
  })

  // Stage 2: Batch fetch and validate data
  const BATCH_SIZE = 100
  const batches = Array.from({ length: Math.ceil(metrics.length / BATCH_SIZE) }, (_, i) =>
    metrics.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
  )

  text.detail(text.withCount(`Fetching {count} metrics in {count} batches of up to 100 each...`, metrics.length, batches.length))

  const progressBar = createProgressBar()
  progressBar.start(batches.length, 0)

  // Process batches sequentially
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex]
    const fetchPromises = batch?.map(async (metric) => {
      const { response, error } = await fetchMetricDataWithTimeout(metric)
      const cacheKey = `${metric.project}/${metric.identifier}`

      if (error) {
        failedFetches++
        issues.push({ metric, issue: `Failed to fetch: ${error}`, data: null })
        metric.addValidationError(new ValidationError({
          type: 'fetch_error',
          message: `Failed to fetch: ${error}`,
          endpoint: `/metrics/${metric.identifier}?project=${metric.project}`
        }))
        return { metric, response: null, error }
      }

      if (response) {
        metricDataCache.set(cacheKey, response)
        metric.validateData(response)
        return { metric, response, error: null }
      }

      return { metric, response: null, error: 'No response' }
    })

    await Promise.allSettled(fetchPromises || [])
    progressBar.update(batchIndex + 1)
  }

  progressBar.stop()
  displayValidationResults(issues, metrics.length, dataTypeIssueCount)

  return { issues, totalChecked: metrics.length, failedFetches, metricDataCache }
}

export const runValidationStage = async (metrics: Metric[]): Promise<ValidationResult> =>
  await validateMetrics(metrics)