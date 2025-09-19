import { fetcher } from 'itty-fetcher'

const STRAPI_BASE_URL = 'https://cms.blockworksresearch.com/api'
const STRAPI_API_KEY = process.env.STRAPI_API_KEY

if (!STRAPI_API_KEY) {
  console.error('STRAPI_API_KEY must be set in your .env.local file or runtime environment.')
  process.exit(1)
}

export const strapi = fetcher(STRAPI_BASE_URL, {
  headers: {
    'Authorization': `Bearer ${STRAPI_API_KEY}`,
  },
  after: [r => r?.data ?? []],
})

export interface TokenTransparencyAttributes {
  projectName: string
  tokenSymbol: string
  description?: string | null
  projectAndTeamRating: number
  tokenSupplyAndAllocationRating: number
  transactionsAndMarketStructureRating: number
  financialDisclosureRating: number
  filingReportUrl: string
  reportSummary?: string | null
  createdAt: string
  updatedAt: string
  publishedAt: string
  tokenAssetId: number
}

export interface TokenTransparency {
  id: number
  attributes: TokenTransparencyAttributes
}

export const fetchTokenTransparencies = async (): Promise<TokenTransparency[]> => {
  try {
    const response = await strapi.get('/token-transparencies')
    return response as TokenTransparency[]
  } catch (error) {
    console.error('Failed to fetch token transparencies:', error)
    return []
  }
}