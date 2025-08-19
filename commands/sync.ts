#!/usr/bin/env bun

import { mkdir } from 'node:fs/promises'
import {
  apiErrors,
  catalogExistingMetrics,
  cleanupExistingContent,
  compareMetrics,
  fetchAllMetrics,
  generateMetricPage,
  generateMetricsCatalog,
  OUTPUT_DIR,
  updateNavigation,
  updateOpenApiSpec,
  updateAssetExpansionOptions
} from './sync/index'
import chalk from 'chalk'
import { colors as c } from './sync/const'

const green = chalk.greenBright.bold
const darkGreen = chalk.green
const red = chalk.red

/**
 * Main sync function
 */
async function main() {
  try {
    const start = performance.now()

    // Catalog existing metrics before any changes
    console.log(c.header('\n📂 Cataloging existing metrics...'))
    const existingMetrics = await catalogExistingMetrics(OUTPUT_DIR)

    // Fetch all metrics first
    console.log(c.header('\n🔎 Fetching metrics from API...'))
    const allMetrics = await fetchAllMetrics()

    // Filter out metrics with bad descriptions
    const { validMetrics: metrics, omittedMetrics } = filterMetrics(allMetrics)

    // Compare metrics to determine changes
    const { added, removed } = compareMetrics(existingMetrics, metrics)

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
    const expandOptions = await updateAssetExpansionOptions()

    console.log(c.header('\n📋 Updating docs.json navigation...'))
    await updateNavigation(metrics, expandOptions)

    // Display added metrics if any
    if (added.length > 0) {
      console.log(chalk.bold.underline(`\n+ ${added.length} Metrics Added:`))
      added.forEach(metricKey => {
        const metric = metrics.find(m => `${m.project}/${m.identifier}` === metricKey)
        if (metric) {
          console.log(chalk.grey(`   ${metric.project}/${metric.identifier}`))
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

    // Summary table
    console.log(c.header.underline('\n📊 Sync Summary:'))
    console.log(c.header(`\n  📁 Output:`), c.darkGreen(OUTPUT_DIR))
    console.log(c.header(`  📄 Metric Pages:`), c.darkGreen(metrics.length))
    if (omittedMetrics.length > 0) {
      console.log(c.header(`  ⚠️ Omitted Pages:`), c.darkGreen(omittedMetrics.length))
    }
    console.log(c.header(`  📂 Projects:`), c.darkGreen(new Set(metrics.map(m => m.project)).size))
    console.log(c.header(`  🏷️ Categories:`), c.darkGreen(new Set(metrics.map(m => m.category)).size))
    console.log(c.header(`  ✅ Catalog generated`))
    console.log(c.header(`  ✅ Navigation updated`))
    console.log(c.header(`  ✅ OpenAPI spec updated`))
    if (added.length > 0) {
      console.log(c.header(`  ➕ Added Metrics:`), c.darkGreen(added.length))
    }
    if (removed.length > 0) {
      console.log(c.header(`  ➖ Removed Metrics:`), c.darkGreen(removed.length))
    }
    if (apiErrors.length > 0) {
      console.log(red.bold(`  ⚠️ API Errors: ${apiErrors.length}`))
    }

    console.log(`\n✅ Sync complete in`, chalk.hex('#0099FF')(`${((performance.now() - start) / 1000).toFixed(2)}s`))

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