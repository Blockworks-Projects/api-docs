import type { APIError, MetricDataResponse } from '../sync.types'
import { API } from './api'
import { apiErrors } from './api-errors'
import { getCachedMetricData } from './metric-data-cache'

/**
 * Fetch sample data for a metric
 */
export const fetchMetricSampleData = async (identifier: string, project: string): Promise<MetricDataResponse> => {
  // Check cache first
  const cachedData = getCachedMetricData(project, identifier)
  if (cachedData) {
    return cachedData
  }

  // If not in cache, fetch from API
  // Calculate date 5 days ago
  const fiveDaysAgo = new Date()
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5)
  const startDate = fiveDaysAgo.toISOString().split('T')[0]

  const [error, metric] = await API.get<[APIError, MetricDataResponse]>(`/metrics/${identifier}`, {
    query: {
      project,
      start_date: startDate,
    },
  })

  if (!error) return metric

  console.log()

  // Track API errors with full URL details
  const url = `/metrics/${identifier}?project=${project}&start_date=${startDate}`

  apiErrors.push({
    ...error,
    url,
  })

  // Return mock data if API call fails
  return {
    [project]: [
      { date: startDate ?? '2025-01-01', value: 0 },
    ]
  }
}