#!/usr/bin/env bun

import { mkdir, writeFile } from 'node:fs/promises'
import {
  apiErrors,
  catalogExistingMetrics,
  cleanupExistingContent,
  cleanupObsoleteContent,
  compareMetrics,
  fetchAllMetrics,
  generateMetricPage,
  generateMetricsCatalog,
  OUTPUT_DIR,
  updateNavigation,
  updateOpenApiSpec,
  updateAssetExpansionOptions
} from './sync/index'
import { syncMiscMetrics } from './sync/sync-misc-metrics'
import chalk from 'chalk'
import { colors as c } from './sync/const'
import { validateMetrics, generateValidationReport } from './sync/validate-metrics'
import { populateMetricDataCache } from './sync/metric-data-cache'

const green = chalk.greenBright.bold
const darkGreen = chalk.green
const red = chalk.red

/**
 * Main sync function
 */
async function main() {
  try {
    const start = performance.now()

    // Parse CLI arguments
    const args = process.argv.slice(2)
    const updateOnlyMode = args.includes('--update-only')

    // Catalog existing metrics before any changes
    console.log(c.header('\n📂 Cataloging existing metrics...'))
    const existingMetrics = await catalogExistingMetrics(OUTPUT_DIR)

    // Fetch all metrics first
    console.log(c.header('\n🔎 Fetching metrics from API...'))
    const { metrics: allMetrics, shouldContinue } = await fetchAllMetrics(updateOnlyMode)

    // Filter out metrics with bad descriptions
    const { validMetrics: metrics, omittedMetrics } = filterMetrics(allMetrics)

    // Always run validation, even if no content will be generated
    console.log(c.header('\n🔍 Validating metric data feeds...'))
    const validationResult = await validateMetrics(metrics)

    // Populate the global cache with validated data
    populateMetricDataCache(validationResult.metricDataCache)

    // Compare metrics to determine changes
    const { added, removed } = compareMetrics(existingMetrics, metrics)

    // Clean up obsolete content (always run this, even in update-only mode)
    console.log(c.header(`\n🗑️ Cleaning up obsolete content...`))
    const { removedFiles, removedDirs } = await cleanupObsoleteContent(existingMetrics, metrics, OUTPUT_DIR)

    let expandOptions: string[] = []

    // Only continue with sync process if changes were detected (or not in update-only mode)
    if (shouldContinue) {
      // Clean up existing content for projects found in metrics
      console.log(c.header(`\n🧹 Wiping existing metrics pages...`))
      await cleanupExistingContent(metrics, OUTPUT_DIR)

      // Create output directory
      await mkdir(OUTPUT_DIR, { recursive: true })

      console.log(c.header('\n✏️ Generating metric pages...'))

      // Generate individual metric pages in parallel
      await Promise.all(metrics.map(metric => generateMetricPage(metric, metrics)))

      console.log(c.header('\n📖 Generating metrics catalog...'))
      await generateMetricsCatalog(metrics)

      console.log(c.header('\n🔧 Updating OpenAPI specification...'))
      await updateOpenApiSpec(metrics)

      console.log(c.header('\n🎯 Updating asset expansion options...'))
      expandOptions = await updateAssetExpansionOptions()

      console.log(c.header('\n🎯 Updating misc endpoints...'))
      await syncMiscMetrics()

      console.log(c.header('\n📋 Updating docs.json navigation...'))
      await updateNavigation(metrics, expandOptions)
    }

    // Display added metrics if any
    if (added.length > 0) {
      console.log(chalk.green.bold.underline(`\n+ ${added.length} Metrics Added:`))
      added.forEach(metricKey => {
        const metric = metrics.find(m => `${m.project}/${m.identifier}` === metricKey)
        if (metric) {
          console.log(chalk.green(`   ${metric.project}/${metric.identifier}`))
        }
      })
    }

    // Display removed metrics if any
    if (removed.length > 0) {
      console.log(chalk.hex('#FFA500').bold.underline(`\n- ${removed.length} Metrics Removed:`))
      removed.forEach(metricKey => {
        console.log(chalk.hex('#FFA500')(`   ${metricKey}`))
      })
    }

    // Display omitted metrics if any
    if (omittedMetrics.length > 0) {
      console.log(chalk.yellowBright.bold.underline(`\n⚠️ ${omittedMetrics.length} Metrics Omitted (Bad Descriptions):`))
      omittedMetrics.forEach(metric => {
        console.log(chalk.yellow(`   ${metric.project}/${metric.identifier}: ${metric.description.substring(0, 60)}...`))
      })
    }

    // Display API errors if any
    if (apiErrors.length > 0) {
      console.log(chalk.redBright.bold.underline(`\n⚠️ ${apiErrors.length} API Errors:`))
      apiErrors.forEach(error => {
        console.log(`   URL: ${error.url}`)
        console.log(red(`   ${error.status} ${error.message}\n`))
      })
    }

    // Display validation issues if any
    if (validationResult.issues.length > 0) {
      console.log(chalk.redBright.bold.underline(`\n🔍 ${validationResult.issues.length} Validation Issues:`))

      // Group issues by type
      const issueTypes = new Map<string, number>()
      validationResult.issues.forEach(issue => {
        const type = issue.issue.split(':')[0]
        issueTypes.set(type || 'Unknown', (issueTypes.get(type || 'Unknown') || 0) + 1)
      })

      // Show issue type counts
      issueTypes.forEach((count, type) => {
        console.log(red(`   ${count}x ${type}`))
      })

      // Show ALL issues grouped by project
      const issuesByProject = new Map<string, typeof validationResult.issues>()
      validationResult.issues.forEach(issue => {
        const list = issuesByProject.get(issue.metric.project) || []
        list.push(issue)
        issuesByProject.set(issue.metric.project, list)
      })

      issuesByProject.forEach((projectIssues, project) => {
        console.log(chalk.gray(`\n   ${project}: ${projectIssues.length} issue${projectIssues.length > 1 ? 's' : ''}`))
        projectIssues.forEach(issue => {
          const displayName = `${issue.metric.category} > ${issue.metric.name}`
          console.log(chalk.gray(`     - ${displayName}: ${issue.issue}`))
        })
      })
    }

    // Summary table
    console.log(c.header.underline('\n📊 Sync Summary:'))
    console.log(c.header(`\n  📁 Output:`), c.darkGreen(OUTPUT_DIR))
    console.log(c.header(`  📄 Metric Pages:`), c.darkGreen(metrics.length))
    if (omittedMetrics.length > 0) {
      console.log(c.header(`  ⚠️ Omitted Pages:`), c.darkGreen(omittedMetrics.length))
    }
    console.log(c.header(`  📂 Projects:`), c.darkGreen(new Set(metrics.map(m => m.project)).size))
    console.log(c.header(`  🏷️ Categories:`), c.darkGreen(new Set(metrics.map(m => m.category)).size))

    if (shouldContinue) {
      console.log(c.header(`  ✅ Catalog generated`))
      console.log(c.header(`  ✅ Navigation updated`))
      console.log(c.header(`  ✅ OpenAPI spec updated`))
      if (added.length > 0) {
        console.log(c.header(`  ➕ Added Metrics:`), c.darkGreen(added.length))
      }
      if (removed.length > 0) {
        console.log(c.header(`  ➖ Removed Metrics:`), c.darkGreen(removed.length))
      }
    } else {
      console.log(c.muted(`  ⚡ Sync skipped (no changes)`))
    }

    // Always show cleanup results
    if (removedFiles.length > 0) {
      console.log(c.header(`  🗑️ Cleaned up files:`), c.darkGreen(removedFiles.length))
    }
    if (removedDirs.length > 0) {
      console.log(c.header(`  📁 Removed empty dirs:`), c.darkGreen(removedDirs.length))
    }

    if (apiErrors.length > 0) {
      console.log(red.bold(`  ⚠️ API Errors: ${apiErrors.length}`))
    }

    // Always show validation issues count
    if (validationResult.issues.length > 0) {
      console.log(red.bold(`  🔍 Validation Issues: ${validationResult.issues.length}`))
    } else {
      console.log(c.header(`  🔍 Validation Issues:`), c.darkGreen('0'))
    }

    console.log(`\n✅ Sync complete in`, chalk.hex('#0099FF')(`${((performance.now() - start) / 1000).toFixed(2)}s`))

    // Save validation report for GitHub Action if there are issues
    if (validationResult.issues.length > 0) {
      const validationReport = generateValidationReport(validationResult)
      try {
        await writeFile('./validation_report.md', validationReport, 'utf-8')
        console.log(c.muted('\n📝 Validation report saved to validation_report.md'))
      } catch (err) {
        console.warn(c.warning('⚠️ Could not save validation report'))
      }
    }

    // Exit with appropriate code for CI/CD detection
    if (updateOnlyMode && !shouldContinue) {
      // No changes detected in update-only mode
      process.exit(0)
    } else if (shouldContinue && (added.length > 0 || removed.length > 0)) {
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

/**
 * Filter metrics to exclude those with bad descriptions
 */
function filterMetrics(metrics: any[]) {
  const validMetrics: any[] = []
  const omittedMetrics: any[] = []

  metrics.forEach(metric => {
    // Check if description matches bad patterns:
    // "There is no {identifier} on {project}"
    // "There are no {identifier} in {project}"
    const badDescriptionPattern = new RegExp(`^There (are|is) no .+ (on|in) .+$`, 'i')

    if (badDescriptionPattern.test(metric.description)) {
      omittedMetrics.push(metric)
    } else {
      validMetrics.push(metric)
    }
  })

  return { validMetrics, omittedMetrics }
}

// Run the sync
if (import.meta.main) {
  main()
}