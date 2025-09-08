import type { APIError, MetricDataResponse } from '../types'
import { API } from './api'
import { apiErrors } from './api-errors'

/**
 * Fetch data with standardized error handling
 */
export async function fetchWithErrorHandling<T>(
  endpoint: string,
  params?: Record<string, any>
): Promise<[APIError | null, T | null]> {
  const [error, response] = await API.get<[APIError, T]>(endpoint, { query: params })
  
  if (error) {
    apiErrors.push({ ...error, url: `${endpoint}${params ? '?' + new URLSearchParams(params).toString() : ''}` })
    return [error, null]
  }
  
  return [null, response]
}

/**
 * Generate date string for N days ago
 */
export function getDateNDaysAgo(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().split('T')[0]
}

/**
 * Generate mock metric data when API fails
 */
export function generateMockMetricData(project: string, identifier: string): MetricDataResponse {
  const dates = Array.from({ length: 5 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (4 - i))
    return date.toISOString().split('T')[0]
  })

  return {
    [project]: dates.map((date, index) => ({
      date,
      value: Math.round(Math.random() * 1000 + 100) // Random value between 100-1100
    }))
  }
}