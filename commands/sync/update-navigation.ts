import { readFile, writeFile } from 'node:fs/promises'
import type { Metric } from '../sync.types'
import { colors as c } from './const'
import { toTitleCase } from './utils'

/**
 * Generate docs.json navigation structure for metrics and assets
 */
export const updateNavigation = async (metrics: Metric[], expandOptions?: string[]): Promise<void> => {
  const docsPath = './docs.json'

  // Read existing docs.json
  const docsContent = await readFile(docsPath, 'utf-8')
  const docs = JSON.parse(docsContent)

  // Group metrics by project and category
  const projectGroups = new Map<string, Map<string, Metric[]>>()

  console.log(c.subHeader('\n  1. Grouping metrics by project and category...'))

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

  // Categorize projects into Chains vs Equities
  const chainProjects = new Map<string, Map<string, Metric[]>>()
  const equityProjects = new Map<string, Map<string, Metric[]>>()
  
  console.log(c.subHeader('\n  2. Categorizing projects into Chains and Equities...'))

  for (const [project, categoryMap] of projectGroups.entries()) {
    // Check if this project has a treasury-crypto-asset metric
    const hasTrasuryAsset = Array.from(categoryMap.values())
      .flat()
      .some(metric => metric.identifier === 'treasury-crypto-asset')
    
    if (hasTrasuryAsset) {
      equityProjects.set(project, categoryMap)
      console.log(c.muted(`   📈 ${project.toUpperCase()} -> Equities (has treasury-crypto-asset)`))
    } else {
      chainProjects.set(project, categoryMap)
      console.log(c.muted(`   🔗 ${project.toUpperCase()} -> Chains`))
    }
  }

  // Log the grouping results
  console.log(c.subHeader('\n  3. Project categorization summary:'))
  console.log(c.warning(`   Chains: ${chainProjects.size} projects`))
  for (const [project, categoryMap] of chainProjects.entries()) {
    for (const [category, categoryMetrics] of categoryMap.entries()) {
      console.log(`      + ${project}/${category}:`, c.number(categoryMetrics.length), c.muted('metrics'))
    }
  }
  
  console.log(c.warning(`   Equities: ${equityProjects.size} projects`))
  for (const [project, categoryMap] of equityProjects.entries()) {
    for (const [category, categoryMetrics] of categoryMap.entries()) {
      console.log(`      + ${project}/${category}:`, c.number(categoryMetrics.length), c.muted('metrics'))
    }
  }

  // Find navigation groups
  const metricsGroup = docs.navigation.tabs[0].groups.find((g: any) => g.group === 'Metrics')
  if (!metricsGroup) {
    throw new Error('Metrics group not found in docs.json')
  }

  // Find or create Chains group
  let chainsGroup = docs.navigation.tabs[0].groups.find((g: any) => g.group === 'Metrics : Chains' || g.group === 'Chains')
  if (!chainsGroup) {
    chainsGroup = { group: 'Metrics : Chains', pages: [], tag: `${chainProjects.size}` }
    docs.navigation.tabs[0].groups.push(chainsGroup)
  } else {
    chainsGroup.group = 'Metrics : Chains' // Update the name if it exists
    chainsGroup.tag = `${chainProjects.size}` // Update the tag
  }

  // Find or create Equities group
  let equitiesGroup = docs.navigation.tabs[0].groups.find((g: any) => g.group === 'Metrics : Equities' || g.group === 'Equities')
  if (!equitiesGroup) {
    equitiesGroup = { group: 'Metrics : Equities', pages: [], tag: `${equityProjects.size}` }
    docs.navigation.tabs[0].groups.push(equitiesGroup)
  } else {
    equitiesGroup.group = 'Metrics : Equities' // Update the name if it exists
    equitiesGroup.tag = `${equityProjects.size}` // Update the tag
  }

  // Clear existing project pages in all groups (keep static pages in Metrics)
  const staticPages = metricsGroup.pages.filter((page: any) =>
    typeof page === 'string'
  )
  metricsGroup.pages = staticPages
  chainsGroup.pages = []
  equitiesGroup.pages = []

  console.log(c.subHeader('\n  4. Processing Chain projects...'))

  // Generate navigation for Chain projects
  const sortedChainProjects = Array.from(chainProjects.entries()).sort(([a], [b]) => a.localeCompare(b))
  
  for (const [project, categoryMap] of sortedChainProjects) {
    const projectName = toTitleCase(project)
    console.log(c.warning(`\n   🔗 ${project.toUpperCase()}`))

    const projectGroup: any = {
      group: projectName,
      pages: []
    }

    // Sort categories alphabetically
    const sortedCategories = Array.from(categoryMap.keys()).sort()

    for (const category of sortedCategories) {
      const categoryMetrics = categoryMap.get(category)!
      const categoryFolder = category.toLowerCase().replace(/\s+/g, '-')

      // Sort metrics alphabetically within category
      const sortedMetrics = categoryMetrics.sort((a, b) => a.identifier.localeCompare(b.identifier))

      console.log(c.muted(`      + Creating ${category} subgroup with ${c.number(sortedMetrics.length)} metrics`))

      // Always create subgroup for categories (even single metrics)
      const categoryGroup = {
        group: category,
        pages: sortedMetrics.map(metric => `api-reference/metrics/${project}/${categoryFolder}/${metric.identifier}`)
      }
      projectGroup.pages.push(categoryGroup)
    }

    chainsGroup.pages.push(projectGroup)
  }

  console.log(c.subHeader('\n  5. Processing Equity projects...'))

  // Generate navigation for Equity projects
  const sortedEquityProjects = Array.from(equityProjects.entries()).sort(([a], [b]) => a.localeCompare(b))
  
  for (const [project, categoryMap] of sortedEquityProjects) {
    const projectName = toTitleCase(project)
    console.log(c.warning(`\n   📈 ${project.toUpperCase()}`))

    const projectGroup: any = {
      group: projectName,
      pages: []
    }

    // Sort categories alphabetically
    const sortedCategories = Array.from(categoryMap.keys()).sort()

    for (const category of sortedCategories) {
      const categoryMetrics = categoryMap.get(category)!
      const categoryFolder = category.toLowerCase().replace(/\s+/g, '-')

      // Sort metrics alphabetically within category
      const sortedMetrics = categoryMetrics.sort((a, b) => a.identifier.localeCompare(b.identifier))

      console.log(c.muted(`      + Creating ${category} subgroup with ${c.number(sortedMetrics.length)} metrics`))

      // Always create subgroup for categories (even single metrics)
      const categoryGroup = {
        group: category,
        pages: sortedMetrics.map(metric => `api-reference/metrics/${project}/${categoryFolder}/${metric.identifier}`)
      }
      projectGroup.pages.push(categoryGroup)
    }

    equitiesGroup.pages.push(projectGroup)
  }

  // Update Assets navigation if expand options are provided
  if (expandOptions && expandOptions.length > 0) {
    console.log(c.subHeader('\n  6. Updating Assets navigation...'))

    // Find the Assets group
    const assetsGroup = docs.navigation.tabs[0].groups
      .find((g: any) => g.group === 'API Reference')
      ?.pages?.find((p: any) => p.group === 'Assets')

    if (assetsGroup) {
      // Remove existing OHLCV page and any existing Expand Options groups
      assetsGroup.pages = assetsGroup.pages.filter((page: any) => {
        return page !== 'api-reference/assets/ohlcv' &&
               !(typeof page === 'object' && page.group === 'Expand Options')
      })

      // Create the Expand Options dropdown
      const expandOptionsGroup = {
        group: 'Expand Options',
        pages: expandOptions.map(option => `api-reference/assets/expand/${option.replace(/\./g, '-')}`)
      }

      // Add the dropdown to the Assets group
      assetsGroup.pages.push(expandOptionsGroup)

      console.log(c.muted(`      ✓ Added Expand Options dropdown with ${c.number(expandOptions.length)} options`))
    }
  }

  // Write updated docs.json
  await writeFile(docsPath, JSON.stringify(docs, null, 2), 'utf-8')
  console.log('\n  ✅ Updated docs.json navigation structure')
}