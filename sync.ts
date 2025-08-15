#!/usr/bin/env bun

import { mkdir, writeFile, exists, readdir, rm, readFile } from 'node:fs/promises'
import { join } from 'node:path'

// Configuration
const API_BASE_URL = 'https://api.blockworks.com/v1'
const API_KEY = process.env.BWR_API_KEY || 'dba7d3f2f9fc4930975f0d5fe4465433'
const OUTPUT_DIR = './api-reference/metrics'

// Helper function for API calls
async function apiCall<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${API_BASE_URL}${endpoint}`)
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value)
    })
  }
  
  const response = await fetch(url, {
    headers: {
      'x-api-key': API_KEY,
      'Content-Type': 'application/json',
    },
  })
  
  if (!response.ok) {
    throw new Error(`API call failed: ${response.status} ${response.statusText}`)
  }
  
  return response.json()
}

interface Metric {
  name: string
  description: string
  identifier: string
  project: string
  source: string
  data_type: string
  parameters: Record<string, any>
  interval: string
  aggregation: string
  category: string
  updated_at: number
}

interface MetricsResponse {
  data: Metric[]
  total: number
  page: number
}

interface MetricDataPoint {
  date: string
  value: number | string
}

interface MetricDataResponse {
  [project: string]: MetricDataPoint[]
}

// Template for individual metric pages
const METRIC_PAGE_TEMPLATE = `---
title: "{metric_name}"
description: "{metric_description}"
openapi: 'GET /v1/metrics/{metric_identifier}'
---

## Overview

- **Unit:** {metric_unit}
- **Aggregation:** {metric_aggregation}
- **Source:** {metric_source}



## Example Response

\`\`\`json
{example_response}
\`\`\`

## Notes
- {metric_aggregation} aggregates unless otherwise noted.
- Data is updated {metric_interval} and may be revised after late-arriving data.
`

// Template for metrics catalog entry
const CATALOG_ENTRY_TEMPLATE = `## {metric_name}

{metric_description}


| Chain | Identifier | Source | Interval | Data Type |
|-------|------------|--------|----------|-----------|
{catalog_rows}
`

/**
 * Clean up existing asset folders for projects found in metrics
 */
async function cleanupExistingContent(metrics: Metric[]): Promise<void> {
  // Get unique project names from metrics
  const projects = [...new Set(metrics.map(m => m.project))]
  
  console.log(`🧹 Cleaning up existing content for projects: ${projects.join(', ')}`)
  
  for (const project of projects) {
    const projectDir = join(OUTPUT_DIR, project)
    
    try {
      // Check if directory exists
      if (await exists(projectDir)) {
        // Remove the entire project directory to clean up old structure
        await rm(projectDir, { recursive: true, force: true })
        console.log(`   Removed ${project}/ directory`)
      }
    } catch (error) {
      console.warn(`⚠️  Failed to remove ${project}/ directory:`, error)
    }
  }
}

/**
 * Fetch all metrics by paginating through the API
 */
async function fetchAllMetrics(): Promise<Metric[]> {
  const metrics: Metric[] = []
  let page = 1
  let hasMore = true

  console.log('📡 Fetching metrics from API...')

  while (hasMore) {
    console.log(`   Page ${page}...`)
    
    const response = await apiCall<MetricsResponse>('/metrics', {
      limit: '100',
      page: page.toString(),
    })

    metrics.push(...response.data)
    
    const totalPages = Math.ceil(response.total / 100)
    hasMore = page < totalPages
    page++
  }

  console.log(`✅ Found ${metrics.length} metrics`)
  return metrics
}

/**
 * Fetch sample data for a metric
 */
async function fetchMetricSampleData(identifier: string, project: string): Promise<MetricDataResponse> {
  // Calculate date 5 days ago
  const fiveDaysAgo = new Date()
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5)
  const startDate = fiveDaysAgo.toISOString().split('T')[0]
  
  try {
    const response = await apiCall<MetricDataResponse>(`/metrics/${identifier}`, {
      project,
      start_date: startDate,
    })
    
    return response
  } catch (error) {
    console.warn(`⚠️  Failed to fetch sample data for ${identifier} (${project}):`, error)
    // Return mock data if API call fails
    return {
      [project]: [
        { date: startDate, value: 0 },
      ]
    }
  }
}

/**
 * Determine unit from data_type
 */
function getUnitFromDataType(dataType: string): string {
  if (dataType.includes('usd')) return 'USD'
  if (dataType.includes('float')) return 'Native units'
  if (dataType.includes('int')) return 'Count'
  return 'Various'
}

/**
 * Capitalize first letter of each word
 */
function toTitleCase(str: string): string {
  return str.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

/**
 * Escape double quotes for YAML frontmatter
 */
function escapeYamlString(str: string): string {
  return str.replace(/"/g, '\\"')
}

/**
 * Generate a single metric page
 */
async function generateMetricPage(metric: Metric): Promise<void> {
  const categoryFolder = metric.category.toLowerCase().replace(/\s+/g, '-')
  const projectDir = join(OUTPUT_DIR, metric.project, categoryFolder)
  const filePath = join(projectDir, `${metric.identifier}.mdx`)

  console.log(`   📄 Generating ${metric.project}/${categoryFolder}/${metric.identifier}.mdx`)

  // Ensure directory exists
  await mkdir(projectDir, { recursive: true })

  // Fetch sample data
  const sampleData = await fetchMetricSampleData(metric.identifier, metric.project)
  
  // Format the response
  const exampleResponse = JSON.stringify(sampleData, null, 2)
  
  // Generate content from template
  const aggregation = toTitleCase(metric.aggregation.toLowerCase())
  const content = METRIC_PAGE_TEMPLATE
    .replace('{metric_name}', escapeYamlString(metric.name))
    .replace('{metric_description}', escapeYamlString(metric.description))
    .replace('{metric_identifier}', metric.identifier)
    .replace('{metric_unit}', getUnitFromDataType(metric.data_type))
    .replace(/\{metric_aggregation\}/g, aggregation)
    .replace('{metric_source}', metric.source)
    .replace('{metric_interval}', metric.interval)
    .replace('{example_response}', exampleResponse)

  // Write the file
  await writeFile(filePath, content, 'utf-8')
}

/**
 * Generate docs.json navigation structure for metrics
 */
async function updateDocsNavigation(metrics: Metric[]): Promise<void> {
  const docsPath = './docs.json'
  
  // Read existing docs.json
  const docsContent = await readFile(docsPath, 'utf-8')
  const docs = JSON.parse(docsContent)
  
  // Group metrics by project and category
  const projectGroups = new Map<string, Map<string, Metric[]>>()
  
  console.log('📊 Grouping metrics by project and category...')
  
  metrics.forEach(metric => {
    if (!projectGroups.has(metric.project)) {
      projectGroups.set(metric.project, new Map())
    }
    
    const categoryMap = projectGroups.get(metric.project)!
    const categoryKey = metric.category
    
    if (!categoryMap.has(categoryKey)) {
      categoryMap.set(categoryKey, [])
    }
    
    categoryMap.get(categoryKey)!.push(metric)
  })
  
  // Log the grouping results
  for (const [project, categoryMap] of projectGroups.entries()) {
    console.log(`   📁 ${project}: ${Array.from(categoryMap.keys()).join(', ')}`)
    for (const [category, categoryMetrics] of categoryMap.entries()) {
      console.log(`      ${category}: ${categoryMetrics.length} metrics`)
    }
  }
  
  // Find the Metrics group in docs.json
  const metricsGroup = docs.navigation.tabs[0].groups.find((g: any) => g.group === 'Metrics')
  if (!metricsGroup) {
    throw new Error('Metrics group not found in docs.json')
  }
  
  // Clear existing project pages (keep about and catalog)
  const staticPages = metricsGroup.pages.filter((page: any) => 
    typeof page === 'string' && (page.includes('/about') || page.includes('/catalog'))
  )
  
  metricsGroup.pages = staticPages
  
  // Generate navigation for each project
  for (const [project, categoryMap] of projectGroups.entries()) {
    const projectName = toTitleCase(project)
    console.log(`   🏗️  Processing ${projectName} project with ${categoryMap.size} categories`)
    
    const projectGroup: any = {
      group: projectName,
      pages: []
    }
    
    // Sort categories - Financials first, then alphabetical
    const sortedCategories = Array.from(categoryMap.keys()).sort((a, b) => {
      if (a === 'Financials' && b !== 'Financials') return -1
      if (b === 'Financials' && a !== 'Financials') return 1
      return a.localeCompare(b)
    })
    
    console.log(`      Categories: ${sortedCategories.join(', ')}`)
    
    for (const category of sortedCategories) {
      const categoryMetrics = categoryMap.get(category)!
      const categoryFolder = category.toLowerCase().replace(/\s+/g, '-')
      
      // Sort metrics alphabetically within category
      const sortedMetrics = categoryMetrics.sort((a, b) => a.identifier.localeCompare(b.identifier))
      
      console.log(`   📂 Creating ${category} subgroup with ${sortedMetrics.length} metrics`)
      
      // Always create subgroup for categories (even single metrics)
      const categoryGroup = {
        group: category,
        pages: sortedMetrics.map(metric => `api-reference/metrics/${project}/${categoryFolder}/${metric.identifier}`)
      }
      projectGroup.pages.push(categoryGroup)
    }
    
    metricsGroup.pages.push(projectGroup)
  }
  
  // Write updated docs.json
  await writeFile(docsPath, JSON.stringify(docs, null, 2), 'utf-8')
  console.log('📋 Updated docs.json navigation structure')
}

/**
 * Generate metrics catalog
 */
async function generateMetricsCatalog(metrics: Metric[]): Promise<void> {
  const catalogPath = join('./api-reference/metrics', 'catalog.mdx')
  
  // Group metrics by identifier
  const metricGroups = new Map<string, Metric[]>()
  
  metrics.forEach(metric => {
    if (!metricGroups.has(metric.identifier)) {
      metricGroups.set(metric.identifier, [])
    }
    metricGroups.get(metric.identifier)!.push(metric)
  })

  // Sort metric groups by identifier
  const sortedIdentifiers = Array.from(metricGroups.keys()).sort()

  let catalogContent = `---
title: 'Metrics Catalog'
description: 'This catalog lists all available metrics, their descriptions, chains, identifiers, sources, data type, and frequency.'
icon: scroll
---

`

  // Generate each metric entry
  for (const identifier of sortedIdentifiers) {
    const metricsForIdentifier = metricGroups.get(identifier)!
    const firstMetric = metricsForIdentifier[0]

    // Generate table rows for each project
    const catalogRows = metricsForIdentifier
      .map(metric => `| ${toTitleCase(metric.project)} | \`${metric.identifier}\` | ${metric.source} | ${metric.interval} | ${metric.data_type} |`)
      .join('\n')

    const entry = CATALOG_ENTRY_TEMPLATE
      .replace('{metric_name}', firstMetric.name)
      .replace('{metric_description}', firstMetric.description)
      .replace('{catalog_rows}', catalogRows)

    catalogContent += entry + '\n'
  }

  // Ensure directory exists
  await mkdir(OUTPUT_DIR, { recursive: true })
  
  // Write catalog
  await writeFile(catalogPath, catalogContent, 'utf-8')
}

/**
 * Main sync function
 */
async function main() {
  console.log('🚀 Starting metrics sync...')
  
  try {
    // Fetch all metrics first
    const metrics = await fetchAllMetrics()

    // Clean up existing content for projects found in metrics
    await cleanupExistingContent(metrics)

    // Create output directory
    await mkdir(OUTPUT_DIR, { recursive: true })

    console.log('📝 Generating metric pages...')
    
    // Generate individual metric pages
    let completed = 0
    for (const metric of metrics) {
      await generateMetricPage(metric)
      completed++
      
      if (completed % 20 === 0 || completed === metrics.length) {
        console.log(`   ✏️  Generated ${completed}/${metrics.length} pages`)
      }
    }

    console.log('📚 Generating metrics catalog...')
    await generateMetricsCatalog(metrics)

    console.log('📋 Updating docs.json navigation...')
    await updateDocsNavigation(metrics)

    console.log(`✅ Sync complete! Generated ${metrics.length} metric pages, catalog, and navigation in ${OUTPUT_DIR}`)
    
  } catch (error) {
    console.error('❌ Sync failed:', error)
    process.exit(1)
  }
}

// Run the sync
if (import.meta.main) {
  main()
}