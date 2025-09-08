import type { Metric } from '../types'
import { readJsonFile, writeJsonFile } from '../lib/file-operations'
import { categorizeProjects, getCategorySummary } from '../categorizers/project-categorizer'
import { buildNavigationStructure } from '../builders/navigation-builder'
import { colors as c } from '../lib/constants'

/**
 * Generate and update docs.json navigation structure for metrics and assets
 */
export async function updateNavigation(metrics: Metric[], expandOptions?: string[]): Promise<void> {
  const docsPath = './docs.json'

  console.log(c.subHeader('\n  1. Categorizing projects...'))
  
  // Categorize projects
  const categories = categorizeProjects(metrics)
  const summary = getCategorySummary(categories)
  
  console.log(c.warning(`   Chains: ${summary.chainCount} projects`))
  console.log(c.warning(`   Projects: ${summary.projectCount} projects`))
  console.log(c.warning(`   Equities: ${summary.equityCount} projects`))

  // Build navigation structure
  const { chainsGroup, projectsGroup, equitiesGroup, assetsUpdate } = buildNavigationStructure(
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
  updateNavigationGroups(docs, chainsGroup, projectsGroup, equitiesGroup, metricsGroup)

  // Update assets navigation if provided
  if (assetsUpdate && expandOptions) {
    updateAssetsNavigation(docs, assetsUpdate)
  }

  // Write updated docs.json
  await writeJsonFile(docsPath, docs)
  console.log('\n  ✅ Updated docs.json navigation structure')
}

/**
 * Update navigation groups in docs structure
 */
function updateNavigationGroups(
  docs: any,
  chainsGroup: any,
  projectsGroup: any,
  equitiesGroup: any,
  metricsGroup: any
): void {
  // Remove existing metric groups and add them back in the correct order
  docs.navigation.tabs[0].groups = docs.navigation.tabs[0].groups.filter((g: any) => 
    !['Metrics : Chains', 'Chains', 'Metrics : Projects', 'Projects', 'Metrics : Equities', 'Equities'].includes(g.group)
  )
  
  // Find the index after the main Metrics group to insert the new groups
  const metricsIndex = docs.navigation.tabs[0].groups.findIndex((g: any) => g.group === 'Metrics')
  const insertIndex = metricsIndex >= 0 ? metricsIndex + 1 : docs.navigation.tabs[0].groups.length
  
  // Insert groups in the correct order: Chains, Projects, Equities
  docs.navigation.tabs[0].groups.splice(insertIndex, 0, chainsGroup, projectsGroup, equitiesGroup)

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