import type { Metric, MetricDataResponse } from '../types'
import { API } from '../lib/api'
import { getDateNDaysAgo } from '../lib/api-client'

/**
 * Fetch data for a single metric with timeout
 */
export async function fetchMetricDataWithTimeout(
  metric: Metric,
  timeout: number = 5000
): Promise<{ response?: MetricDataResponse; error?: string }> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const startDate = getDateNDaysAgo(5)

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