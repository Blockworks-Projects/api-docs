#!/usr/bin/env bun
import chalk from 'chalk'
import { runSyncPipeline, displaySummary } from './core/pipeline'

// Core functionality
export { fetchAllMetrics, fetchMetricSampleData } from './api/metrics-api'
export { buildNavigationStructure } from './builders/navigation-builder'
export { categorizeProjects, getCategorySummary } from './categorizers/project-categorizer'
export { cleanupExistingContent, cleanupObsoleteContent } from './cleanup/content-cleaner'
export { catalogExistingMetrics, compareMetrics } from './cleanup/metrics-catalog'
export { runSyncPipeline } from './core/pipeline'
export { generateMetricPage } from './generators/metric-page-generator'
export { updateNavigation } from './generators/navigation-generator'
export {
  API,
  apiErrors,
  ensureDirectory,
  findMetric,
  generateMockMetricData,
  getDateNDaysAgo,
  getUniqueCategories,
  getUniqueProjects,
  groupMetricsByProject,
  groupMetricsByProjectAndCategory,
  readJsonFile,
  sortMetricsAlphabetically,
  writeJsonFile,
  writeTextFile
} from './lib'
export { OUTPUT_DIR, colors } from './lib/constants'

// Validation
export { fetchMetricDataWithTimeout } from './validation/api-fetcher'
export { validateDataPoint } from './validation/data-point-validator'
export { validateDataType } from './validation/data-type-validator'
export { validateMetricData } from './validation/metric-data-validator'
export { generateIssueEntry, generateValidationReport } from './validation/validation-reporter'
export { validateMetrics } from './validation/validator'

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