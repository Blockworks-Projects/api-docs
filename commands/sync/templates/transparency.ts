import * as text from '../lib/text'
import { fetch } from '../lib/api-client'

export const fetchTransparencyData = async () => {
  try {
    const listResponse = await fetch('/transparency', { limit: '2' })

    // Check if we have valid data
    if (listResponse?.data?.[0]?.id && listResponse.data[0].project_team !== undefined) {
      text.pass('Using real API data for transparency')

      // Get single item for single endpoint example
      const firstId = listResponse.data[0].id
      const singleResponse = await fetch(`/transparency/${firstId}`, { expand: 'asset' })

      return {
        list: listResponse,
        single: singleResponse
      }
    }

    text.warn('Using placeholder data for transparency')
    return getPlaceholderData()
  } catch (error) {
    text.warn('Using placeholder data for transparency')
    return getPlaceholderData()
  }
}

function getPlaceholderData() {
  const sampleItem = {
    id: 1,
    asset_id: 345426,
    summary: "",
    created_at: 1755624545,
    updated_at: 1758051174,
    project_team: {
      rating: 10,
      max: 10
    },
    token_allocation: {
      rating: 17,
      max: 18
    },
    market_structure: {
      rating: 7,
      max: 7
    },
    financial_disclosure: {
      rating: 4,
      max: 5
    }
  }

  const sampleWithAsset = {
    ...sampleItem,
    asset: {
      id: 345426,
      code: "AERO",
      title: "Aerodrome Finance",
      slug: "aerodrome-finance",
      tag_line: null,
      description: "",
      image_url: "https://coin-images.coingecko.com/coins/images/31745/large/token.png",
      legacy_sector: null,
      category: null,
      is_supported: false,
      updated_at: 1758637622,
      sector_id: null,
      type: null
    }
  }

  return {
    list: {
      data: [sampleItem],
      total: 27,
      page: 1
    },
    single: sampleWithAsset
  }
}

export const transparencyListTemplate = (data: any) => `---
title: 'List Token Transparency Reports'
description: 'Retrieve a paginated list of token transparency framework scores and ratings'
openapi: 'GET /v1/transparency'
mode: 'wide'
---

## Overview

This endpoint returns a **paginated list of token transparency framework reports** from the Blockworks database.
Each report includes transparency scores across four key categories: Project & Team, Token Allocation, Market Structure, and Financial Disclosure.
Use this endpoint to **discover transparency ratings** for various crypto projects.

## Example Request

<CodeGroup>

\`\`\`bash cURL
curl -H "x-api-key: YOUR_API_KEY" \\
  "https://api.blockworks.com/v1/transparency?limit=20"
\`\`\`

\`\`\`typescript TypeScript
const response = await fetch(
  'https://api.blockworks.com/v1/transparency?limit=20',
  { headers: { 'x-api-key': 'YOUR_API_KEY' } }
)

const data = await response.json()
console.log(data)
\`\`\`

\`\`\`python Python
import requests

response = requests.get(
    'https://api.blockworks.com/v1/transparency',
    headers={'x-api-key': 'YOUR_API_KEY'},
    params={'limit': 20}
)

data = response.json()
print(data)
\`\`\`

</CodeGroup>

### Example Response

A successful response returns a paginated list of transparency reports.

\`\`\`json
${JSON.stringify(data.list, null, 2)}
\`\`\`

## Supported Options

| Name | Type | Details |
| - | - | - |
| \`expand\` | query | Expand related data. Options: \`asset\` |
| \`limit\` | query | The number of reports to return (max: 100, default: 100) |
| \`page\` | query | The page number to return (default: 1) |
| \`query\` | query | JSON filter query |
| \`order_by\` | query | Field to order results by (default: \`id\`) |
| \`order_dir\` | query | Order direction (\`asc\` or \`desc\`, default: \`asc\`) |

## Related Endpoints

- [Get Single Token Transparency](/api-reference/token-transparency/get-single)
- [List Assets](/api-reference/assets/list)
`

export const transparencyGetTemplate = (data: any) => `---
title: 'Get Single Token Transparency'
description: 'Retrieve detailed transparency framework score for one project by ID'
openapi: 'GET /v1/transparency/{id}'
mode: 'wide'
---

## Overview

Fetch a single token transparency report by **ID**. You can optionally expand the asset object to get full asset metadata including project name, symbol, and other details in a single request.

## Example Request

<CodeGroup>

\`\`\`bash cURL
curl -H "x-api-key: YOUR_API_KEY" \\
  "https://api.blockworks.com/v1/transparency/1?expand=asset"
\`\`\`

\`\`\`typescript TypeScript
const res = await fetch(
  'https://api.blockworks.com/v1/transparency/1?expand=asset',
  { headers: { 'x-api-key': 'YOUR_API_KEY' } }
)
const data = await res.json()
\`\`\`

\`\`\`python Python
import requests

r = requests.get(
  'https://api.blockworks.com/v1/transparency/1',
  headers={'x-api-key': 'YOUR_API_KEY'},
  params={'expand': 'asset'}
)
data = r.json()
\`\`\`

</CodeGroup>

## Example Response

\`\`\`json
${JSON.stringify(data.single, null, 2)}
\`\`\`

## Supported Options

| Name | Type | Details |
| - | - | - |
| \`id\` | path | The ID of the transparency report to fetch |
| \`expand\` | query | Expand related data. Options: \`asset\` |

## See also

- [List Token Transparency Reports](/api-reference/token-transparency/list)
- [Get Single Asset](/api-reference/assets/get-single)
`