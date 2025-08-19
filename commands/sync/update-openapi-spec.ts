import { readFile, writeFile } from 'node:fs/promises'
import type { Metric } from '../sync.types'
import { colors as c } from './const'
import { toTitleCase } from './utils'

/**
 * Update OpenAPI spec with missing metrics and standardized placeholder examples
 */
export const updateOpenApiSpec = async (metrics: Metric[]): Promise<void> => {
  const openApiPath = './openapi.json'

  console.log(c.subHeader('\n  1. Reading OpenAPI specification...'))

  // Read existing OpenAPI spec
  const openApiContent = await readFile(openApiPath, 'utf-8')
  const openApiSpec = JSON.parse(openApiContent)

  // Group metrics by identifier to get all projects for each metric
  const metricGroups = new Map<string, Metric[]>()

  metrics.forEach(metric => {
    if (!metricGroups.has(metric.identifier)) {
      metricGroups.set(metric.identifier, [])
    }
    metricGroups.get(metric.identifier)!.push(metric)
  })

  console.log(`\n     Found ${c.number(metricGroups.size)} unique metrics across ${c.number(metrics.length)} project-metric combinations`)
  console.log(c.subHeader('\n  2. Analyzing existing endpoints...'))

  const existingEndpoints = new Set<string>()
  const endpointsToUpdate = new Set<string>()
  let addedEndpoints = 0
  let updatedExamples = 0

  // Check which endpoints exist
  for (const [identifier] of metricGroups) {
    const endpointPath = `/v1/metrics/${identifier}`
    if (openApiSpec.paths[endpointPath]) {
      existingEndpoints.add(identifier)
      endpointsToUpdate.add(identifier)
      console.log(c.muted(`     ✓ ${identifier} (exists)`))
    } else {
      console.log(c.adding(`     + ${identifier} (adding)`))
    }
  }

  console.log(c.subHeader('\n  3. Adding missing endpoints...'))

  // Add missing endpoints
  for (const [identifier, metricsForIdentifier] of metricGroups) {
    const endpointPath = `/v1/metrics/${identifier}`

    if (!openApiSpec.paths[endpointPath]) {
      addedEndpoints++
      const firstMetric = metricsForIdentifier[0]
      const supportedProjects = [...new Set(metricsForIdentifier.map(m => m.project))].sort()

      console.log(c.green(`    + Adding ${identifier} (${supportedProjects.join(', ')})`))

      // Create endpoint structure
      openApiSpec.paths[endpointPath] = {
        get: {
          operationId: `MetricController_getResults_v1_${identifier.replace(/-/g, '_')}`,
          summary: toTitleCase(identifier),
          description: `Retrieve the '${identifier}' metric for supported projects.`,
          parameters: [
            {
              name: 'project',
              in: 'query',
              required: true,
              description: 'Project slug (comma-separated for multiple).',
              schema: {
                type: 'string',
                enum: supportedProjects,
                example: supportedProjects[0]
              },
              examples: generateProjectExamples(supportedProjects)
            },
            {
              name: 'start_date',
              in: 'query',
              required: false,
              schema: {
                type: 'string',
                format: 'date'
              },
              description: 'Start date (YYYY-MM-DD)'
            },
            {
              name: 'end_date',
              in: 'query',
              required: false,
              schema: {
                type: 'string',
                format: 'date'
              },
              description: 'End date (YYYY-MM-DD)'
            }
          ],
          responses: {
            '200': {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    additionalProperties: {
                      type: 'array',
                      items: {
                        type: 'object',
                        additionalProperties: true
                      }
                    }
                  },
                  example: {
                    // Placeholder - will be updated below
                  }
                }
              }
            },
            '400': {
              description: 'Bad Request'
            },
            '404': {
              description: 'Not Found'
            }
          },
          security: [
            {
              'x-api-key': []
            }
          ]
        }
      }
    }
  }

  console.log(c.subHeader('\n  4. Updating response examples with standardized placeholders...'))

  // Update examples with consistent placeholder data
  for (const [identifier, metricsForIdentifier] of metricGroups) {
    const endpointPath = `/v1/metrics/${identifier}`
    const endpoint = openApiSpec.paths[endpointPath]

    if (endpoint?.get?.responses?.['200']?.content?.['application/json']) {

      // Determine the data type and generate appropriate placeholder
      const firstMetric = metricsForIdentifier[0]
      const dataType = firstMetric?.data_type || ''
      
      let placeholderData
      if (dataType === 'string') {
        // Asset type response for treasury-crypto-asset and similar metrics
        placeholderData = generateAssetTypeExample()
      } else {
        // Regular timeseries data
        const isFloat = dataType.includes('float') || dataType.includes('usd')
        placeholderData = generatePlaceholderExample(isFloat)
      }

      // Update the example with placeholder data
      endpoint.get.responses['200'].content['application/json'].example = placeholderData
      updatedExamples++

      const exampleType = dataType === 'string' 
        ? 'AssetType' 
        : (dataType.includes('float') || dataType.includes('usd') ? 'float' : 'integer')
      
      console.log(c.muted(`     ✓ Updated ${identifier} with ${exampleType} placeholder`))
    }
  }

  console.log(c.subHeader('\n  5. Writing updated OpenAPI specification...'))

  // Write updated OpenAPI spec
  await writeFile(openApiPath, JSON.stringify(openApiSpec, null, 2), 'utf-8')

  console.log(`\n  ✅ OpenAPI spec updated:`)
  console.log(c.muted(`     ✓ Added endpoints: ${c.number(addedEndpoints)}`))
  console.log(c.muted(`     ✓ Updated examples: ${c.number(updatedExamples)}`))
  console.log(c.muted(`     ✓ Total endpoints: ${c.number(Object.keys(openApiSpec.paths).filter(p => p.startsWith('/v1/metrics/')).length)}`))
}

/**
 * Generate standardized placeholder example data
 */
function generatePlaceholderExample(isFloat: boolean): Record<string, any[]> {
  const values = isFloat
    ? [123456.789, 234567.890, 345678.901]
    : [123456, 234567, 345678]

  return {
    "projectName": [
      {
        "date": "2025-08-10",
        "value": values[0]
      },
      {
        "date": "2025-08-11",
        "value": values[1]
      },
      {
        "date": "2025-08-12",
        "value": values[2]
      }
    ]
  }
}

/**
 * Generate AssetType example for string-based metrics
 */
function generateAssetTypeExample(): Record<string, any> {
  return {
    "projectName": {
      "value": "BTC"
    }
  }
}

/**
 * Generate project examples for OpenAPI parameters
 */
function generateProjectExamples(projects: string[]) {
  const examples: Record<string, any> = {}

  // Add individual project examples
  projects.forEach(project => {
    examples[project] = {
      value: project,
      summary: toTitleCase(project)
    }
  })

  // Add multi-project example if more than one project
  if (projects.length > 1) {
    const multiValue = projects.slice(0, 2).join(',')
    const multiSummary = projects.slice(0, 2).map(p => toTitleCase(p)).join(' + ')
    examples.multi = {
      value: multiValue,
      summary: multiSummary
    }
  }

  return examples
}