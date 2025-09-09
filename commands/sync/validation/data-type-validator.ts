import type { Metric } from '../types'
import type { ValidationIssue } from './types'

/**
 * Validate metric data_type consistency
 */
export function validateDataType(metric: Metric): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const identifier = metric.identifier
  const dataType = metric.data_type

  // Check for -usd metrics that should have timeseries_usd data_type
  if (identifier.endsWith('-usd')) {
    if (dataType !== 'timeseries_usd') {
      issues.push({
        metric,
        issue: `USD metric has wrong data_type: expected "timeseries_usd", got "${dataType}"`,
        data: { identifier, data_type: dataType }
      })
    }
  }

  // Check for market-cap metrics that should consistently be USD
  if (identifier === 'market-cap') {
    if (dataType !== 'timeseries_usd') {
      issues.push({
        metric,
        issue: `Market cap metric has inconsistent data_type: expected "timeseries_usd" for consistency, got "${dataType}"`,
        data: { identifier, data_type: dataType }
      })
    }
  }

  return issues
}