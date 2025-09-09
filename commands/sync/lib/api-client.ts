import { fetcher } from 'itty-fetcher'
import type { APIError, MetricDataResponse } from '../types'
import { apiErrors } from './api-errors'

const API_BASE_URL = 'https://api.blockworks.com/v1'
const API_KEY = process.env.BWR_API_KEY

if (!API_KEY) {
  console.error('BWR_API_KEY must be set in your .env file or runtime environment.')
  process.exit(1)
}

// Define API client
export const api = fetcher(API_BASE_URL, {
  headers: { 'x-api-key': API_KEY },
})

export const fetch = async <T>(endpoint: string, params?: Record<string, any>): Promise<T> => {
  try {
    return await api.get<T>(endpoint, { query: params })
  } catch (error: any) {
    const url = `${endpoint}${params ? '?' + new URLSearchParams(params).toString() : ''}`
    apiErrors.push({ ...error, url })
    throw new Error(`API Error: ${error.message || 'Unknown error'} at ${url}`)
  }
}

/**
 * Fetch without logging errors - used for intentional error cases like expand options detection
 */
export const fetchWithoutLogging = async <T>(endpoint: string, params?: Record<string, any>): Promise<T> => {
  try {
    return await api.get<T>(endpoint, { query: params })
  } catch (error: any) {
    const url = `${endpoint}${params ? '?' + new URLSearchParams(params).toString() : ''}`
    throw new Error(`API Error: ${error.message || 'Unknown error'} at ${url}`)
  }
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