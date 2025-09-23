import { join } from 'node:path'
import { ensureDirectory, readTextFile, writeTextFile } from '../../lib/file-operations'
import * as text from '../../lib/text'
import { marketStatsTemplate } from '../../templates/market-stats'
import { fetchTransparencyData } from '../../templates/transparency'

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

    // Update token transparency example payloads
    text.header('🔍 Updating token transparency examples...')

    const transparencyData = await fetchTransparencyData()
    await updateTransparencyExamples(transparencyData)

    text.detail('Misc endpoints updated successfully')

    return {
      generated: ['market-stats'],
      updated: ['token-transparency/list', 'token-transparency/get-single'],
      total: 3
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

/**
 * Update example payloads in transparency pages without recreating them
 */
const updateTransparencyExamples = async (transparencyData: any) => {
  const transparencyDir = './api-reference/token-transparency'

  // Update list page examples
  const listPath = join(transparencyDir, 'list.mdx')
  try {
    const listContent = await readTextFile(listPath)
    const newListExample = JSON.stringify(transparencyData.list, null, 2)
    const updatedListContent = listContent.replace(
      /```json\n\{[\s\S]*?\}\n```/,
      `\`\`\`json\n${newListExample}\n\`\`\``
    )
    await writeTextFile(listPath, updatedListContent)
    text.detail('Updated token-transparency/list.mdx examples')
  } catch (error) {
    text.warn('Could not update list page examples:', error)
  }

  // Update get-single page examples
  const singlePath = join(transparencyDir, 'get-single.mdx')
  try {
    const singleContent = await readTextFile(singlePath)
    const newSingleExample = JSON.stringify(transparencyData.single, null, 2)
    const updatedSingleContent = singleContent.replace(
      /```json\n\{[\s\S]*?\}\n```/,
      `\`\`\`json\n${newSingleExample}\n\`\`\``
    )
    await writeTextFile(singlePath, updatedSingleContent)
    text.detail('Updated token-transparency/get-single.mdx examples')
  } catch (error) {
    text.warn('Could not update get-single page examples:', error)
  }
}