export const generateMiscMetricPage = (metric: {
  endpoint: string
  title: string
  sidebarTitle: string
  description: string
  parameters?: Array<{
    name: string
    required: boolean
    type: string
    description: string
    default?: any
    options?: string[]
  }>
  responseFields?: Array<{
    name: string
    type: string
    description: string
  }>
  exampleResponse?: any
}) => {
  const paramSection = metric.parameters?.length ? `
## Parameters

${metric.parameters.map(p => 
  `- **${p.name}** ${p.required ? '(required)' : '(optional)'}: ${p.description}${p.default ? ` (default: ${p.default})` : ''}${p.options ? ` (options: ${p.options.map(o => `\`${o}\``).join(', ')})` : ''}`
).join('\n')}
` : ''

  const responseFieldsSection = metric.responseFields?.length ? `
## Response Fields

| Field | Type | Description |
|-------|------|-------------|
${metric.responseFields.map(f => 
  `| \`${f.name}\` | ${f.type} | ${f.description} |`
).join('\n')}
` : ''

  return `---
title: "${metric.title}"
sidebarTitle: "${metric.sidebarTitle}"
description: "${metric.description}"
openapi: "GET ${metric.endpoint}"
mode: "wide"
---

## Overview

${metric.description}
${paramSection}
## Example Request

<CodeGroup>

\`\`\`bash cURL
curl -H "x-api-key: YOUR_API_KEY" \\
  "https://api.blockworks.com${metric.endpoint}"
\`\`\`

\`\`\`typescript TypeScript
const res = await fetch(
  'https://api.blockworks.com${metric.endpoint}',
  { headers: { 'x-api-key': 'YOUR_API_KEY' } }
)
const data = await res.json()
\`\`\`

\`\`\`python Python
import requests

r = requests.get(
  'https://api.blockworks.com${metric.endpoint}',
  headers={'x-api-key': 'YOUR_API_KEY'}
)
data = r.json()
\`\`\`

</CodeGroup>

## Example Response

\`\`\`json
${JSON.stringify(metric.exampleResponse || {}, null, 2)}
\`\`\`
${responseFieldsSection}`
}