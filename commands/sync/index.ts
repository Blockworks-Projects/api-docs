#!/usr/bin/env bun
import chalk from 'chalk'
import { runSyncPipeline, displaySummary } from './core/pipeline'


/**
 * Main sync function - simplified and organized
 */
export async function main(): Promise<void> {
  try {
    const start = performance.now()

    // Parse CLI arguments
    const args = process.argv.slice(2)
    const updateOnlyMode = args.includes('--update-only')

    // Execute pipeline
    const results = await runSyncPipeline({ updateOnlyMode })

    // Display comprehensive summary
    displaySummary(results)

    // Completion message
    const duration = ((performance.now() - start) / 1000).toFixed(2)
    console.log(`\n✅ Sync complete in`, chalk.hex('#0099FF')(`${duration}s`))

    // Exit with appropriate code for CI/CD detection
    if (updateOnlyMode && !results.shouldContinue) {
      // No changes detected in update-only mode
      process.exit(0)
    } else if (results.shouldContinue && (results.added.length > 0 || results.removed.length > 0)) {
      // Changes were detected and processed
      process.exit(2)
    } else {
      // Normal completion
      process.exit(0)
    }

  } catch (error) {
    console.error('❌ Sync failed:', error)
    process.exit(1)
  }
}

// Run the sync if this is the main module
if (import.meta.main) {
  main()
}