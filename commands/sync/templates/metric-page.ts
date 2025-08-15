export const METRIC_PAGE = `---
title: "{metric_name}"
description: "{metric_description}"
openapi: 'GET /v1/metrics/{metric_identifier}'
---

## Overview

- **Unit:** {metric_unit}
- **Aggregation:** {metric_aggregation}
- **Source:** {metric_source}

## Example Response

\`\`\`json
{example_response}
\`\`\`

## Notes
- {metric_aggregation} aggregates unless otherwise noted.
- Data is updated {metric_interval} and may be revised after late-arriving data.
`