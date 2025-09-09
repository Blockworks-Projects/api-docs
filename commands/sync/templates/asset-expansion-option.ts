type AssetExpansionConfig = { 
  option: string
  sampleData: any
  title: string
  description: string
  accessor: string
  article: string
  objectType: string
  fieldReference: string
}

export const getAssetExpansionPage = ({ 
  option, 
  sampleData, 
  title, 
  description, 
  accessor, 
  article, 
  objectType, 
  fieldReference 
}: AssetExpansionConfig) => `---
title: "${title}"
description: "${description}"
openapi: 'GET /v1/assets/{idOrSlug}'
mode: "wide"
---

## Overview

Add the \`?expand=${option}\` flag to your \`/assets\` or \`/assets/{idOrSlug}\` page to include **${option}** data in the response.

## Example Request

<CodeGroup>

\`\`\`bash cURL
curl -H "x-api-key: YOUR_API_KEY" \\
  "https://api.blockworks.com/v1/assets/ethereum?expand=${option}"
\`\`\`

\`\`\`typescript TypeScript
const res = await fetch(
  'https://api.blockworks.com/v1/assets/ethereum?expand=${option}',
  { headers: { 'x-api-key': 'YOUR_API_KEY' } }
)
const data = await res.json()
console.log(data.${accessor})
\`\`\`

\`\`\`python Python
import requests

r = requests.get(
  'https://api.blockworks.com/v1/assets/ethereum',
  headers={'x-api-key': 'YOUR_API_KEY'},
  params={'expand': '${option}'}
)
data = r.json()
print(data.get('${option}'))
\`\`\`

</CodeGroup>

## Example Response

\`\`\`json
${JSON.stringify(sampleData, null, 2)}
\`\`\`

${fieldReference}

## Notes

- Can be used with other expansion options by joining with a comma (e.g. \`?expand=markets,ohlcv_last_24_h\`).
- Can be used on \`/v1/assets/\` or \`/v1/assets/{idOrSlug}\` endpoints.
- \`price\` and \`market_cap\` are expanded by default in \`/assets/{idOrSlug}\` results unless an explicit \`?expand=\` flag is provided.

## See also

- [Get Single Asset](/api-reference/assets/get-single)
- [All Assets](/api-reference/assets/list)`

const fieldDefinitions: Record<string, Array<{ field: string; type: string; description: string }>> = {
  'addresses': [
    { field: 'address', type: 'string', description: 'Contract address or native identifier for the asset' },
    { field: 'chain', type: 'object', description: 'Chain information where this address exists' }
  ],
  'chains': [
    { field: 'id', type: 'number', description: 'Unique chain identifier' },
    { field: 'name', type: 'string', description: 'Human-readable chain name' },
    { field: 'slug', type: 'string', description: 'URL-friendly chain identifier' }
  ],
  'addresses.chain': [
    { field: 'address', type: 'string', description: 'Contract address or native identifier for the asset' },
    { field: 'chain.id', type: 'number', description: 'Unique chain identifier' },
    { field: 'chain.name', type: 'string', description: 'Human-readable chain name' },
    { field: 'chain.slug', type: 'string', description: 'URL-friendly chain identifier' }
  ],
  'is_favorite': [
    { field: 'is_favorite', type: 'boolean', description: 'Whether this asset is marked as favorite by the user' }
  ],
  'markets': [
    { field: 'id', type: 'number', description: 'Unique market identifier' },
    { field: 'asset_id', type: 'number', description: 'Unique identifier for the asset' },
    { field: 'volume_24_h', type: 'number', description: 'Trading volume in the last 24 hours' },
    { field: 'ath', type: 'number', description: 'All-time high price' },
    { field: 'ath_change_percentage', type: 'number', description: 'Percentage change from all-time high' },
    { field: 'ath_date', type: 'number', description: 'Unix timestamp when all-time high was reached' },
    { field: 'updated_at', type: 'number', description: 'Unix timestamp when market data was last updated' }
  ],
  'market_cap': [
    { field: 'asset_id', type: 'number', description: 'Unique identifier for the asset' },
    { field: 'rank', type: 'number', description: 'Market capitalization rank' },
    { field: 'usd', type: 'number', description: 'Market capitalization in US dollars' },
    { field: 'dominance', type: 'number', description: 'Market dominance percentage' },
    { field: 'percent_change_btc_1_h', type: 'number', description: '1-hour percentage change vs Bitcoin' },
    { field: 'percent_change_btc_24_h', type: 'number', description: '24-hour percentage change vs Bitcoin' },
    { field: 'percent_change_usd_1_h', type: 'number', description: '1-hour percentage change in USD' },
    { field: 'percent_change_usd_24_h', type: 'number', description: '24-hour percentage change in USD' },
    { field: 'percent_change_eth_1_h', type: 'number', description: '1-hour percentage change vs Ethereum' },
    { field: 'percent_change_eth_24_h', type: 'number', description: '24-hour percentage change vs Ethereum' },
    { field: 'updated_at', type: 'number', description: 'Unix timestamp when the market cap was last updated' }
  ],
  'ohlcv_last_24_h': [
    { field: 'asset_id', type: 'number', description: 'Unique identifier for the asset' },
    { field: 'open', type: 'number', description: 'Price at the start of the trailing 24h window' },
    { field: 'high', type: 'number', description: 'Highest price during the trailing 24h window' },
    { field: 'low', type: 'number', description: 'Lowest price during the trailing 24h window' },
    { field: 'close', type: 'number', description: 'Price at the end of the trailing 24h window' },
    { field: 'volume', type: 'number', description: 'Total traded volume over the trailing 24h window' },
    { field: 'updated_at', type: 'number', description: 'Unix timestamp when values were last refreshed' }
  ],
  'price': [
    { field: 'asset_id', type: 'number', description: 'Unique identifier for the asset' },
    { field: 'usd', type: 'number', description: 'Current price in US dollars' },
    { field: 'btc', type: 'number', description: 'Current price in Bitcoin' },
    { field: 'eth', type: 'number', description: 'Current price in Ethereum' },
    { field: 'sparkline_7d', type: 'string', description: 'JSON array of price points for 7-day sparkline chart' },
    { field: 'updated_at', type: 'number', description: 'Unix timestamp when the price was last updated' }
  ],
  'reference': [
    { field: 'website', type: 'string', description: 'Official website URL' },
    { field: 'whitepaper', type: 'string', description: 'Whitepaper document URL' }
  ],
  'sector': [
    { field: 'id', type: 'number', description: 'Unique sector identifier' },
    { field: 'title', type: 'string', description: 'Sector title (e.g., L1, DeFi)' },
    { field: 'created_at', type: 'number', description: 'Unix timestamp when sector was created' }
  ],
  'supply': [
    { field: 'asset_id', type: 'number', description: 'Unique identifier for the asset' },
    { field: 'circulating', type: 'number', description: 'Number of tokens currently in circulation' },
    { field: 'liquid', type: 'number', description: 'Liquid supply amount' },
    { field: 'total', type: 'number', description: 'Total token supply including locked tokens' }
  ]
}

export const getFieldReference = (option: string): string => {
  const fields = fieldDefinitions[option]
  if (!fields || fields.length === 0) return ''
  
  const tableRows = fields.map(field =>
    `| \`${field.field}\` | ${field.type} | ${field.description} |`
  ).join('\n')

  return `### Field Reference

| Field | Type | Description |
|---|---|---|
${tableRows}`
}