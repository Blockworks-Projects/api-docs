import type { APIError } from '../../types'
import { fetch } from '../../lib/api-client'
import { apiErrors } from '../../lib/api-errors'

/**
 * Fetch sample data for an asset expansion option
 */
export const fetchAssetSampleData = async (expandOption: string): Promise<any> => {
  try {
    return await fetch(`/assets/ethereum`, { expand: expandOption })
  } catch (error: any) {
    // Track API errors with full URL details
    const url = `/assets/ethereum?expand=${expandOption}`
    
    apiErrors.push({
      status: error.status || 500,
      error: error.name || 'Unknown Error',
      message: [error.message || 'Unknown error'],
      url,
    })

    // Return mock data if API call fails
    return getMockAssetData(expandOption)
  }
}

/**
 * Generate mock asset data for failed API calls
 */
function getMockAssetData(expandOption: string): any {
  const baseResponse = {
    id: 1027,
    slug: "ethereum", 
    title: "Ethereum"
  }

  const mockData: Record<string, any> = {
    'addresses': {
      addresses: [
        {
          address: "0x...",
          chain: { id: 1, name: "Ethereum" }
        }
      ]
    },
    'chains': {
      chains: [
        { id: 1, name: "Ethereum", slug: "ethereum" }
      ]
    },
    'addresses.chain': {
      addresses: [
        {
          address: "0x...",
          chain: { id: 1, name: "Ethereum", slug: "ethereum" }
        }
      ]
    },
    'is_favorite': {
      is_favorite: false
    },
    'markets': {
      markets: [
        {
          exchange: "binance",
          pair: "ETH/USDT",
          volume_24h: 123456789
        }
      ]
    },
    'market_cap': {
      market_cap: { usd: 415000000000, updated_at: 1723180800 }
    },
    'ohlcv_last_24_h': {
      ohlcv_last_24_h: {
        open: 3412.21,
        high: 3490.55,
        low: 3398.33,
        close: 3450.12,
        volume: 189234567.89,
        updated_at: 1723180800
      }
    },
    'price': {
      price: { usd: 3450.12, updated_at: 1723180800 }
    },
    'reference': {
      reference: {
        website: "https://ethereum.org",
        whitepaper: "https://ethereum.org/whitepaper/"
      }
    },
    'sector': {
      sector: { id: 1, name: "Smart Contract Platform" }
    },
    'supply': {
      supply: {
        circulating: 120280000,
        total: 120280000,
        updated_at: 1723180800
      }
    }
  }

  const expandData = mockData[expandOption] || { [expandOption]: "placeholder_data" }
  
  return {
    ...baseResponse,
    ...expandData
  }
}