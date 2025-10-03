# API Shape Snapshots

This directory contains snapshots of API endpoint response shapes for tracking field-level changes over time.

## Purpose

The shape checking system detects when API endpoints return different field structures than expected, helping identify:
- New fields added to responses
- Removed fields from responses
- Type changes for existing fields
- Structural changes in nested objects/arrays

## How It Works

1. **Shape Extraction**: When endpoints are fetched (e.g., `/assets?expand=price`), the response structure is extracted into a lean schema
2. **Comparison**: The new shape is compared against the last known snapshot
3. **Detection**: Any differences are flagged as shape changes
4. **Storage**: Updated snapshots are saved for future comparisons

## Snapshot Format

Each snapshot is a JSON file containing:
- `endpoint`: The API endpoint path
- `params`: Query parameters (if any)
- `shape`: The extracted field structure
- `timestamp`: When the snapshot was created

Example filename: `assets_ethereum__expand-price.json`

## Tracked Endpoints

Currently tracking:
- `/assets/ethereum` with all `expand` options (price, market_cap, ohlcv_last_24_h, markets, sector, supply)
- `/market-stats` (with limit=1)
- `/transparency` (list endpoint with limit=2)
- `/transparency/{id}` (single endpoint with expand=asset)

## Excluding Metrics

Individual `/metrics/{identifier}` endpoints use existing validation checks and do NOT create separate snapshot files to avoid creating hundreds of individual snapshots. The existing validation handles metrics structure checking.

## Snapshot Files

Example snapshot files:
- `assets_ethereum__expand-price.json` - Asset endpoint with price expansion
- `market-stats__limit-1.json` - Market statistics endpoint
- `transparency__limit-2.json` - Transparency list endpoint
- `transparency_1__expand-asset.json` - Single transparency report with asset expansion
