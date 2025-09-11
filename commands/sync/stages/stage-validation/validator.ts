import * as text from '../../lib/text'
import { Metric, ValidationError } from '../../classes'
import { fetchMetricDataWithTimeout } from './api-fetcher'
import type { ValidationIssue, ValidationResult } from './types'
import { displayValidationResults } from './validation-reporter'
import { createProgressBar } from '../../lib/createProgressBar'

export const validateMetrics = async (metrics: Metric[]): Promise<ValidationResult> => {
  const issues: ValidationIssue[] = []
  let failedFetches = 0
  const totalChecked = metrics.length
  const metricDataCache = new Map<string, any>()

  text.header('🔍 Validating metric data feeds...')

  // Stage 1: Validate data_type consistency (no API calls needed)
  text.detail(text.withCount(`Checking data_type consistency for {count} metrics`, totalChecked))
  let dataTypeIssueCount = 0
  for (const metric of metrics) {
    const dataTypeErrors = metric.validateDataType()
    dataTypeIssueCount += dataTypeErrors.length
    
    dataTypeIssueCount += dataTypeErrors.length
  }

  // Stage 2: Fetch and validate metric data in batches
  const BATCH_SIZE = 100
  const batches = []

  // Create batches of metrics
  for (let i = 0; i < metrics.length; i += BATCH_SIZE) {
    batches.push(metrics.slice(i, i + BATCH_SIZE))
  }

  text.detail(text.withCount(`Fetching {count} metrics in {count} batches of up to 100 each...`, totalChecked, batches.length))

  const progressBar = createProgressBar()

  progressBar.start(batches.length, 0)

  const allResults = []

  // Process each batch sequentially
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex]

    const fetchPromises = batch?.map(async (metric) => {
      const { response, error } = await fetchMetricDataWithTimeout(metric)
      const cacheKey = `${metric.project}/${metric.identifier}`

      if (error) {
        failedFetches++
        const issue = {
          metric,
          issue: `Failed to fetch: ${error}`,
          data: null
        }
        issues.push(issue)
        
        // Add validation error to metric instance
        metric.addValidationError(new ValidationError({
          type: 'fetch_error',
          message: `Failed to fetch: ${error}`,
          endpoint: `/metrics/${metric.identifier}?project=${metric.project}`
        }))
        
        return { metric, response: null, error }
      }

      if (response) {
        // Cache the successful response
        metricDataCache.set(cacheKey, response)

        const dataValidationErrors = metric.validateData(response)
        
        // Track errors for display
        
        return { metric, response, error: null }
      }

      return { metric, response: null, error: 'No response' }
    })

    // Wait for this batch to complete before moving to next batch
    const batchResults = await Promise.allSettled(fetchPromises || [])
    allResults.push(...batchResults)

    progressBar.update(batchIndex + 1)
  }

  progressBar.stop()

  // Count successful fetches
  const successfulFetches = allResults.filter(r => r.status === 'fulfilled' && r.value?.response).length

  // Display results
  displayValidationResults(issues, totalChecked, dataTypeIssueCount)

  return {
    issues,
    totalChecked,
    failedFetches,
    metricDataCache
  }
}