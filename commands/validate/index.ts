#!/usr/bin/env bun
import chalk from 'chalk'
import { runValidationPipeline, displayValidationSummary } from './validation-pipeline'

/**
 * Main validation function - runs validation checks without sync
 */
export async function main(): Promise<void> {
  try {
    const start = performance.now()

    console.log('🔍 Running validation checks...\n')

    // Execute validation pipeline
    const results = await runValidationPipeline()

    // Display validation summary
    displayValidationSummary(results)

    // Completion message
    const duration = ((performance.now() - start) / 1000).toFixed(2)
    console.log(`\n✅ Validation complete in`, chalk.hex('#0099FF')(`${duration}s`))

    // Exit with appropriate code
    if (results.hasIssues) {
      console.log(chalk.yellow('\n⚠️  Validation issues detected (see above)'))
      process.exit(1)
    } else {
      console.log(chalk.green('\n✅ All validation checks passed'))
      process.exit(0)
    }

  } catch (error) {
    console.error('❌ Validation failed:', error)
    process.exit(1)
  }
}

// Run validation if this is the main module
if (import.meta.main) {
  main()
}