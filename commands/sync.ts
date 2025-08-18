#!/usr/bin/env bun

import { mkdir } from 'node:fs/promises'
import {
  apiErrors,
  cleanupExistingContent,
  fetchAllMetrics,
  generateMetricPage,
  generateMetricsCatalog,
  OUTPUT_DIR,
  updateNavigation,
  updateOpenApiSpec
} from './sync/index'
import chalk from 'chalk'

const green = chalk.greenBright.bold
const darkGreen = chalk.green
const red = chalk.red

/**
 * Main sync function
 */
async function main() {
  try {
    // Fetch all metrics first
    console.log(green('\n🔎 Fetching metrics from API...'))
    const allMetrics = await fetchAllMetrics()
    
    // Filter out metrics with bad descriptions
    const { validMetrics: metrics, omittedMetrics } = filterMetrics(allMetrics)

    // Clean up existing content for projects found in metrics
    console.log(green(`\n🧹 Wiping existing metrics pages...`))
    await cleanupExistingContent(metrics, OUTPUT_DIR)

    // Create output directory
    await mkdir(OUTPUT_DIR, { recursive: true })

    console.log(green('\n✏️ Generating metric pages...'))

    // Generate individual metric pages
    for (const metric of metrics) {
      await generateMetricPage(metric, metrics)
    }

    console.log(green('\n📖 Generating metrics catalog...'))
    await generateMetricsCatalog(metrics)

    console.log('\n📋 Updating docs.json navigation...')
    await updateNavigation(metrics)

    console.log('\n🔧 Updating OpenAPI specification...')
    await updateOpenApiSpec(metrics)
    
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
    console.log(green.underline('\n📊 Sync Summary:'))
    console.log(green(`\n  📁 Output:`), darkGreen(OUTPUT_DIR))
    console.log(green(`  📄 Metric Pages:`), darkGreen(metrics.length))
    if (omittedMetrics.length > 0) {
      console.log(green(`  ⚠️ Omitted Pages:`), darkGreen(omittedMetrics.length))
    }
    console.log(green(`  📂 Projects:`), darkGreen(new Set(metrics.map(m => m.project)).size))
    console.log(green(`  🏷️ Categories:`), darkGreen(new Set(metrics.map(m => m.category)).size))
    console.log(green(`  ✅ Catalog generated`))
    console.log(green(`  ✅ Navigation updated`))
    console.log(green(`  ✅ OpenAPI spec updated`))
    if (apiErrors.length > 0) {
      console.log(red.bold(`  ⚠️ API Errors: ${apiErrors.length}`))
    }

    console.log(`\n✅ Sync complete!`)

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