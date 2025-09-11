import { join } from 'node:path'
import { ensureDirectory, readTextFile, writeTextFile } from '../../lib/file-operations'
import * as text from '../../lib/text'
import { marketStatsTemplate } from '../../templates/market-stats'

/**
 * Sync miscellaneous endpoints (not under /metrics)
 */
export const syncMiscMetrics = async () => {
  text.header('🎯 Updating misc endpoints...')

  const miscDir = join('./api-reference', 'misc')

  // Ensure misc directory exists
  await ensureDirectory(miscDir)

  text.header('📈 Generating market-stats page...')

  try {
    // Generate market-stats page
    const marketStatsContent = await marketStatsTemplate()
    const marketStatsPath = join(miscDir, 'market-stats.mdx')
    await writeTextFile(marketStatsPath, marketStatsContent)
    text.detail(`Created market-stats.mdx`)

    // Add more misc endpoints here as needed
    // Example:
    // const anotherEndpointContent = await anotherEndpointTemplate()
    // await writeTextFile(join(miscDir, 'another-endpoint.mdx'), anotherEndpointContent)

    text.detail('Misc endpoints updated successfully')

    return {
      generated: ['market-stats'],
      total: 1
    }
  } catch (error) {
    text.fail('Error generating misc metrics:', error)
    throw error
  }
}

/**
 * Update navigation for misc metrics
 */
export const updateMiscNavigation = async (docsPath: string = './docs.json') => {
  // File operations already imported at top

  // Read existing docs.json
  const docsContent = await readTextFile(docsPath)
  const docs = JSON.parse(docsContent)

  // Find the navigation tab
  const apiTab = docs.navigation.tabs.find((tab: any) => tab.name === 'API Documentation')
  if (!apiTab) {
    text.fail('API Documentation tab not found in docs.json')
    return
  }

  // Find or create Misc group
  let miscGroup = apiTab.groups.find((g: any) => g.group === 'Misc')

  if (!miscGroup) {
    // Find position to insert (after main Metrics group, before Metrics : Chains)
    const metricsIndex = apiTab.groups.findIndex((g: any) => g.group === 'Metrics')
    const chainsIndex = apiTab.groups.findIndex((g: any) => g.group === 'Metrics : Chains')

    const insertIndex = chainsIndex !== -1 ? chainsIndex : metricsIndex + 1

    miscGroup = {
      group: 'Misc',
      pages: []
    }

    apiTab.groups.splice(insertIndex, 0, miscGroup)
  }

  // Update pages for misc group
  miscGroup.pages = [
    'api-reference/misc/market-stats'
    // Add more misc pages here as they're created
  ]

  // Write back to docs.json
  await writeTextFile(docsPath, JSON.stringify(docs, null, 2))
  text.pass('Updated docs.json navigation for misc metrics')
}