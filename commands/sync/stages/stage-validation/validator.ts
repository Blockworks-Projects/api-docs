import chalk from 'chalk'
import * as cliProgress from 'cli-progress'
import * as text from '../../lib/text'
import { Metric, ValidationError } from '../../classes'
import { fetchMetricDataWithTimeout } from './api-fetcher'
import type { ValidationIssue, ValidationResult } from './types'
import { displayValidationResults } from './validation-reporter'
import { VALIDATION_CONCURRENCY, RETRY_COOLOFF_MS } from '../../lib/constants'

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const createFetchProgressBar = () =>
  new cliProgress.SingleBar({
    format: `   Fetching  |{bar}| {percentage}% || ${chalk.greenBright('{completed}')} done ${chalk.yellowBright('{pending} pending')} ${chalk.redBright('{failed} failed')} / {total}`,
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true
  }, cliProgress.Presets.legacy)

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
  }

  // Stage 2: Fetch and validate metric data with concurrency pool
  text.detail(text.withCount(`Fetching {count} metrics (concurrency: ${VALIDATION_CONCURRENCY})`, totalChecked))

  let resolved = 0
  let failed = 0
  let nextIndex = 0

  // Track failed metrics for retry
  const failedMetrics: Metric[] = []

  const progressBar = createFetchProgressBar()
  progressBar.start(totalChecked, 0, { completed: 0, pending: 0, failed: 0 })

  const updateProgress = () => {
    progressBar.update(resolved + failed, {
      completed: resolved,
      pending: inflight.size,
      failed,
    })
  }

  const processMetric = async (metric: Metric) => {
    const { response, error, timedOut: wasTimeout } = await fetchMetricDataWithTimeout(metric)
    const cacheKey = `${metric.project}/${metric.identifier}`

    if (error) {
      failedFetches++
      failed++
      failedMetrics.push(metric)
      issues.push({ metric, issue: `Failed to fetch: ${error}`, data: null })
      metric.addValidationError(new ValidationError({
        type: wasTimeout ? 'timeout' : 'fetch_error',
        message: `Failed to fetch: ${error}`,
        endpoint: `/metrics/${metric.identifier}?project=${metric.project}`
      }))
    } else if (response) {
      metricDataCache.set(cacheKey, response)
      metric.validateData(response)
      resolved++
    } else {
      resolved++
    }
  }

  const inflight = new Set<Promise<void>>()

  const launchNext = () => {
    if (nextIndex >= metrics.length) return
    const metric = metrics[nextIndex++]!
    const p = processMetric(metric).finally(() => {
      inflight.delete(p)
      updateProgress()
      launchNext()
    })
    inflight.add(p)
  }

  // Kick off initial pool
  for (let i = 0; i < VALIDATION_CONCURRENCY && i < metrics.length; i++) {
    launchNext()
  }
  updateProgress()

  // Wait for everything to drain
  await new Promise<void>(resolve => {
    const check = () => {
      if (inflight.size === 0 && nextIndex >= metrics.length) return resolve()
      setTimeout(check, 50)
    }
    check()
  })

  progressBar.stop()

  // Stage 3: Retry failed metrics after cooloff
  if (failedMetrics.length > 0) {
    text.detail(`\n   ${failedMetrics.length} failed — retrying after ${RETRY_COOLOFF_MS / 1000}s cooloff...`)
    await sleep(RETRY_COOLOFF_MS)

    let retryRecovered = 0
    let retryStillFailed = 0

    for (const metric of failedMetrics) {
      const { response, error } = await fetchMetricDataWithTimeout(metric)
      const cacheKey = `${metric.project}/${metric.identifier}`
      const endpoint = `/metrics/${metric.identifier}?project=${metric.project}`

      if (response) {
        // Recovered — update cache, clear the original error
        metricDataCache.set(cacheKey, response)
        metric.validateData(response)

        // Remove original issue and validation error
        const issueIdx = issues.findIndex(i => i.metric === metric)
        if (issueIdx !== -1) issues.splice(issueIdx, 1)
        metric.validationErrors = metric.validationErrors.filter(e => e.endpoint !== endpoint)

        failedFetches--
        failed--
        resolved++
        retryRecovered++
        text.pass(`   ✓ ${metric.project}/${metric.identifier} — recovered on retry (transient failure)`)
      } else {
        retryStillFailed++
        text.warn(`   ✗ ${metric.project}/${metric.identifier} — still failing: ${error}`)
      }
    }

    if (retryRecovered > 0) {
      text.detail(`   ${retryRecovered} recovered, ${retryStillFailed} still failing`)
    }
  }

  // Display results
  displayValidationResults(issues, totalChecked, dataTypeIssueCount)

  return {
    issues,
    totalChecked,
    failedFetches,
    metricDataCache
  }
}
