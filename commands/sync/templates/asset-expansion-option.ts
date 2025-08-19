export const ASSET_EXPANSION_OPTION_PAGE = `---
title: "{expansion_title}"
description: "{expansion_description}"
openapi: 'GET /v1/assets/{idOrSlug}'
---

## Overview

Add the \`?expand={expansion_option}\` flag to your \`/assets\` or \`/assets/{idOrSlug}\` page to include **{expansion_option}** data in the response.

## Example Request

<CodeGroup>

\`\`\`bash cURL
curl -H "x-api-key: YOUR_API_KEY" \\
  "https://api.blockworks.com/v1/assets/ethereum?expand={expansion_option}"
\`\`\`

\`\`\`typescript TypeScript
const res = await fetch(
  'https://api.blockworks.com/v1/assets/ethereum?expand={expansion_option}',
  { headers: { 'x-api-key': 'YOUR_API_KEY' } }
)
const data = await res.json()
console.log(data.{expansion_accessor})
\`\`\`

\`\`\`python Python
import requests

r = requests.get(
  'https://api.blockworks.com/v1/assets/ethereum',
  headers={'x-api-key': 'YOUR_API_KEY'},
  params={'expand': '{expansion_option}'}
)
data = r.json()
print(data.get('{expansion_option}'))
\`\`\`

</CodeGroup>

## Example Response

\`\`\`json
{example_response}
\`\`\`

{field_reference}

## Notes

- Can be used with other expansion options by joining with a comma (e.g. \`?expand=markets,ohlcv_last_24_h\`).
- Can be used on \`/v1/assets/\` or \`/v1/assets/{idOrSlug}\` endpoints.
- \`price\` and \`market_cap\` are included by default in asset results.

## See also

- [Get Single Asset](/api-reference/assets/get-single)
- [All Assets](/api-reference/assets/list)
`

// Field definitions for expansion options
export const FIELD_DEFINITIONS: Record<string, Array<{ field: string; type: string; description: string }>> = {
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
    { field: 'exchange', type: 'string', description: 'Exchange identifier where the asset is traded' },
    { field: 'pair', type: 'string', description: 'Trading pair symbol (e.g., ETH/USDT)' },
    { field: 'volume_24h', type: 'number', description: 'Trading volume in the last 24 hours' }
  ],
  'market_cap': [
    { field: 'usd', type: 'number', description: 'Market capitalization in US dollars' },
    { field: 'updated_at', type: 'number', description: 'Unix timestamp when the market cap was last updated' }
  ],
  'ohlcv_last_24_h': [
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
    { field: 'name', type: 'string', description: 'Sector name (e.g., Smart Contract Platform)' }
  ],
  'supply': [
    { field: 'circulating', type: 'number', description: 'Number of tokens currently in circulation' },
    { field: 'total', type: 'number', description: 'Total token supply including locked tokens' },
    { field: 'updated_at', type: 'number', description: 'Unix timestamp when supply data was last updated' }
  ]
}