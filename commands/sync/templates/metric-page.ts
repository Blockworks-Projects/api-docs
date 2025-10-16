import { Metric } from '../classes'
import { escapeYamlString } from '../lib/utils'

type MetricPageConfig = { metric: Metric; sampleData: any; needsUsdTag?: boolean }

export const getMetricPage = ({ metric, sampleData, needsUsdTag = false }: MetricPageConfig) => {
  const title = needsUsdTag ? `${metric.pageTitle} (USD)` : metric.pageTitle
  const sidebarTitle = metric.title // Always unaltered
  const tagLine = needsUsdTag ? `\ntag: "USD"` : ''

  return `---
title: "${escapeYamlString(title)}"
sidebarTitle: "${escapeYamlString(sidebarTitle)}"${tagLine}
description: "${escapeYamlString(metric.description)}"
openapi: "GET /v1/metrics/${metric.identifier}"
mode: "wide"
---

## Overview

- **Denomination:** ${metric.denomination || 'N/A'}
- **Type:** ${metric.type}
- **Interval:** ${metric.unit === 'string' ? 'N/A' : metric.titleCasedInterval}
- **Source:** ${metric.titleCasedSource}

## Example Request

<CodeGroup>

\`\`\`bash cURL
curl -H "x-api-key: YOUR_API_KEY" \\
  "https://api.blockworks.com/v1/metrics/${metric.identifier}?project=${metric.project}"
\`\`\`

\`\`\`typescript TypeScript
const res = await fetch(
  'https://api.blockworks.com/v1/metrics/${metric.identifier}?project=${metric.project}',
  { headers: { 'x-api-key': 'YOUR_API_KEY' } }
)

const data = await res.json()
\`\`\`

\`\`\`python Python
import requests

r = requests.get(
  'https://api.blockworks.com/v1/metrics/${metric.identifier}',
  headers={'x-api-key': 'YOUR_API_KEY'},
  params={'project': '${metric.project}'}
)

data = r.json()
\`\`\`

</CodeGroup>

## Example Response

\`\`\`json
${JSON.stringify(sampleData, null, 2)}
\`\`\`

## Notes
- Intervals are ${metric.interval} unless otherwise noted.
- Data is updated ${metric.interval} and may be revised after late-arriving data.`
}