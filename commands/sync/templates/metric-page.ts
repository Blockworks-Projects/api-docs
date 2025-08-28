export const METRIC_PAGE = `---
title: "{metric_project_title} : {metric_name}"
sidebarTitle: "{metric_name}"
description: "{metric_description}"
openapi: "GET /v1/metrics/{metric_identifier}"
mode: "wide"
---

## Overview

- **Unit:** {metric_unit}
- **Interval:** {metric_interval}
- **Source:** {metric_source}

## Example Request

<CodeGroup>

\`\`\`bash cURL
curl -H "x-api-key: YOUR_API_KEY" \\
  "https://api.blockworks.com/v1/metrics/{metric_identifier}?project={metric_project}"
\`\`\`

\`\`\`typescript TypeScript
const res = await fetch(
  'https://api.blockworks.com/v1/metrics/{metric_identifier}?project={metric_project}',
  { headers: { 'x-api-key': 'YOUR_API_KEY' } }
)
const data = await res.json()
\`\`\`

\`\`\`python Python
import requests

r = requests.get(
  'https://api.blockworks.com/v1/metrics/{metric_identifier}',
  headers={'x-api-key': 'YOUR_API_KEY'},
  params={'project': '{metric_project}'}
)
data = r.json()
\`\`\`

</CodeGroup>

## Example Response

\`\`\`json
{example_response}
\`\`\`

## Notes
- Intervals are {metric_interval} unless otherwise noted.
- Data is updated {metric_interval} and may be revised after late-arriving data.
`