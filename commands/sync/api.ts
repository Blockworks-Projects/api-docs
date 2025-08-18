import { fetcher } from 'itty-fetcher'

const API_BASE_URL = 'https://api.blockworks.com/v1'
const API_KEY = process.env.BWR_API_KEY

if (!API_KEY) {
  console.error('BWR_API_KEY must be set in your .env file or runtime environment.')
  process.exit(1)
}

// define API client
export const API = fetcher(API_BASE_URL, {
  array: true,
  headers: { 'x-api-key': API_KEY },
})