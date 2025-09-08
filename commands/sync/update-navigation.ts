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

  // Categorize projects into Chains, Projects, and Equities
  const chainProjects = new Map<string, Map<string, Metric[]>>()
  const projectProjects = new Map<string, Map<string, Metric[]>>()
  const equityProjects = new Map<string, Map<string, Metric[]>>()

  console.log(c.subHeader('\n  2. Categorizing projects into Chains, Projects, and Equities...'))

  for (const [project, categoryMap] of projectGroups.entries()) {
    // Check if this project has a treasury-crypto-asset metric (Equity)
    const isEquity = Array.from(categoryMap.values())
      .flat()
      .some(metric => metric.identifier === 'treasury-crypto-asset')

    // Check if this project has native-token-price metric OR is Bitcoin (Chain)
    const isChain = Array.from(categoryMap.values())
      .flat()
      .some(metric => metric.identifier === 'transactions-failed')
    const isBitcoin = project.toLowerCase() === 'bitcoin'

    if (isEquity) {
      equityProjects.set(project, categoryMap)
      console.log(c.muted(`   📈 ${project.toUpperCase()} -> Equities (has treasury-crypto-asset)`))
    } else if (isChain || isBitcoin) {
      chainProjects.set(project, categoryMap)
      console.log(c.muted(`   🔗 ${project.toUpperCase()} -> Chains (${isBitcoin ? 'hardcoded Bitcoin' : 'has native-token-price'})`))
    } else {
      projectProjects.set(project, categoryMap)
      console.log(c.muted(`   📊 ${project.toUpperCase()} -> Projects`))
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

  console.log(c.warning(`   Projects: ${projectProjects.size} projects`))
  for (const [project, categoryMap] of projectProjects.entries()) {
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

  // Find or create navigation groups in order: Chains, Projects, Equities
  let chainsGroup = docs.navigation.tabs[0].groups.find((g: any) => g.group === 'Metrics : Chains' || g.group === 'Chains')
  if (!chainsGroup) {
    chainsGroup = { group: 'Metrics : Chains', pages: [], tag: `${chainProjects.size}` }
  } else {
    chainsGroup.group = 'Metrics : Chains' // Update the name if it exists
    chainsGroup.tag = `${chainProjects.size}` // Update the tag
  }

  let projectsGroup = docs.navigation.tabs[0].groups.find((g: any) => g.group === 'Metrics : Projects' || g.group === 'Projects')
  if (!projectsGroup) {
    projectsGroup = { group: 'Metrics : Projects', pages: [], tag: `${projectProjects.size}` }
  } else {
    projectsGroup.group = 'Metrics : Projects' // Update the name if it exists
    projectsGroup.tag = `${projectProjects.size}` // Update the tag
  }

  let equitiesGroup = docs.navigation.tabs[0].groups.find((g: any) => g.group === 'Metrics : Equities' || g.group === 'Equities')
  if (!equitiesGroup) {
    equitiesGroup = { group: 'Metrics : Equities', pages: [], tag: `${equityProjects.size}` }
  } else {
    equitiesGroup.group = 'Metrics : Equities' // Update the name if it exists
    equitiesGroup.tag = `${equityProjects.size}` // Update the tag
  }

  // Remove existing metric groups and add them back in the correct order
  docs.navigation.tabs[0].groups = docs.navigation.tabs[0].groups.filter((g: any) =>
    !['Metrics : Chains', 'Chains', 'Metrics : Projects', 'Projects', 'Metrics : Equities', 'Equities'].includes(g.group)
  )

  // Find the index after the main Metrics group to insert the new groups
  const metricsIndex = docs.navigation.tabs[0].groups.findIndex((g: any) => g.group === 'Metrics')
  const insertIndex = metricsIndex >= 0 ? metricsIndex + 1 : docs.navigation.tabs[0].groups.length

  // Insert groups in the correct order: Chains, Projects, Equities
  docs.navigation.tabs[0].groups.splice(insertIndex, 0, chainsGroup, projectsGroup, equitiesGroup)

  // Clear existing project pages in all groups (keep static pages in Metrics)
  const staticPages = metricsGroup.pages.filter((page: any) =>
    typeof page === 'string'
  )
  metricsGroup.pages = staticPages
  chainsGroup.pages = []
  projectsGroup.pages = []
  equitiesGroup.pages = []

  console.log(c.subHeader('\n  4. Processing Chain projects...'))

  // Generate navigation for Chain projects
  const sortedChainProjects = Array.from(chainProjects.entries()).sort(([a], [b]) => a.localeCompare(b))

  for (const [project, categoryMap] of sortedChainProjects) {
    const projectName = toTitleCase(project)
    console.log(c.warning(`\n   🔗 ${project.toUpperCase()}`))

    const projectGroup: any = {
      group: projectName,
      icon: "link",
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

  console.log(c.subHeader('\n  5. Processing Project projects...'))

  // Generate navigation for Project projects
  const sortedProjectProjects = Array.from(projectProjects.entries()).sort(([a], [b]) => a.localeCompare(b))

  for (const [project, categoryMap] of sortedProjectProjects) {
    const projectName = toTitleCase(project)
    console.log(c.warning(`\n   📊 ${project.toUpperCase()}`))

    const projectGroup: any = {
      group: projectName,
      icon: "cube",
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

    projectsGroup.pages.push(projectGroup)
  }

  console.log(c.subHeader('\n  6. Processing Equity projects...'))

  // Generate navigation for Equity projects
  const sortedEquityProjects = Array.from(equityProjects.entries()).sort(([a], [b]) => a.localeCompare(b))

  for (const [project, categoryMap] of sortedEquityProjects) {
    const projectName = toTitleCase(project)
    console.log(c.warning(`\n   📈 ${project.toUpperCase()}`))

    const projectGroup: any = {
      group: projectName,
      icon: "chart-line",
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
    console.log(c.subHeader('\n  7. Updating Assets navigation...'))

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

      // Create the Add-On Information dropdown
      const expandOptionsGroup = {
        group: 'Add-On Information',
        pages: expandOptions.map(option => `api-reference/assets/expand/${option.replace(/\./g, '-')}`)
      }

      // Add the dropdown to the Assets group
      assetsGroup.pages.push(expandOptionsGroup)

      console.log(c.muted(`      ✓ Added Add-On Information dropdown with ${c.number(expandOptions.length)} options`))
    }
  }

  // Write updated docs.json
  await writeFile(docsPath, JSON.stringify(docs, null, 2), 'utf-8')
  console.log('\n  ✅ Updated docs.json navigation structure')
}