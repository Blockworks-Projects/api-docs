import type { Metric } from '../types'
import type { ValidationIssue } from './types'

/**
 * Validate a single data point (used for both array items and single value objects)
 */
export function validateDataPoint(
  point: any,
  metric: Metric,
  issues: ValidationIssue[]
): void {
  // Check if it's an object
  if (typeof point !== 'object' || point === null) {
    issues.push({
      metric: metric,
      issue: 'Invalid data point (not an object)',
      data: point
    })
    return
  }

  // Check for required 'value' field
  if (!('value' in point)) {
    issues.push({
      metric: metric,
      issue: 'Missing "value" field in data point',
      data: point
    })
    return
  }

  // Check value type (allow null, string, or number)
  const valueType = typeof point.value
  if (point.value !== null && valueType !== 'string' && valueType !== 'number') {
    issues.push({
      metric: metric,
      issue: `Invalid value type (expected string, number, or null, got ${valueType})`,
      data: point
    })
  }

  // Check for valid structure (should only have 'value' or 'value' and 'date')
  const keys = Object.keys(point)
  const validKeys = ['value', 'date']
  const invalidKeys = keys.filter(k => !validKeys.includes(k))

  if (invalidKeys.length > 0) {
    // Check if this looks like a malformed payload
    // e.g., { date: string, rev_usd: number } instead of { date: string, value: number }
    if (keys.includes('date') && !keys.includes('value')) {
      const nonDateKeys = keys.filter(k => k !== 'date')
      issues.push({
        metric: metric,
        issue: `Malformed payload structure - found fields "${nonDateKeys.join(', ')}" instead of "value"`,
        data: point
      })
    } else {
      issues.push({
        metric: metric,
        issue: `Unexpected fields in data point: ${invalidKeys.join(', ')}`,
        data: point
      })
    }
  }

  // If date field exists, validate it
  if ('date' in point && typeof point.date !== 'string') {
    issues.push({
      metric: metric,
      issue: `Invalid date type (expected string, got ${typeof point.date})`,
      data: point
    })
  }
}