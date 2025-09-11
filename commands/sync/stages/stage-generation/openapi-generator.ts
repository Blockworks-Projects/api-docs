import { readFile, writeFile } from 'node:fs/promises'
import type { Metric } from '../../classes'
import { toTitleCase } from '../../lib/utils'
import * as text from '../../lib/text'

/**
 * Update OpenAPI spec with missing metrics and standardized placeholder examples
 */
export const updateOpenApiSpec = async (metrics: Metric[]): Promise<void> => {
  text.header('🔧 Updating OpenAPI specification...')

  const openApiPath = './openapi.json'

  text.detail('Reading OpenAPI specification...')

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

  text.detail(text.withCount(`Found {count} unique metrics across {count} project-metric combinations`, metricGroups.size, metrics.length))
  text.detail('Analyzing existing endpoints...')

  const existingEndpoints = new Set<string>()
  const endpointsToUpdate = new Set<string>()
  let addedEndpoints = 0
  let updatedEndpoints = 0
  let updatedExamples = 0
  let existingCount = 0
  let newCount = 0

  // Check which endpoints exist
  for (const [identifier] of metricGroups) {
    const endpointPath = `/v1/metrics/${identifier}`
    if (openApiSpec.paths[endpointPath]) {
      existingEndpoints.add(identifier)
      endpointsToUpdate.add(identifier)
      existingCount++
    } else {
      newCount++
    }
  }

  text.detail(text.withCount('Analyzed {count} existing endpoints', existingCount))
  text.detail('Adding missing endpoints and updating project enums')

  // Add missing endpoints and update existing ones
  for (const [identifier, metricsForIdentifier] of metricGroups) {
    const endpointPath = `/v1/metrics/${identifier}`
    const supportedProjects = [...new Set(metricsForIdentifier.map(m => m.project))].sort()

    if (!openApiSpec.paths[endpointPath]) {
      addedEndpoints++
      const firstMetric = metricsForIdentifier[0]

      text.detail(`+ Adding ${identifier} (${supportedProjects.join(', ')})`)

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
    } else {
      // Update existing endpoint with current project list
      const existingEndpoint = openApiSpec.paths[endpointPath]
      if (existingEndpoint?.get?.parameters) {
        const projectParam = existingEndpoint.get.parameters.find((p: any) => p.name === 'project')
        if (projectParam?.schema) {
          const currentProjects = projectParam.schema.enum || []
          const projectsChanged = JSON.stringify(currentProjects.sort()) !== JSON.stringify(supportedProjects)

          if (projectsChanged) {
            projectParam.schema.enum = supportedProjects
            projectParam.schema.example = supportedProjects[0]
            projectParam.examples = generateProjectExamples(supportedProjects)

            text.detail(`Updated ${identifier} projects: ${supportedProjects.length} projects (was ${currentProjects.length})`)
            updatedEndpoints++
          }
        }
      }
    }
  }

  text.detail('Updating response examples with standardized placeholders...')

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
    }
  }

  text.detail(text.withCount('Updated {count} response examples with standardized placeholders', updatedExamples))
  text.detail('Writing updated OpenAPI specification...')

  // Write updated OpenAPI spec
  await writeFile(openApiPath, JSON.stringify(openApiSpec, null, 2), 'utf-8')

  text.subheader('OpenAPI spec updated:')
  text.pass(text.withCount('Added endpoints: {count}', addedEndpoints))
  text.pass(text.withCount('Updated project enums: {count}', updatedEndpoints))
  text.pass(text.withCount('Updated examples: {count}', updatedExamples))
  text.pass(text.withCount('Total endpoints: {count}', Object.keys(openApiSpec.paths).filter(p => p.startsWith('/v1/metrics/')).length))
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