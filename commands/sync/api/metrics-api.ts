import type { Metric, MetricsResponse, MetricDataResponse } from '../types'
import { fetchWithErrorHandling, getDateNDaysAgo, generateMockMetricData } from '../lib/api-client'
import { readJsonFile, writeJsonFile } from '../lib/file-operations'
import { colors as c } from '../lib/constants'

const LIMIT = 500

/**
 * Fetch all metrics by paginating through the API
 */
export async function fetchAllMetrics(updateOnlyMode: boolean = false): Promise<{ metrics: Metric[], shouldContinue: boolean }> {
  // Load previous metrics if in update-only mode
  const previousMetrics = updateOnlyMode ? await loadPreviousMetrics() : null
  const metrics: Metric[] = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    console.log(c.muted(`   + page ${page}...`))

    const [error, response] = await fetchWithErrorHandling<MetricsResponse>('/metrics', {
      limit: LIMIT,
      page: page.toString(),
    })

    if (error) {
      console.error('Error fetching metrics:', error)
      break
    }

    if (response) {
      metrics.push(...response.data)
      const totalPages = Math.ceil(response.total / LIMIT)
      hasMore = page < totalPages
    } else {
      hasMore = false
    }
    
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

/**
 * Fetch sample data for a specific metric
 */
export async function fetchMetricSampleData(identifier: string, project: string): Promise<MetricDataResponse> {
  const startDate = getDateNDaysAgo(5)
  
  const [error, response] = await fetchWithErrorHandling<MetricDataResponse>(`/metrics/${identifier}`, {
    project,
    start_date: startDate,
  })

  if (error || !response) {
    // Generate mock data if API fails
    return generateMockMetricData(project, identifier)
  }

  return response
}

/**
 * Load previous metrics from saved file
 */
async function loadPreviousMetrics(): Promise<Metric[] | null> {
  try {
    return await readJsonFile<Metric[]>('./metrics.json')
  } catch {
    return null
  }
}

/**
 * Save metrics to file for next comparison
 */
async function saveMetricsForComparison(metrics: Metric[]): Promise<void> {
  try {
    const strippedMetrics = stripUpdatedFields(metrics)
    await writeJsonFile('./metrics.json', strippedMetrics)
  } catch (error) {
    console.warn(c.warning('⚠️ Could not save metrics.json for future comparison'))
  }
}

/**
 * Check if two metric arrays are equal (ignoring updated_at fields)
 */
function metricsEqual(prev: Metric[], current: Metric[]): boolean {
  if (prev.length !== current.length) return false
  
  const prevStripped = stripUpdatedFields(prev)
  const currentStripped = stripUpdatedFields(current)
  
  return JSON.stringify(prevStripped) === JSON.stringify(currentStripped)
}

/**
 * Remove updated_at fields for comparison
 */
function stripUpdatedFields(metrics: Metric[]): Omit<Metric, 'updated_at'>[] {
  return metrics.map(({ updated_at, ...metric }) => metric)
}