import { fetch } from '../../lib/api-client'
import * as text from '../../lib/text'

export const marketStatsTemplate = async () => {
  // Fetch real data for the response
  let exampleData = {}
  try {
    const response = await fetch('/market-stats', { limit: '1' })
    const actualResponse = response

    if (actualResponse && actualResponse.data && actualResponse.data.length > 0) {
      // Use actual API response structure with real data
      exampleData = {
        page: actualResponse.page || 1,
        total: actualResponse.total || actualResponse.data.length,
        data: actualResponse.data
      }
      text.pass('Using real API data for market-stats')
    } else {
      text.fail('API returned empty data, using placeholder')
      // Use realistic placeholder data when API returns empty
      exampleData = {
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
      }
    }
  } catch (error: any) {
    text.fail('API call failed, using placeholder data:', error.message)
    // Use placeholder data if API call fails
    exampleData = {
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
    }
  }

  return `---
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
}