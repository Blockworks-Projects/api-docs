import type { MetricDataResponse } from '../types'

/**
 * Global cache for metric data responses
 * This is populated during validation and reused during page generation
 */
export const metricDataCache = new Map<string, MetricDataResponse>()

/**
 * Get cached metric data
 */
export const getCachedMetricData = (project: string, identifier: string): MetricDataResponse | undefined => {
  const key = `${project}/${identifier}`
  return metricDataCache.get(key)
}

/**
 * Set cached metric data
 */
export const setCachedMetricData = (project: string, identifier: string, data: MetricDataResponse): void => {
  const key = `${project}/${identifier}`
  metricDataCache.set(key, data)
}

/**
 * Clear all cached data
 */
export const clearMetricDataCache = (): void => {
  metricDataCache.clear()
}

/**
 * Populate cache from validation results
 */
export const populateMetricDataCache = (cache: Map<string, MetricDataResponse>): void => {
  cache.forEach((data, key) => {
    metricDataCache.set(key, data)
  })
}