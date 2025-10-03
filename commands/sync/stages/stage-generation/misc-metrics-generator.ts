import { join } from 'node:path'
import { ensureDirectory, readTextFile, writeTextFile } from '../../lib/file-operations'
import * as text from '../../lib/text'
import { fetchTransparencyData } from '../../templates/transparency'
import { fetch } from '../../lib/api-client'

/**
 * Fetch market stats data and generate template
 */
const getMarketStatsWithData = async () => {
  let exampleData = {}
  let response = null

  try {
    response = await fetch('/market-stats', { limit: '1' }) as any

    if (response && response.data && response.data.length > 0) {
      exampleData = {
        page: response.page || 1,
        total: response.total || response.data.length,
        data: response.data
      }
      text.pass('Using real API data for market-stats')
    } else {
      text.fail('API returned empty data, using placeholder')
      exampleData = getMarketStatsPlaceholder()
    }
  } catch (error: any) {
    text.fail('API call failed, using placeholder data:', error.message)
    exampleData = getMarketStatsPlaceholder()
  }

  const content = generateMarketStatsTemplate(exampleData)
  return { content, response }
}

const getMarketStatsPlaceholder = () => ({
  page: 1,
  total: 1,
  data: [
    {
      total_usd_market_cap: 3450000000000.0,
      total_usd_volume_24h: 95000000000.0,
      altcoin_usd_market_cap: 1750000000000.0,
      altcoin_usd_volume_24h: 45000000000.0,
      bitcoin_dominance: 0.493,
      stablecoin_dominance: 0.048,
      defi_usd_market_cap: 85000000000.0,
      l1_usd_market_cap: 2100000000000.0,
      l2_usd_market_cap: 45000000000.0,
      timestamp: "2024-01-15T00:00:00Z"
    }
  ]
})

const generateMarketStatsTemplate = (exampleData: any) => `---
title: "Market Statistics"
sidebarTitle: "Market Stats"
description: "Aggregated market-level statistics including total market cap, volume, and dominance metrics."
openapi: "GET /v1/market-stats"
mode: "wide"
---

## Overview

Market statistics provide high-level aggregated metrics for the entire cryptocurrency market, including:
- Total and altcoin market capitalization
- 24-hour trading volumes
- Bitcoin and stablecoin dominance percentages
- DeFi and L1/L2 metrics

## Example Request

<CodeGroup>

\`\`\`bash cURL
curl -H "x-api-key: YOUR_API_KEY" \\
  "https://api.blockworks.com/v1/market-stats?limit=10"
\`\`\`

\`\`\`typescript TypeScript
const res = await fetch(
  'https://api.blockworks.com/v1/market-stats?limit=10',
  { headers: { 'x-api-key': 'YOUR_API_KEY' } }
)
const data = await res.json()
\`\`\`

\`\`\`python Python
import requests

r = requests.get(
  'https://api.blockworks.com/v1/market-stats',
  headers={'x-api-key': 'YOUR_API_KEY'},
  params={'limit': 10}
)
data = r.json()
\`\`\`

</CodeGroup>

## Example Response

\`\`\`json
${JSON.stringify(exampleData, null, 2)}
\`\`\`

## Supported Options

| Name | Type | Description |
|-------|------|-------------|
| \`page\` | query | Page number for pagination (default: 1) |
| \`limit\` | query | Number of results per page (max: 100, default: 100) |
| \`group_by\` | query | Group results by time period (options: \`day\`) |
| \`query\` | query | JSON filter query |
| \`order_by\` | query | Field to order results by (default: \`id\`) |
| \`order_dir\` | query | Order direction (\`asc\` or \`desc\`, default: \`asc\`) |

## Response Fields

| Field | Type | Description |
|-------|------|-------------|
| \`total_usd_market_cap\` | number | Total cryptocurrency market capitalization in USD |
| \`total_usd_volume_24h\` | number | Total 24-hour trading volume in USD |
| \`altcoin_usd_market_cap\` | number | Market cap of all cryptocurrencies excluding Bitcoin |
| \`altcoin_usd_volume_24h\` | number | 24-hour trading volume of altcoins in USD |
| \`stablecoin_usd_volume_24h\` | number | 24-hour trading volume of stablecoins in USD |
| \`stablecoin_usd_change_24h\` | number | 24-hour percentage change in stablecoin volume |
| \`defi_usd_volume_24h\` | number | 24-hour trading volume of DeFi tokens in USD |
| \`defi_usd_change_24h\` | number | 24-hour percentage change in DeFi volume |
| \`btc_dominance\` | number | Bitcoin's percentage of total market cap |
| \`btc_dominance_change_24h\` | number | 24-hour change in Bitcoin dominance percentage |
| \`eth_dominance\` | number | Ethereum's percentage of total market cap |
| \`eth_dominance_change_24h\` | number | 24-hour change in Ethereum dominance percentage |
| \`updated_at\` | number | Unix timestamp of last update |
| \`day\` | string | Date in YYYY-MM-DD format |

## Use Cases

- **Market Overview Dashboards**: Display high-level market metrics
- **Market Trend Analysis**: Track market growth and sector dominance over time
- **Portfolio Benchmarking**: Compare portfolio performance against market averages
- **Research Reports**: Source authoritative market statistics for analysis`

/**
 * Sync miscellaneous endpoints (not under /metrics)
 */
export const syncMiscMetrics = async () => {
  text.header('🎯 Updating misc endpoints...')

  const miscDir = join('./api-reference', 'misc')

  // Ensure misc directory exists
  await ensureDirectory(miscDir)

  text.header('📈 Generating market-stats page...')

  const responses: Array<{ endpoint: string, params?: Record<string, string>, response: any }> = []

  try {
    // Generate market-stats page and capture response
    const { content: marketStatsContent, response: marketStatsResponse } = await getMarketStatsWithData()
    const marketStatsPath = join(miscDir, 'market-stats.mdx')
    await writeTextFile(marketStatsPath, marketStatsContent)
    text.detail(`Created market-stats.mdx`)

    if (marketStatsResponse) {
      responses.push({
        endpoint: '/market-stats',
        params: { limit: '1' },
        response: marketStatsResponse
      })
    }

    // Update token transparency example payloads
    text.header('🔍 Updating token transparency examples...')

    const transparencyData = await fetchTransparencyData()
    await updateTransparencyExamples(transparencyData)

    // Capture transparency responses
    if (transparencyData.list) {
      responses.push({
        endpoint: '/transparency',
        params: { limit: '2' },
        response: transparencyData.list
      })
    }

    if (transparencyData.single) {
      // Extract ID from single response
      const id = transparencyData.single.id
      responses.push({
        endpoint: `/transparency/${id}`,
        params: { expand: 'asset' },
        response: transparencyData.single
      })
    }

    text.detail('Misc endpoints updated successfully')

    return {
      generated: ['market-stats'],
      updated: ['token-transparency/list', 'token-transparency/get-single'],
      total: 3,
      responses
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