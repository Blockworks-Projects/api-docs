import { readFile } from 'node:fs/promises'
import type { APIError } from '../types'
import { API } from '../lib/api-client'
import { colors as c } from '../lib/constants'
import { generateAssetExpansionOption } from './asset-expansion-generator'
import * as text from '../lib/text'

/**
 * Get valid expand options by calling API with invalid expand value
 */
const getValidExpandOptions = async (): Promise<string[]> => {
  const [error] = await API.get<[APIError, any]>(`/assets`, {
    query: {
      expand: 'missing',
    },
  })

  if (!error?.message) {
    text.warn('Could not fetch valid expand options from API, using OpenAPI spec')
    return []
  }

  // Parse error message: "each value in 'expand' must be one of the following values: markets, market_cap, ohlcv_last_24_h, price, sector, supply"
  const errorMessage = typeof error.message === 'string' ? error.message : JSON.stringify(error.message)
  const match = errorMessage.match(/must be one of the following values:\s*(.+)$/i)
  if (!match) {
    text.warn('Could not parse expand options from error message, using OpenAPI spec')
    return []
  }

  let options = match[1]?.split(',').map(opt => opt.trim().replace(/[^\w_]+$/, '')) || []
  options = options.filter((option: string) => option !== 'market_cap')
  text.detail(text.withCount('Detected {count} valid expand options from API: {options}', options.length, options.join(', ')))
  return options
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
