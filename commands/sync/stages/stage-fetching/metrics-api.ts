import type { MetricsResponse, MetricDataResponse, APIError } from '../../types'
import { Metric, Project } from '../../classes'
import { fetch, getDateNDaysAgo, generateMockMetricData } from '../../lib/api-client'
import { readJsonFile, writeJsonFile } from '../../lib/file-operations'
import { stripUpdatedFields, metricsEqual, apiErrors } from '../../lib/utils'
import * as text from '../../lib/text'

const LIMIT = 500

export const fetchAllMetrics = async (updateOnlyMode = false): Promise<{ projects: Map<string, Project>, shouldContinue: boolean }> => {
  text.header('🔎 Fetching metrics from API...')
  const previousMetrics = updateOnlyMode ? await loadPreviousMetrics() : null
  const rawMetrics: any[] = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    text.detail(`fetching page ${page}...`)
    try {
      const response = await fetch<MetricsResponse>('/metrics', { limit: LIMIT, page: page.toString() })
      rawMetrics.push(...response.data)
      hasMore = page < Math.ceil(response.total / LIMIT)
      page++
    } catch (error: any) {
      text.fail('Error fetching metrics:', error.message)
      break
    }
  }

  text.detail(text.withCount(`Found {count} metrics`, rawMetrics.length))

  let shouldContinue = true
  if (updateOnlyMode && previousMetrics) {
    if (metricsEqual(previousMetrics, rawMetrics)) {
      text.detail(`\n⚡ No changes detected, skipping sync process`)
      shouldContinue = false
    } else {
      text.detail(`\n🔄 Changes detected, continuing with sync`)
    }
  }

  await saveMetricsForComparison(rawMetrics)
  const projects = createProjectsFromMetrics(rawMetrics)

  return { projects, shouldContinue }
}

const createProjectsFromMetrics = (rawMetrics: any[]): Map<string, Project> => {
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

const loadPreviousMetrics = async (): Promise<Metric[] | null> => {
  try {
    return await readJsonFile<Metric[]>('./metrics.json')
  } catch {
    return null
  }
}

const saveMetricsForComparison = async (metrics: Metric[]): Promise<void> => {
  try {
    const strippedMetrics = stripUpdatedFields(metrics)
    await writeJsonFile('./metrics.json', strippedMetrics)
  } catch {
    text.warn('⚠️ Could not save metrics.json for future comparison')
  }
}

export const fetchAssetSampleData = async (expandOption: string): Promise<any> => {
  try {
    return await fetch(`/assets/ethereum`, { expand: expandOption })
  } catch (error: any) {
    const url = `/assets/ethereum?expand=${expandOption}`
    apiErrors.push({
      status: error.status || 500,
      error: error.name || 'Unknown Error',
      message: [error.message || 'Unknown error'],
      url,
    })
    return getMockAssetData(expandOption)
  }
}

const getMockAssetData = (expandOption: string): any => {
  const baseResponse = { id: 1027, slug: "ethereum", title: "Ethereum" }
  const mockData: Record<string, any> = {
    'addresses': { addresses: [{ address: "0x...", chain: { id: 1, name: "Ethereum" } }] },
    'chains': { chains: [{ id: 1, name: "Ethereum", slug: "ethereum" }] },
    'addresses.chain': { addresses: [{ address: "0x...", chain: { id: 1, name: "Ethereum", slug: "ethereum" } }] },
    'is_favorite': { is_favorite: false },
    'markets': { markets: [{ exchange: "binance", pair: "ETH/USDT", volume_24h: 123456789 }] },
    'market_cap': { market_cap: { usd: 415000000000, updated_at: 1723180800 } },
    'ohlcv_last_24_h': { ohlcv_last_24_h: { open: 3412.21, high: 3490.55, low: 3398.33, close: 3450.12, volume: 189234567.89, updated_at: 1723180800 } },
    'price': { price: { usd: 3450.12, updated_at: 1723180800 } },
    'reference': { reference: { website: "https://ethereum.org", whitepaper: "https://ethereum.org/whitepaper/" } },
    'sector': { sector: { id: 1, name: "Smart Contract Platform" } },
    'supply': { supply: { circulating: 120280000, total: 120280000, updated_at: 1723180800 } }
  }
  const expandData = mockData[expandOption] || { [expandOption]: "placeholder_data" }
  return { ...baseResponse, ...expandData }
}
