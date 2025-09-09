import { Metric, Project } from '../classes'
import { fetch, generateMockMetricData, getDateNDaysAgo } from '../lib/api-client'
import { readJsonFile, writeJsonFile } from '../lib/file-operations'
import * as text from '../lib/text'
import { metricsEqual, stripUpdatedFields } from '../lib/utils'
import type { MetricDataResponse, MetricsResponse } from '../types'

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

    try {
      const response = await fetch<MetricsResponse>('/metrics', {
        limit: LIMIT,
        page: page.toString(),
      })

      rawMetrics.push(...response.data)
      const totalPages = Math.ceil(response.total / LIMIT)
      hasMore = page < totalPages
      page++
    } catch (error: any) {
      text.fail('Error fetching metrics:', error.message)
      break
    }
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
export const fetchMetricSampleData = async (identifier: string, project: string): Promise<MetricDataResponse> => {
  const startDate = getDateNDaysAgo(5)

  try {
    return await fetch<MetricDataResponse>(`/metrics/${identifier}`, {
      project,
      start_date: startDate,
    })
  } catch {
    return generateMockMetricData(project, identifier)
  }
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

