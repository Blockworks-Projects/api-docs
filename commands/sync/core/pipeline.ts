import { apiErrors } from '../lib/api-errors'
import { OUTPUT_DIR } from '../lib/constants'
import type { Metric } from '../types'

// Import stage orchestrators
import { runApiStage } from '../api'
import { runCleanupStage } from '../cleanup'
import { compareMetrics } from '../cleanup/metrics-catalog'
import { runGeneratorsStage } from '../generators'
import { populateMetricDataCache } from '../lib/cache'
import { writeTextFile } from '../lib/file-operations'
import { runValidationStage } from '../validation'
import { generateValidationReport } from '../validation/validation-reporter'
import * as text from '../lib/text'
import { colors as c } from '../lib/constants'

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
    // Stage 1: API operations (catalog + fetch)
    const { existingMetrics, metrics: allMetrics, shouldContinue } = await runApiStage(OUTPUT_DIR, this.updateOnlyMode)

    // Stage 2: Filter metrics
    const { validMetrics: metrics, omittedMetrics } = this.filterMetrics(allMetrics)

    // Stage 3: Validation
    const validationResult = await runValidationStage(metrics)

    // Stage 4: Populate global cache with validated data
    populateMetricDataCache(validationResult.metricDataCache)

    // Stage 5: Compare metrics to determine changes
    const { added, removed } = compareMetrics(existingMetrics, metrics)

    // Stage 6: Cleanup operations
    const { removedFiles, removedDirs } = await runCleanupStage(existingMetrics, metrics, OUTPUT_DIR)

    // Stage 7: Generate content if needed
    if (shouldContinue) {
      await runGeneratorsStage(metrics)
    }

    // Stage 8: Save validation report if there are issues
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
      text.pass('Validation report saved to validation_report.md')
    } catch (err) {
      text.warn('Could not save validation report')
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
    text.subheader(`+ ${added.length} Metrics Added:`)

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
        text.detail(`${project} > ${identifiers.join(', ')}`)
      })
  }

  // Display removed metrics
  if (removed.length > 0) {
    text.warn(`- ${removed.length} Metrics Removed:`)

    // Group removed metrics by project
    const removedByProject = new Map<string, string[]>()

    removed.forEach(metricKey => {
      const [project, identifier] = metricKey.split('/')
      const identifiers = removedByProject.get(project!) || []
      identifiers.push(identifier!)
      removedByProject.set(project!, identifiers)
    })

    // Sort projects alphabetically and display
    Array.from(removedByProject.keys())
      .sort()
      .forEach(project => {
        const identifiers = removedByProject.get(project)!.sort()
        text.warnDetail(`${project} > ${identifiers.join(', ')}`)
      })
  }

  // Display omitted metrics
  if (omittedMetrics.length > 0) {
    text.warn(`${omittedMetrics.length} Metrics Omitted (Bad Descriptions):`)

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
          text.warnDetail(`${project}/${item.identifier}: ${item.description.substring(0, 60)}`)
        })
      })
  }

  // Display API errors
  if (apiErrors.length > 0) {
    text.warn(`${apiErrors.length} API Errors:`)
    apiErrors.forEach(error => {
      text.warnDetail(`URL: ${error.url}`)
      text.warnDetail(`${error.status} ${error.message}`)
    })
  }

  // Display validation issues if any
  if (validationResult && validationResult.issues.length > 0) {
    text.warn(`${validationResult.issues.length} Validation Issues:`)

    // Group issues by type
    const issueTypes = new Map<string, number>()
    validationResult.issues.forEach((issue: any) => {
      const type = issue.issue.split(':')[0]
      issueTypes.set(type || 'Unknown', (issueTypes.get(type || 'Unknown') || 0) + 1)
    })

    // Show issue type counts
    issueTypes.forEach((count, type) => {
      text.warnDetail(`${count}x ${type}`)
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
        text.detail(`${issueEntry}`)
      })
    })
  }

  // Summary statistics
  text.summaryHeader('Sync Summary:')
  text.summarySuccess(`Output Folder: {dir}`, OUTPUT_DIR)
  text.summarySuccess(`Metric Pages: {count}`, metrics.length)

  if (omittedMetrics.length > 0) {
    text.summaryWarn(`Omitted Pages: {count}`, omittedMetrics.length)
  }

  const uniqueProjects = new Set(metrics.map(m => m.project)).size
  const uniqueCategories = new Set(metrics.map(m => m.category)).size
  text.summarySuccess(`Projects: {count}`, uniqueProjects)
  text.summarySuccess(`Categories: {count}`, uniqueCategories)

  if (shouldContinue) {
    text.summarySuccess(`Navigation updated`)
    if (added.length > 0) {
      text.summarySuccess(`Added Metrics: {count}`, added.length)
    }
    if (removed.length > 0) {
      text.summarySuccess(`Removed Metrics: {count}`, removed.length)
    }
  } else {
    text.summaryWarn(`Sync skipped (no changes)`)
  }

  // Cleanup results
  if (removedFiles.length > 0) {
    text.summarySuccess(`Cleaned up files: {count}`, removedFiles.length)
  }
  if (removedDirs.length > 0) {
    text.summarySuccess(`Removed empty dirs: {count}`, removedDirs.length)
  }

  // Show API errors count
  if (apiErrors.length > 0) {
    text.summaryWarn(`API Errors: ${apiErrors.length}`)
  } else {
    text.summarySuccess(`API Errors: {count}`, 0)
  }

  // Show validation issues count
  if (validationResult) {
    if (validationResult.issues.length > 0) {
      text.summaryWarn(`Validation Issues: ${validationResult.issues.length}`)
    } else {
      text.summarySuccess(`Validation Issues: {count}`, 0)
    }
  }
}