import type { Metric, MetricDataResponse, MetricDataPoint } from '../sync.types'
import { API } from './api'
import { colors as c } from './const'

type ValidationIssue = {
  metric: Metric
  issue: string
  data?: any
}

type ValidationResult = {
  issues: ValidationIssue[]
  totalChecked: number
  failedFetches: number
  metricDataCache: Map<string, MetricDataResponse>
}

/**
 * Validate a single metric's data response
 */
const validateMetricData = (
  metric: Metric,
  response: MetricDataResponse
): ValidationIssue[] => {
  const issues: ValidationIssue[] = []
  const metricKey = `${metric.project}/${metric.identifier}`

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

/**
 * Validate metric data_type consistency
 */
const validateDataType = (metric: Metric): ValidationIssue[] => {
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

/**
 * Validate a single data point (used for both array items and single value objects)
 */
const validateDataPoint = (
  point: any,
  metric: Metric,
  issues: ValidationIssue[]
): void => {
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

/**
 * Fetch data for a single metric with timeout
 */
const fetchMetricDataWithTimeout = async (
  metric: Metric,
  timeout: number = 5000
): Promise<{ response?: MetricDataResponse; error?: string }> => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    // Calculate date 5 days ago (same as existing fetch)
    const fiveDaysAgo = new Date()
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5)
    const startDate = fiveDaysAgo.toISOString().split('T')[0]

    const [error, response] = await API.get<[any, MetricDataResponse]>(
      `/metrics/${metric.identifier}`,
      {
        query: {
          project: metric.project,
          start_date: startDate,
        },
        signal: controller.signal as any
      }
    )

    clearTimeout(timeoutId)

    if (error) {
      return { error: `API error: ${error.message || error.error || 'Unknown error'}` }
    }

    return { response }
  } catch (err: any) {
    clearTimeout(timeoutId)
    if (err.name === 'AbortError') {
      return { error: 'Request timeout' }
    }
    return { error: `Fetch error: ${err.message}` }
  }
}

/**
 * Validate all metrics by fetching their sample data in parallel
 */
export const validateMetrics = async (
  metrics: Metric[]
): Promise<ValidationResult> => {
  const issues: ValidationIssue[] = []
  let failedFetches = 0
  const totalChecked = metrics.length
  const metricDataCache = new Map<string, MetricDataResponse>()

  console.log(c.header('\n🔍 Validating metric data feeds...'))
  
  // First, validate data_type consistency (no API calls needed)
  console.log(c.muted(`   Checking data_type consistency for ${totalChecked} metrics...`))
  let dataTypeIssueCount = 0
  for (const metric of metrics) {
    const dataTypeIssues = validateDataType(metric)
    issues.push(...dataTypeIssues)
    dataTypeIssueCount += dataTypeIssues.length
  }

  if (dataTypeIssueCount > 0) {
    console.log(c.warning(`   ⚠️ Found ${dataTypeIssueCount} data_type inconsistencies`))
  } else {
    console.log(c.green(`   ✓ All metrics have consistent data_type values`))
  }

  console.log(c.muted(`   Fetching ${totalChecked} metrics in parallel...`))

  // Fetch all metrics in parallel using Promise.allSettled
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

  // Log summary
  const dataIssues = issues.filter(i => !i.issue.startsWith('Failed to fetch'))

  if (issues.length === 0) {
    console.log(c.green(`✅ All ${totalChecked} metrics passed validation`))
  } else {
    console.log(c.warning(`\n⚠️ Found ${issues.length} validation issues:`))

    // Group issues by type for summary
    const issueTypes = new Map<string, number>()
    issues.forEach(issue => {
      const type = issue.issue.split(':')[0]
      issueTypes.set(type || 'Unknown', (issueTypes.get(type || 'Unknown') || 0) + 1)
    })

    issueTypes.forEach((count, type) => {
      console.log(c.warning(`   ${count}x ${type}`))
    })

    // Show ALL issues grouped by project
    console.log(c.muted('\n   All issues by project:'))
    const issuesByProject = new Map<string, ValidationIssue[]>()
    issues.forEach(issue => {
      const list = issuesByProject.get(issue.metric.project) || []
      list.push(issue)
      issuesByProject.set(issue.metric.project, list)
    })

    issuesByProject.forEach((projectIssues, project) => {
      console.log(c.muted(`\n   ${project}:`))
      projectIssues.forEach(issue => {
        const displayName = `${issue.metric.category} > ${issue.metric.name}`
        console.log(c.muted(`     - ${displayName}: ${issue.issue}`))
        if (issue.data && issue.issue.includes('Malformed')) {
          console.log(c.muted(`       Data: ${JSON.stringify(issue.data).substring(0, 100)}...`))
        }
      })
    })
  }

  return {
    issues,
    totalChecked,
    failedFetches,
    metricDataCache
  }
}

/**
 * Generate validation report for PR body
 */
export const generateValidationReport = (result: ValidationResult): string => {
  if (result.issues.length === 0) {
    return ''
  }

  let report = '### 🔍 Validation Issues\n\n'
  report += `Found ${result.issues.length} validation issues across ${result.totalChecked} metrics.\n\n`

  // Group issues by project
  const byProject = new Map<string, ValidationIssue[]>()
  result.issues.forEach(issue => {
    const list = byProject.get(issue.metric.project) || []
    list.push(issue)
    byProject.set(issue.metric.project, list)
  })

  // Sort projects by issue count (most issues first)
  const sortedProjects = Array.from(byProject.entries())
    .sort((a, b) => b[1].length - a[1].length)

  report += '<details>\n<summary>Click to expand validation issues</summary>\n\n```\n'

  // Show ALL projects and their issues
  sortedProjects.forEach(([project, projectIssues]) => {
    report += `\n${project}: ${projectIssues.length} issue${projectIssues.length > 1 ? 's' : ''}\n`

    // List each metric and its issue
    projectIssues.forEach(issue => {
      const displayName = `${issue.metric.category} > ${issue.metric.name}`
      report += `  - ${displayName}: ${issue.issue}\n`
    })
  })

  report += '```\n\n</details>\n\n'

  return report
}