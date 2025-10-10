import { buildNavigationStructure } from './navigation-builder'
import { categorizeProjects, convertToLegacyFormat } from './project-categorizer'
import { readJsonFile, writeJsonFile } from '../../lib/file-operations'
import * as text from '../../lib/text'
import type { Metric, Project } from '../../classes'

/**
 * Generate and update docs.json navigation structure for metrics only
 */
export async function updateNavigation(metrics: Metric[], projects: Map<string, Project>): Promise<void> {
  text.header('📋 Updating docs.json navigation...')

  const docsPath = './docs.json'

  text.subheader('Categorizing projects...')

  // Use Project class categorization
  const projectCategories = categorizeProjects(projects)
  const categories = convertToLegacyFormat(projectCategories)

  // Calculate summary
  const summary = {
    chainCount: categories.chains.size,
    projectCount: categories.projects.size,
    etfCount: categories.etfs.size,
    treasuryCount: categories.treasuries.size
  }

  text.detail(text.withCount(`Chains: {count} projects`, summary.chainCount))
  text.detail(text.withCount(`Projects: {count} projects`, summary.projectCount))
  text.detail(text.withCount(`ETFs: {count} projects`, summary.etfCount))
  text.detail(text.withCount(`Treasuries: {count} projects`, summary.treasuryCount))

  // Build navigation structure (metrics only, no assets)
  const { chainsGroup, projectsGroup, etfsGroup, treasuriesGroup } = buildNavigationStructure(categories)

  // Read and update docs.json
  const docs = await readJsonFile<any>(docsPath)

  // Find the main metrics group
  const metricsGroup = docs.navigation.tabs[0].groups.find((g: any) => g.group === 'Metrics')
  if (!metricsGroup) {
    throw new Error('Metrics group not found in docs.json')
  }

  // Update or create category groups
  updateNavigationGroups(docs, chainsGroup, projectsGroup, etfsGroup, treasuriesGroup, metricsGroup)

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
    !['Metrics: Chains', 'Chains', 'Metrics: Projects', 'Projects', 'Metrics: ETFs', 'ETFs', 'Metrics: Treasuries', 'Treasuries', 'Metrics: Equities', 'Equities'].includes(g.group)
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

