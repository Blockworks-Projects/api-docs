import chalk from 'chalk'
import type { APIError, Metric, MetricsResponse } from '../sync.types'
import { API } from './api'

/**
 * Fetch all metrics by paginating through the API
 */
export const fetchAllMetrics = async (): Promise<Metric[]> => {
  const metrics: Metric[] = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    console.log(chalk.grey(`   + page ${page}...`))

    const [error, response] = await API.get<[APIError, MetricsResponse]>('/metrics', {
      query: {
        limit: '100',
        page: page.toString(),
      },
    })

    if (error) {
      console.error('Error fetching metrics:', error)
      break
    }

    metrics.push(...response.data)

    const totalPages = Math.ceil(response.total / 100)
    hasMore = page < totalPages
    page++
  }

  console.log(`\n✅ Found ${metrics.length} metrics`)
  return metrics
}