export const CHECK_ENDPOINTS = [
  { path: '/assets/ethereum' },
  { path: '/assets/ethereum', query: { expand: 'markets' } },
  { path: '/assets/ethereum', query: { expand: 'ohlcv_last_24_h' } },
  { path: '/assets/ethereum', query: { expand: 'price' } },
  { path: '/assets/ethereum', query: { expand: 'sector' } },
  { path: '/assets/ethereum', query: { expand: 'supply' } },
  { path: '/market-stats', query: { limit: '1' } },
  { path: '/transparency', query: { limit: '2' } },
  { path: '/transparency/10' },
  { path: '/transparency/10', query: { expand: 'asset' } },
]