import type { Metric } from '../../classes'
import type { MetricDataResponse } from '../../types'
import { fetch, getDateNDaysAgo } from '../../lib/api-client'
import { FETCH_TIMEOUT_MS } from '../../lib/constants'

export type FetchResult = {
  response?: MetricDataResponse
  error?: string
  timedOut?: boolean
}

/**
 * Fetch data for a single metric with timeout
 */
export const fetchMetricDataWithTimeout = async (
  metric: Metric
): Promise<FetchResult> => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const startDate = getDateNDaysAgo(5)
    const response = await fetch<MetricDataResponse>(`/metrics/${metric.identifier}`, {
      project: metric.project,
      start_date: startDate
    }, controller.signal)
    return { response }
  } catch (err: any) {
    if (controller.signal.aborted) {
      return {
        error: `Timeout after ${FETCH_TIMEOUT_MS}ms: /metrics/${metric.identifier}?project=${metric.project}`,
        timedOut: true
      }
    }
    return { error: err.message || 'Unknown error' }
  } finally {
    clearTimeout(timer)
  }
}