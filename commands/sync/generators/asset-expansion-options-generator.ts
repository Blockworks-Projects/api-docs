import { readFile } from 'node:fs/promises'
import type { APIError } from '../types'
import { API } from '../lib/api-client'
import { colors as c } from './const'
import { generateAssetExpansionOption } from './generate-asset-expansion-option'

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
    console.log(c.warning('\n     ⚠️ Could not fetch valid expand options from API, using OpenAPI spec'))
    return []
  }

  // Parse error message: "each value in 'expand' must be one of the following values: markets, market_cap, ohlcv_last_24_h, price, sector, supply"
  const errorMessage = typeof error.message === 'string' ? error.message : JSON.stringify(error.message)
  const match = errorMessage.match(/must be one of the following values:\s*(.+)$/i)
  if (!match) {
    console.log(c.warning('\n     ⚠️ Could not parse expand options from error message, using OpenAPI spec'))
    return []
  }

  let options = match[1]?.split(',').map(opt => opt.trim().replace(/[^\w_]+$/, '')) || []
  options = options.filter((option: string) => option !== 'market_cap')
  console.log(`\n     Detected ${c.number(options.length)} valid expand options from API: ${options.join(', ')}`)
  return options
}

/**
 * Update asset expansion options pages
 */
export const updateAssetExpansionOptions = async (): Promise<string[]> => {
  const openApiPath = './openapi.json'

  console.log(c.subHeader('\n🔧 Updating asset expansion options...'))

  console.log(c.subHeader('\n  1. Reading OpenAPI specification...'))

  // Read existing OpenAPI spec
  const openApiContent = await readFile(openApiPath, 'utf-8')
  const openApiSpec = JSON.parse(openApiContent)

  console.log(c.subHeader('\n  2. Detecting valid expand options from API...'))

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

  console.log(c.subHeader('\n  3. Creating expansion option pages...'))

  const apiKey = process.env.BWR_API_KEY
  if (!apiKey) {
    console.log(c.warning('\n     ⚠️ No BWR_API_KEY found, using placeholder examples'))
  }

  // Generate pages in parallel like metrics
  await Promise.all(expandOptions.map(option => generateAssetExpansionOption(option)))

  console.log(`\n  ✅ Asset expansion options updated:`)
  console.log(c.muted(`     ✓ Created pages: ${c.number(expandOptions.length)}`))
  console.log(c.muted(`     ✓ Options processed: ${c.number(expandOptions.length)}`))

  return expandOptions
}
