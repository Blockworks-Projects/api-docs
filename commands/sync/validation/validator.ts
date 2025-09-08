import type { Metric } from '../types'
import type { ValidationIssue, ValidationResult } from './types'
import { colors as c } from '../lib/constants'
import { validateDataType } from './data-type-validator'
import { validateMetricData } from './metric-data-validator'
import { fetchMetricDataWithTimeout } from './api-fetcher'
import { displayValidationResults } from './validation-reporter'

/**
 * Main validation orchestrator - validates all metrics by fetching their sample data in parallel
 */
export async function validateMetrics(metrics: Metric[]): Promise<ValidationResult> {
  const issues: ValidationIssue[] = []
  let failedFetches = 0
  const totalChecked = metrics.length
  const metricDataCache = new Map<string, any>()

  console.log(c.header('\n🔍 Validating metric data feeds...'))

  // Stage 1: Validate data_type consistency (no API calls needed)
  console.log(c.muted(`   Checking data_type consistency for ${totalChecked} metrics...`))
  let dataTypeIssueCount = 0
  for (const metric of metrics) {
    const dataTypeIssues = validateDataType(metric)
    issues.push(...dataTypeIssues)
    dataTypeIssueCount += dataTypeIssues.length
  }

  // Stage 2: Fetch and validate metric data in parallel
  console.log(c.muted(`   Fetching ${totalChecked} metrics in parallel...`))

  const fetchPromises = metrics.map(async (metric) => {
    const { response, error } = await fetchMetricDataWithTimeout(metric)
    const cacheKey = `${metric.project}/${metric.identifier}`

    if (error) {
      failedFetches++
      issues.push({
        metric: metric,
        issue: `Failed to fetch: ${error}`,
        data: null
      })
      return { metric, response: null, error }
    }

    if (response) {
      // Cache the successful response
      metricDataCache.set(cacheKey, response)

      const validationIssues = validateMetricData(metric, response)
      issues.push(...validationIssues)
      return { metric, response, error: null }
    }

    return { metric, response: null, error: 'No response' }
  })

  // Wait for all fetches to complete
  const results = await Promise.allSettled(fetchPromises)

  // Count successful fetches
  const successfulFetches = results.filter(r => r.status === 'fulfilled' && r.value?.response).length
  console.log(c.muted(`   ✓ Fetched ${successfulFetches}/${totalChecked} metrics successfully`))

  // Display results
  displayValidationResults(issues, totalChecked, dataTypeIssueCount)

  return {
    issues,
    totalChecked,
    failedFetches,
    metricDataCache
  }
}