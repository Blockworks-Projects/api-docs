import type { Metric } from '../classes'
import type { MetricDataResponse } from '../types'
import { fetch, getDateNDaysAgo } from '../lib/api-client'

/**
 * Fetch data for a single metric with timeout
 */
export const fetchMetricDataWithTimeout = async (
  metric: Metric,
  timeout: number = 5000
): Promise<{ response?: MetricDataResponse; error?: string }> => {
  try {
    const startDate = getDateNDaysAgo(5)
    const response = await fetch<MetricDataResponse>(`/metrics/${metric.identifier}`, {
      project: metric.project,
      start_date: startDate
    })
    return { response }
  } catch (err: any) {
    return { error: err.message || 'Unknown error' }
  }
}