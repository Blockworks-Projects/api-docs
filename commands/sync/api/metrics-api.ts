import type { MetricsResponse, MetricDataResponse } from '../types'
import { Metric, Project } from '../classes'
import { fetchWithErrorHandling, getDateNDaysAgo, generateMockMetricData } from '../lib/api-client'
import { readJsonFile, writeJsonFile } from '../lib/file-operations'
import { stripUpdatedFields, metricsEqual } from '../lib/utils'
import * as text from '../lib/text'

const LIMIT = 500

/**
 * Fetch all metrics by paginating through the API and create Projects/Metrics instances
 */
export async function fetchAllMetrics(updateOnlyMode: boolean = false): Promise<{ projects: Map<string, Project>, shouldContinue: boolean }> {
  text.header('🔎 Fetching metrics from API...')

  // Load previous metrics if in update-only mode
  const previousMetrics = updateOnlyMode ? await loadPreviousMetrics() : null
  const rawMetrics: any[] = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    text.detail(`fetching page ${page}...`)

    const [error, response] = await fetchWithErrorHandling<MetricsResponse>('/metrics', {
      limit: LIMIT,
      page: page.toString(),
    })

    if (error) {
      text.fail('Error fetching metrics:', error)
      break
    }

    if (response) {
      rawMetrics.push(...response.data)
      const totalPages = Math.ceil(response.total / LIMIT)
      hasMore = page < totalPages
    } else {
      hasMore = false
    }

    page++
  }

  text.detail(text.withCount(`Found {count} metrics`, rawMetrics.length))

  // Check if metrics have changed when in update-only mode
  let shouldContinue = true
  if (updateOnlyMode && previousMetrics) {
    if (metricsEqual(previousMetrics, rawMetrics)) {
      text.detail(`\n⚡ No changes detected, skipping sync process`)
      shouldContinue = false
    } else {
      text.detail(`\n🔄 Changes detected, continuing with sync`)
    }
  }

  // Always save metrics for next comparison (after fetch completes)
  await saveMetricsForComparison(rawMetrics)

  // Convert raw metrics to Project/Metric instances
  const projects = createProjectsFromMetrics(rawMetrics)

  return { projects, shouldContinue }
}

/**
 * Create Project instances with their Metrics from raw API data
 */
function createProjectsFromMetrics(rawMetrics: any[]): Map<string, Project> {
  const projects = new Map<string, Project>()

  for (const rawMetric of rawMetrics) {
    let project = projects.get(rawMetric.project)
    
    if (!project) {
      project = new Project({
        name: rawMetric.project,
        slug: rawMetric.project,
        metrics: []
      })
      projects.set(rawMetric.project, project)
    }

    const metric = new Metric(rawMetric)
    metric.parent = project
    project.addMetric(metric)
  }

  return projects
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
    text.warn('⚠️ Could not save metrics.json for future comparison')
  }
}

