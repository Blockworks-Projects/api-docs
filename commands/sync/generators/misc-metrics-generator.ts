import { ensureDirectory, writeTextFile, readTextFile } from '../lib/file-operations'
import { join } from 'node:path'
import { marketStatsTemplate } from '../templates/misc/market-stats'
import * as text from '../lib/text'

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

