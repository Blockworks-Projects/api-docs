import { readFile, writeFile } from 'node:fs/promises'
import type { APIError, Metric, MetricsResponse } from '../sync.types'
import { API } from './api'
import { colors as c } from './const'
import { metricsEqual, stripUpdatedFields } from './utils'

/**
 * Load previous metrics from saved file
 */
const loadPreviousMetrics = async (): Promise<Metric[] | null> => {
  try {
    const content = await readFile('./metrics.json', 'utf-8')
    return JSON.parse(content)
  } catch {
    return null
  }
}

/**
 * Save metrics to file for next comparison
 */
const saveMetricsForComparison = async (metrics: Metric[]): Promise<void> => {
  try {
    const strippedMetrics = stripUpdatedFields(metrics)
    await writeFile('./metrics.json', JSON.stringify(strippedMetrics, null, 2), 'utf-8')
  } catch (error) {
    console.warn(c.warning('⚠️ Could not save metrics.json for future comparison'))
  }
}

/**
 * Fetch all metrics by paginating through the API
 */
export const fetchAllMetrics = async (updateOnlyMode: boolean = false): Promise<{ metrics: Metric[], shouldContinue: boolean }> => {
  // Load previous metrics if in update-only mode
  const previousMetrics = updateOnlyMode ? await loadPreviousMetrics() : null
  const metrics: Metric[] = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    console.log(c.muted(`   + page ${page}...`))

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

  console.log(`\n✅ Found ${c.number(metrics.length)} metrics`)

  // Check if metrics have changed when in update-only mode
  let shouldContinue = true
  if (updateOnlyMode && previousMetrics) {
    if (metricsEqual(previousMetrics, metrics)) {
      console.log(c.muted(`\n⚡ No changes detected, skipping sync process`))
      shouldContinue = false
    } else {
      console.log(c.muted(`\n🔄 Changes detected, continuing with sync`))
    }
  }

  // Always save metrics for next comparison (after fetch completes)
  await saveMetricsForComparison(metrics)

  return { metrics, shouldContinue }
}