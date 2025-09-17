import { Project } from '../../classes'
import { writeTextFile } from '../../lib/file-operations'
import * as text from '../../lib/text'

type ProjectData = {
  name: string
  type: 'Chain' | 'Project' | 'ETF' | 'Treasury'
  metrics: number
  metricsList: { name: string; identifier: string }[]
  categories: string[]
  slug: string
}

const getProjectsPageTemplate = (projects: ProjectData[]) => {
  const stats = {
    chains: projects.filter(p => p.type === 'Chain').length,
    projects: projects.filter(p => p.type === 'Project').length,
    etfs: projects.filter(p => p.type === 'ETF').length,
    treasuries: projects.filter(p => p.type === 'Treasury').length,
    total: projects.length
  }

  const chainProjects = projects.filter(p => p.type === 'Chain')
  const projectProjects = projects.filter(p => p.type === 'Project')
  const etfProjects = projects.filter(p => p.type === 'ETF')
  const treasuryProjects = projects.filter(p => p.type === 'Treasury')

  return `---
title: 'Projects Supported'
description: 'All chains and projects currently supported by the Blockworks Data API'
icon: list
---

# Projects Supported

The Blockworks Data API currently supports **${stats.total} projects** across ${stats.chains} chains, ${stats.projects} projects, ${stats.etfs} ETFs, and ${stats.treasuries} treasuries.

## Overview

<CardGroup cols={4}>
  <Card title="Chains" icon="link">
    **${stats.chains}** blockchain networks
  </Card>
  <Card title="Projects" icon="rocket">
    **${stats.projects}** DeFi protocols
  </Card>
  <Card title="ETFs" icon="chart-line">
    **${stats.etfs}** exchange-traded funds
  </Card>
  <Card title="Treasuries" icon="building">
    **${stats.treasuries}** treasury entities
  </Card>
</CardGroup>

## Chains (${stats.chains})

${chainProjects.map(project => `
### ${project.name}
- **Type**: ${project.type}
- **Metrics Available**: ${project.metrics}
- **Categories**: ${project.categories.join(', ')}

<details>
<summary>View all ${project.metrics} metrics</summary>

${project.metricsList.map(metric => `- **${metric.name}** (\`${metric.identifier}\`)`).join('\n')}

</details>
`).join('\n')}

## Projects (${stats.projects})

${projectProjects.slice(0, 20).map(project => `
### ${project.name}
- **Metrics Available**: ${project.metrics}
- **Categories**: ${project.categories.join(', ')}

<details>
<summary>View all ${project.metrics} metrics</summary>

${project.metricsList.map(metric => `- **${metric.name}** (\`${metric.identifier}\`)`).join('\n')}

</details>
`).join('\n')}

${projectProjects.length > 20 ? `
<details>
<summary>View ${projectProjects.length - 20} more projects...</summary>

${projectProjects.slice(20).map(project => `
### ${project.name}
- **Metrics Available**: ${project.metrics}
- **Categories**: ${project.categories.join(', ')}

<details>
<summary>View all ${project.metrics} metrics</summary>

${project.metricsList.map(metric => `- **${metric.name}** (\`${metric.identifier}\`)`).join('\n')}

</details>
`).join('\n')}

</details>
` : ''}

## ETFs (${stats.etfs})

${etfProjects.map(project => `
### ${project.name}
- **Type**: ${project.type}
- **Metrics Available**: ${project.metrics}
- **Categories**: ${project.categories.join(', ')}

<details>
<summary>View all ${project.metrics} metrics</summary>

${project.metricsList.map(metric => `- **${metric.name}** (\`${metric.identifier}\`)`).join('\n')}

</details>
`).join('\n')}

## Treasuries (${stats.treasuries})

${treasuryProjects.map(project => `
### ${project.name}
- **Type**: ${project.type}
- **Metrics Available**: ${project.metrics}
- **Categories**: ${project.categories.join(', ')}

<details>
<summary>View all ${project.metrics} metrics</summary>

${project.metricsList.map(metric => `- **${metric.name}** (\`${metric.identifier}\`)`).join('\n')}

</details>
`).join('\n')}

## API Usage

To fetch metrics for any of these projects, use the following endpoint pattern:

\`\`\`bash
GET /api/v1/metrics/{project_slug}/{metric_identifier}
\`\`\`

### Example
\`\`\`bash
curl -H "Authorization: Bearer YOUR_API_KEY" \\
  "https://api.blockworksresearch.com/api/v1/metrics/bitcoin/price"
\`\`\`

For more information, see our [API Reference](/api-reference) documentation.`
}

export const generateProjectsPage = async (projects: Project[]) => {
  const projectData = projects
    .map(project => ({
      name: project.name,
      type: project.type.charAt(0).toUpperCase() + project.type.slice(1),
      metrics: project.metrics.length,
      metricsList: project.metrics.map(metric => ({
        name: metric.name,
        identifier: metric.identifier
      })),
      categories: Array.from(project.metricsByCategory.keys()),
      slug: project.slug
    }))
    .sort((a, b) => {
      // Sort by type (Chains first, then Projects, ETFs, Treasuries)
      const typeOrder: Record<string, number> = { 'Chain': 0, 'Project': 1, 'ETF': 2, 'Treasury': 3 }
      if (typeOrder[a.type] !== typeOrder[b.type]) {
        return typeOrder[a.type]! - typeOrder[b.type]!
      }
      // Then alphabetically by name
      return a.name.localeCompare(b.name)
    }) as ProjectData[]

  const content = getProjectsPageTemplate(projectData)
  await writeTextFile('./projects-supported.mdx', content)

  text.detail(`Generated projects page with ${projects.length} projects`)
}