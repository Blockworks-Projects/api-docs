import { readFile } from 'node:fs/promises'
import type { APIError } from '../types'
import { fetchWithoutLogging } from '../lib/api-client'
import { colors as c } from '../lib/constants'
import { generateAssetExpansionOption } from './asset-expansion-generator'
import * as text from '../lib/text'

/**
 * Get valid expand options by calling API with invalid expand value
 */
const getValidExpandOptions = async (): Promise<string[]> => {
  try {
    // This should fail with a 400 error that contains the valid options
    await fetchWithoutLogging(`/assets`, { expand: 'missing' })
    // If it doesn't fail, we can't detect the options this way
    text.warn('API did not return expected error for invalid expand option')
    return []
  } catch (error: any) {
    // Extract the error message from the thrown error
    let errorMessage = ''
    
    if (error.message && error.message.includes('API Error:')) {
      // Our API client wraps the error, so extract the original message
      errorMessage = error.message
    } else if (typeof error === 'string') {
      errorMessage = error
    } else {
      errorMessage = JSON.stringify(error)
    }

    // Try to parse the error response for the valid options
    // Look for patterns like: "each value in 'expand' must be one of the following values: option1, option2"
    const match = errorMessage.match(/must be one of the following values:\s*(.+?)(?:\s*at\s|"|$)/i)
    if (!match) {
      text.warn('Could not parse expand options from error message, using OpenAPI spec')
      return []
    }

    let options = match[1]?.split(',').map(opt => opt.trim().replace(/[^\w_]+$/, '')) || []
    options = options.filter((option: string) => option !== 'market_cap')
    text.detail(text.withCount('Detected {count} valid expand options from API: {options}', options.length, options.join(', ')))
    return options
  }
}

/**
 * Update asset expansion options pages
 */
export const updateAssetExpansionOptions = async (): Promise<string[]> => {
  const openApiPath = './openapi.json'

  text.header('🔧 Creating /assets Add-On (expand) pages...')

  text.detail('Reading OpenAPI specification...')

  // Read existing OpenAPI spec
  const openApiContent = await readFile(openApiPath, 'utf-8')
  const openApiSpec = JSON.parse(openApiContent)

  text.detail('Detecting valid expand options from API...')

  // Try to get valid expand options from API first
  let expandOptions = await getValidExpandOptions()

  // Fall back to OpenAPI spec if API method fails
  if (expandOptions.length === 0) {
    const assetsEndpoint = openApiSpec.paths['/v1/assets/{idOrSlug}']
    const expandParam = assetsEndpoint?.get?.parameters?.find((param: any) => param.name === 'expand')
    const allExpandOptions = expandParam?.schema?.items?.enum || []

    // Use all options from OpenAPI spec as fallback
    expandOptions = allExpandOptions
    console.log(`\n     Found ${c.number(allExpandOptions.length)} expand options from OpenAPI spec: ${expandOptions.join(', ')}`)
  }

  text.subheader(text.withCount('Creating {count} expansion option pages...', expandOptions.length))

  const apiKey = process.env.BWR_API_KEY
  if (!apiKey) {
    text.warn('No BWR_API_KEY found, using placeholder examples')
  }

  // Generate pages in parallel like metrics
  await Promise.all(expandOptions.map(option => generateAssetExpansionOption(option)))

  return expandOptions
}
