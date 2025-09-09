## Summary

This PR updates the metrics documentation with the latest changes from the Blockworks API.

### ➕ Metrics Added
```
+ 13 Metrics Added:
   raydium/launchpad-tokens-graduated
   raydium/volume-usd
   solfi/volume-usd
   humidifi/volume-usd
   lifinity/revenue
   orca/revenue
   raydium/revenue
   raydium/launchpad-bonding-volume
   orca/volume-usd
   lifinity/volume-usd
   goonfi/volume-usd
   tessera/volume-usd
   byreal/volume-usd
```

### ➖ Metrics Removed
```
- 13 Metrics Removed:
   HumidiFi/volume-usd
   Lifinity/volume-usd
   Lifinity/revenue
   Byreal/volume-usd
   Tessera/volume-usd
   GoonFi/volume-usd
   Orca/volume-usd
   Orca/revenue
   Raydium/volume-usd
   Raydium/revenue
   Raydium/launchpad-bonding-volume
   Raydium/launchpad-tokens-graduated
   SolFi/volume-usd
```

### 📊 Sync Summary
```
📊 Sync Summary:

  📁 Output: ./api-reference/metrics
  📄 Metric Pages: 365
  📂 Projects: 137
  📦 Categories: 6
  ✅ Catalog generated
  ✅ Navigation updated
  ✅ OpenAPI spec updated
  ➕ Added Metrics: 13
  ➖ Removed Metrics: 13
  🗑️ Cleaned up files: 13
  📁 Removed empty dirs: 20
  🔍 Validation Issues: 6

✅ Sync complete in 8.90s
```

### 🔍 Validation Issues

Found 6 validation issues across 365 metrics.

<details>
<summary>Click to expand validation issues</summary>

```

solana: 2 issues
  - { project: 'solana', identifier: 'native-token-fdv', issue: 'Failed to fetch: Request timeout' }
  - { project: 'solana', identifier: 'native-token-supply', issue: 'Failed to fetch: Request timeout' }

nova: 1 issue
  - { project: 'nova', identifier: 'revenue', issue: 'No data returned (empty array)' }

scallop: 1 issue
  - { project: 'scallop', identifier: 'revenue', issue: 'No data returned (empty array)' }

coinbase-wallet: 1 issue
  - { project: 'coinbase-wallet', identifier: 'revenue', issue: 'No data returned (empty array)' }

metaplex: 1 issue
  - { project: 'metaplex', identifier: 'revenue', issue: 'No data returned (empty array)' }
```

</details>


