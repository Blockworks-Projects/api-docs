import type { Metric } from '../../classes'
import type { MetricDataResponse } from '../../types'
import type { ValidationIssue } from './types'
import { validateDataPoint } from './data-point-validator'

/**
 * Validate a single metric's data response
 */
export function validateMetricData(
  metric: Metric,
  response: MetricDataResponse
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  // Check if the response has the project key (case-insensitive)
  const projectKey = Object.keys(response).find(
    key => key.toLowerCase() === metric.project.toLowerCase()
  )

  if (!projectKey) {
    issues.push({
      metric: metric,
      issue: 'Missing project key in response',
      data: Object.keys(response)
    })
    return issues
  }

  const data = response[projectKey]

  // Check if data is an array (time series) or single value object
  if (Array.isArray(data)) {
    // Time series data validation
    if (data.length === 0) {
      issues.push({
        metric: metric,
        issue: 'No data returned (empty array)',
        data: data
      })
      return issues // No need to check further if no data
    }

    // Validate each data point in the array
    for (const point of data) {
      validateDataPoint(point, metric, issues)
    }
  } else if (typeof data === 'object' && data !== null) {
    // Single value object validation (like treasury-crypto-asset)
    validateDataPoint(data, metric, issues)
  } else {
    issues.push({
      metric: metric,
      issue: 'Invalid data format (expected array or object)',
      data: data
    })
  }

  return issues
}