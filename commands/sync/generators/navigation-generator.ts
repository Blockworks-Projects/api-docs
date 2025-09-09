import { buildNavigationStructure } from '../builders/navigation-builder'
import { categorizeProjects, getCategorySummary } from '../categorizers/project-categorizer'
import { readJsonFile, writeJsonFile } from '../lib/file-operations'
import * as text from '../lib/text'
import type { Metric } from '../types'

/**
 * Generate and update docs.json navigation structure for metrics and assets
 */
export async function updateNavigation(metrics: Metric[], expandOptions?: string[]): Promise<void> {
  text.header('📋 Updating docs.json navigation...')

  const docsPath = './docs.json'

  text.subheader('Categorizing projects...')

  // Categorize projects
  const categories = categorizeProjects(metrics)
  const summary = getCategorySummary(categories)

  text.detail(text.withCount(`Chains: {count} projects`, summary.chainCount))
  text.detail(text.withCount(`Projects: {count} projects`, summary.projectCount))
  text.detail(text.withCount(`ETFs: {count} projects`, summary.etfCount))
  text.detail(text.withCount(`Treasuries: {count} projects`, summary.treasuryCount))

  // Build navigation structure
  const { chainsGroup, projectsGroup, etfsGroup, treasuriesGroup, assetsUpdate } = buildNavigationStructure(
    categories,
    expandOptions
  )

  // Read and update docs.json
  const docs = await readJsonFile<any>(docsPath)

  // Find the main metrics group
  const metricsGroup = docs.navigation.tabs[0].groups.find((g: any) => g.group === 'Metrics')
  if (!metricsGroup) {
    throw new Error('Metrics group not found in docs.json')
  }

  // Update or create category groups
  updateNavigationGroups(docs, chainsGroup, projectsGroup, etfsGroup, treasuriesGroup, metricsGroup)

  // Update assets navigation if provided
  if (assetsUpdate && expandOptions) {
    updateAssetsNavigation(docs, assetsUpdate)
  }

  // Write updated docs.json
  await writeJsonFile(docsPath, docs)
  text.pass('Updated docs.json navigation structure')
}

/**
 * Update navigation groups in docs structure
 */
function updateNavigationGroups(
  docs: any,
  chainsGroup: any,
  projectsGroup: any,
  etfsGroup: any,
  treasuriesGroup: any,
  metricsGroup: any
): void {
  // Remove existing metric groups and add them back in the correct order
  docs.navigation.tabs[0].groups = docs.navigation.tabs[0].groups.filter((g: any) =>
    !['Metrics : Chains', 'Chains', 'Metrics : Projects', 'Projects', 'Metrics : ETFs', 'ETFs', 'Metrics : Treasuries', 'Treasuries', 'Metrics : Equities', 'Equities'].includes(g.group)
  )

  // Find the index after the main Metrics group to insert the new groups
  const metricsIndex = docs.navigation.tabs[0].groups.findIndex((g: any) => g.group === 'Metrics')
  const insertIndex = metricsIndex >= 0 ? metricsIndex + 1 : docs.navigation.tabs[0].groups.length

  // Insert groups in the correct order: Chains, Projects, ETFs, Treasuries
  docs.navigation.tabs[0].groups.splice(insertIndex, 0, chainsGroup, projectsGroup, etfsGroup, treasuriesGroup)

  // Clear existing project pages in metrics group (keep static pages)
  const staticPages = metricsGroup.pages.filter((page: any) => typeof page === 'string')
  metricsGroup.pages = staticPages
}

/**
 * Update assets navigation
 */
function updateAssetsNavigation(docs: any, assetsUpdate: any): void {
  // Find the Assets group
  const assetsGroup = docs.navigation.tabs[0].groups
    .find((g: any) => g.group === 'API Reference')
    ?.pages?.find((p: any) => p.group === 'Assets')

  if (assetsGroup) {
    // Remove existing OHLCV page and any existing Add-On Information groups
    assetsGroup.pages = assetsGroup.pages.filter((page: any) => {
      return page !== 'api-reference/assets/ohlcv' &&
             !(typeof page === 'object' && (page.group === 'Expand Options' || page.group === 'Add-On Information'))
    })

    // Add the new assets navigation
    assetsGroup.pages.push(assetsUpdate)
  }
}