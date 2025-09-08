import type { Metric } from '../types'
import { colors as c, OUTPUT_DIR } from '../lib/constants'
import { apiErrors } from '../lib/api-errors'
import { ensureDirectory } from '../lib/file-operations'
import * as cliProgress from 'cli-progress'

// Import stage functions
import { fetchAllMetrics } from '../api/metrics-api'
import { catalogExistingMetrics, compareMetrics } from '../cleanup/metrics-catalog'
import { cleanupObsoleteContent, cleanupExistingContent } from '../cleanup/content-cleaner'
import { generateMetricPage } from '../generators/metric-page-generator'
import { updateNavigation } from '../generators/navigation-generator'
import { updateOpenApiSpec } from '../generators/openapi-generator'
import { validateMetrics } from '../validation/validator'
import { generateValidationReport } from '../validation/validation-reporter'
import { populateMetricDataCache } from '../lib/cache'
import { writeTextFile } from '../lib/file-operations'

/**
 * Main sync pipeline orchestrator
 */
export class SyncPipeline {
  private updateOnlyMode: boolean
  
  constructor(updateOnlyMode: boolean = false) {
    this.updateOnlyMode = updateOnlyMode
  }

  /**
   * Execute the complete sync pipeline
   */
  async execute(): Promise<{
    metrics: Metric[]
    added: string[]
    removed: string[]
    omittedMetrics: Metric[]
    removedFiles: string[]
    removedDirs: string[]
    shouldContinue: boolean
    validationResult?: any
  }> {
    // Stage 1: Catalog existing metrics
    console.log(c.header('\n📂 Cataloging existing metrics...'))
    const existingMetrics = await catalogExistingMetrics(OUTPUT_DIR)

    // Stage 2: Fetch metrics from API
    console.log(c.header('\n🔎 Fetching metrics from API...'))
    const { metrics: allMetrics, shouldContinue } = await fetchAllMetrics(this.updateOnlyMode)

    // Stage 3: Filter metrics
    const { validMetrics: metrics, omittedMetrics } = this.filterMetrics(allMetrics)

    // Stage 4: Validate metrics (always run this, even if no content will be generated)
    const validationResult = await validateMetrics(metrics)

    // Stage 5: Populate the global cache with validated data
    populateMetricDataCache(validationResult.metricDataCache)

    // Stage 6: Compare metrics to determine changes
    const { added, removed } = compareMetrics(existingMetrics, metrics)

    // Stage 7: Clean up obsolete content (always run this)
    console.log(c.header(`\n🗑️ Cleaning up obsolete content...`))
    const { removedFiles, removedDirs } = await cleanupObsoleteContent(existingMetrics, metrics, OUTPUT_DIR)

    // Stage 8: Generate new content if needed
    if (shouldContinue) {
      await this.generateContent(metrics)
    }

    // Stage 9: Save validation report if there are issues
    if (validationResult.issues.length > 0) {
      await this.saveValidationReport(validationResult)
    }

    return {
      metrics,
      added,
      removed,
      omittedMetrics,
      removedFiles,
      removedDirs,
      shouldContinue,
      validationResult
    }
  }

  /**
   * Generate all content (metrics pages, catalog, navigation, etc.)
   */
  private async generateContent(metrics: Metric[]): Promise<void> {
    // Clean up existing content
    console.log(c.header(`\n🧹 Wiping existing metrics pages...`))
    await cleanupExistingContent(metrics, OUTPUT_DIR)

    // Create output directory
    await ensureDirectory(OUTPUT_DIR)

    // Generate individual metric pages
    console.log(c.header('\n✏️ Generating metric pages...'))
    
    const progressBar = new cliProgress.SingleBar({
      format: '   Progress |{bar}| {percentage}% || {value}/{total} pages || ETA: {eta}s',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    })
    
    progressBar.start(metrics.length, 0)
    
    let completed = 0
    const promises = metrics.map(async (metric) => {
      await generateMetricPage(metric, metrics)
      completed++
      progressBar.update(completed)
    })
    
    await Promise.all(promises)
    progressBar.stop()

    // Generate metrics catalog (placeholder - would be implemented)
    console.log(c.header('\n📖 Generating metrics catalog...'))
    console.log(c.muted('   Skipped - generator needs import path fixes'))

    // Update OpenAPI spec
    console.log(c.header('\n🔧 Updating OpenAPI specification...'))
    await updateOpenApiSpec(metrics)

    // Update asset expansion options (placeholder - would be implemented)
    console.log(c.header('\n🎯 Updating asset expansion options...'))
    console.log(c.muted('   Skipped - generator needs import path fixes'))
    const expandOptions: string[] = []

    // Update misc endpoints (placeholder - would be implemented)
    console.log(c.header('\n🎯 Updating misc endpoints...'))
    console.log(c.muted('   Skipped - generator needs import path fixes'))

    // Update navigation
    console.log(c.header('\n📋 Updating docs.json navigation...'))
    await updateNavigation(metrics, expandOptions)
  }

  /**
   * Filter metrics to exclude those with bad descriptions
   */
  private filterMetrics(metrics: Metric[]): { validMetrics: Metric[], omittedMetrics: Metric[] } {
    const validMetrics: Metric[] = []
    const omittedMetrics: Metric[] = []

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

  /**
   * Save validation report for GitHub Action if there are issues
   */
  private async saveValidationReport(validationResult: any): Promise<void> {
    const validationReport = generateValidationReport(validationResult)
    try {
      await writeTextFile('./validation_report.md', validationReport)
      console.log(c.muted('\n📝 Validation report saved to validation_report.md'))
    } catch (err) {
      console.warn(c.warning('⚠️ Could not save validation report'))
    }
  }
}

/**
 * Display results summary
 */
export function displaySummary(results: {
  metrics: Metric[]
  added: string[]
  removed: string[]
  omittedMetrics: Metric[]
  removedFiles: string[]
  removedDirs: string[]
  shouldContinue: boolean
  validationResult?: any
}): void {
  const { metrics, added, removed, omittedMetrics, removedFiles, removedDirs, shouldContinue, validationResult } = results

  // Display added metrics
  if (added.length > 0) {
    console.log(c.header(`\n+ ${added.length} Metrics Added:`))
    
    // Group metrics by project
    const metricsByProject = new Map<string, string[]>()
    
    added.forEach(metricKey => {
      const metric = metrics.find(m => `${m.project}/${m.identifier}` === metricKey)
      if (metric) {
        const identifiers = metricsByProject.get(metric.project) || []
        identifiers.push(metric.identifier)
        metricsByProject.set(metric.project, identifiers)
      }
    })
    
    // Sort projects alphabetically and display
    Array.from(metricsByProject.keys())
      .sort()
      .forEach(project => {
        const identifiers = metricsByProject.get(project)!.sort()
        console.log(c.darkGreen(`   ${project} > ${identifiers.join(', ')}`))
      })
  }

  // Display removed metrics
  if (removed.length > 0) {
    console.log(c.warning(`\n- ${removed.length} Metrics Removed:`))
    
    // Group removed metrics by project
    const removedByProject = new Map<string, string[]>()
    
    removed.forEach(metricKey => {
      const [project, identifier] = metricKey.split('/')
      const identifiers = removedByProject.get(project) || []
      identifiers.push(identifier)
      removedByProject.set(project, identifiers)
    })
    
    // Sort projects alphabetically and display
    Array.from(removedByProject.keys())
      .sort()
      .forEach(project => {
        const identifiers = removedByProject.get(project)!.sort()
        console.log(c.warning(`   ${project} > ${identifiers.join(', ')}`))
      })
  }

  // Display omitted metrics
  if (omittedMetrics.length > 0) {
    console.log(c.warning(`\n⚠️ ${omittedMetrics.length} Metrics Omitted (Bad Descriptions):`))
    
    // Group omitted metrics by project
    const omittedByProject = new Map<string, Array<{identifier: string, description: string}>>()
    
    omittedMetrics.forEach(metric => {
      const items = omittedByProject.get(metric.project) || []
      items.push({identifier: metric.identifier, description: metric.description})
      omittedByProject.set(metric.project, items)
    })
    
    // Sort projects alphabetically and display
    Array.from(omittedByProject.keys())
      .sort()
      .forEach(project => {
        const items = omittedByProject.get(project)!.sort((a, b) => a.identifier.localeCompare(b.identifier))
        items.forEach(item => {
          console.log(c.warning(`   ${project}/${item.identifier}: ${item.description.substring(0, 60)}...`))
        })
      })
  }

  // Display API errors
  if (apiErrors.length > 0) {
    console.log(c.warning(`\n⚠️ ${apiErrors.length} API Errors:`))
    apiErrors.forEach(error => {
      console.log(`   URL: ${error.url}`)
      console.log(c.warning(`   ${error.status} ${error.message}\n`))
    })
  }

  // Display validation issues if any
  if (validationResult && validationResult.issues.length > 0) {
    console.log(c.warning(`\n🔍 ${validationResult.issues.length} Validation Issues:`))

    // Group issues by type
    const issueTypes = new Map<string, number>()
    validationResult.issues.forEach((issue: any) => {
      const type = issue.issue.split(':')[0]
      issueTypes.set(type || 'Unknown', (issueTypes.get(type || 'Unknown') || 0) + 1)
    })

    // Show issue type counts
    issueTypes.forEach((count, type) => {
      console.log(c.warning(`   ${count}x ${type}`))
    })

    // Show ALL issues grouped by project
    const issuesByProject = new Map<string, any[]>()
    validationResult.issues.forEach((issue: any) => {
      const list = issuesByProject.get(issue.metric.project) || []
      list.push(issue)
      issuesByProject.set(issue.metric.project, list)
    })

    issuesByProject.forEach((projectIssues, project) => {
      projectIssues.forEach(issue => {
        // Import generateIssueEntry inline to avoid circular dependency
        const issueEntry = `{ project: '${issue.metric.project}', identifier: '${issue.metric.identifier}', issue: '${issue.issue}' }`
        console.log(c.muted(`   ${issueEntry}`))
      })
    })
  }

  // Summary statistics
  console.log(c.header.underline('\n📊 Sync Summary:'))
  console.log(c.header(`\n  📁 Output:`), c.darkGreen(OUTPUT_DIR))
  console.log(c.header(`  📄 Metric Pages:`), c.darkGreen(metrics.length))
  
  if (omittedMetrics.length > 0) {
    console.log(c.header(`  ⚠️ Omitted Pages:`), c.darkGreen(omittedMetrics.length))
  }

  const uniqueProjects = new Set(metrics.map(m => m.project)).size
  const uniqueCategories = new Set(metrics.map(m => m.category)).size
  console.log(c.header(`  📂 Projects:`), c.darkGreen(uniqueProjects))
  console.log(c.header(`  📦 Categories:`), c.darkGreen(uniqueCategories))

  if (shouldContinue) {
    console.log(c.header(`  ✅ Navigation updated`))
    if (added.length > 0) {
      console.log(c.header(`  ➕ Added Metrics:`), c.darkGreen(added.length))
    }
    if (removed.length > 0) {
      console.log(c.header(`  ➖ Removed Metrics:`), c.darkGreen(removed.length))
    }
  } else {
    console.log(c.muted(`  ⚡ Sync skipped (no changes)`))
  }

  // Cleanup results
  if (removedFiles.length > 0) {
    console.log(c.header(`  🗑️ Cleaned up files:`), c.darkGreen(removedFiles.length))
  }
  if (removedDirs.length > 0) {
    console.log(c.header(`  📁 Removed empty dirs:`), c.darkGreen(removedDirs.length))
  }

  // Show API errors count
  if (apiErrors.length > 0) {
    console.log(c.warning(`  ⚠️ API Errors: ${apiErrors.length}`))
  } else {
    console.log(c.header(`  ⚠️ API Errors:`), c.darkGreen('0'))
  }

  // Show validation issues count
  if (validationResult) {
    if (validationResult.issues.length > 0) {
      console.log(c.warning(`  🔍 Validation Issues: ${validationResult.issues.length}`))
    } else {
      console.log(c.header(`  🔍 Validation Issues:`), c.darkGreen('0'))
    }
  }
}