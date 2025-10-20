import { apiErrors } from '../lib/api-errors'
import { OUTPUT_DIR } from '../lib/constants'
import { Metric, Project } from '../classes'
import { runFetchingStage } from '../stages/stage-fetching'
import { runCleanupStage } from '../stages/stage-cleanup'
import { runGenerationStage } from '../stages/stage-generation'
import { populateMetricDataCache } from '../lib/cache'
import { writeTextFile, readJsonFile } from '../lib/file-operations'
import { runValidationStage } from '../stages/stage-validation'
import { generateValidationReport } from '../stages/stage-validation/validation-reporter'
import { compareMetricsDetailed } from '../lib/utils'
import * as text from '../lib/text'

type MetricChange = {
  project: string
  identifier: string
  field: string
  oldValue: any
  newValue: any
}

type PipelineConfig = { updateOnlyMode?: boolean }
type PipelineResults = {
  projects: Map<string, Project>
  metrics: Metric[]
  added: string[]
  removed: string[]
  changed: MetricChange[]
  omittedMetrics: Metric[]
  removedFiles: string[]
  removedDirs: string[]
  shouldContinue: boolean
  validationResult?: any
}

const BAD_DESCRIPTION_PATTERN = /^There (are|is) no .+ (on|in) .+$/i

const hasBadDescription = (metric: Metric) => BAD_DESCRIPTION_PATTERN.test(metric.description)

const filterProjectMetrics = (project: Project) => {
  const filteredProject = new Project({
    name: project.name,
    slug: project.slug,
    metrics: []
  })
  const omittedMetrics: Metric[] = []

  project.metrics.forEach(metric => {
    if (hasBadDescription(metric)) {
      omittedMetrics.push(metric)
    } else {
      metric.parent = filteredProject
      filteredProject.addMetric(metric)
    }
  })

  return { filteredProject, omittedMetrics }
}

const filterProjects = (projects: Map<string, Project>) => {
  const filteredProjects = new Map<string, Project>()
  const allOmittedMetrics: Metric[] = []

  for (const [name, project] of projects) {
    const { filteredProject, omittedMetrics } = filterProjectMetrics(project)

    if (filteredProject.metrics.length > 0) {
      filteredProjects.set(name, filteredProject)
    }

    allOmittedMetrics.push(...omittedMetrics)
  }

  return { filteredProjects, omittedMetrics: allOmittedMetrics }
}

const extractMetrics = (projects: Map<string, Project>) =>
  Array.from(projects.values()).flatMap(project => project.metrics)

const saveValidationReport = async (validationResult: any) => {
  const report = generateValidationReport(validationResult)
  try {
    await writeTextFile('./validation_report.md', report)
    text.pass('Validation report saved to validation_report.md')
  } catch {
    text.warn('Could not save validation report')
  }
}

export const runSyncPipeline = async ({ updateOnlyMode = false }: PipelineConfig = {}): Promise<PipelineResults> => {
  // Load cached metrics from previous run for detailed comparison
  let cachedMetrics: any[] = []
  try {
    cachedMetrics = await readJsonFile<any[]>('./metrics.json')
  } catch {
    // No cache exists (first run)
  }

  const { existingMetrics, projects, shouldContinue } = await runFetchingStage({ outputDir: OUTPUT_DIR, updateOnlyMode })
  const { filteredProjects, omittedMetrics } = filterProjects(projects)
  const metrics = extractMetrics(filteredProjects)

  const validationResult = await runValidationStage(metrics)
  populateMetricDataCache(validationResult.metricDataCache)

  // Perform detailed comparison with cached metrics
  const { added, removed, changed } = compareMetricsDetailed(cachedMetrics, metrics)
  const { removedFiles, removedDirs } = await runCleanupStage(existingMetrics, metrics, OUTPUT_DIR)

  if (shouldContinue) {
    await runGenerationStage({ metrics, projects: filteredProjects })
  }

  if (validationResult.issues.length > 0) {
    await saveValidationReport(validationResult)
  }

  return {
    projects: filteredProjects,
    metrics,
    added,
    removed,
    changed,
    omittedMetrics,
    removedFiles,
    removedDirs,
    shouldContinue,
    validationResult
  }
}


const groupMetricsByProject = (metrics: Metric[], metricKeys: string[]) => {
  const grouped = new Map<string, string[]>()

  metricKeys.forEach(key => {
    const metric = metrics.find(m => `${m.project}/${m.identifier}` === key)
    if (metric) {
      const identifiers = grouped.get(metric.project) || []
      identifiers.push(metric.identifier)
      grouped.set(metric.project, identifiers)
    }
  })

  return grouped
}

const groupRemovedMetrics = (removedKeys: string[]) => {
  const grouped = new Map<string, string[]>()

  removedKeys.forEach(key => {
    const [project, identifier] = key.split('/')
    const identifiers = grouped.get(project!) || []
    identifiers.push(identifier!)
    grouped.set(project!, identifiers)
  })

  return grouped
}

const groupOmittedMetrics = (omitted: Metric[]) => {
  const grouped = new Map<string, Array<{identifier: string, description: string}>>()

  omitted.forEach(metric => {
    const items = grouped.get(metric.project) || []
    items.push({ identifier: metric.identifier, description: metric.description })
    grouped.set(metric.project, items)
  })

  return grouped
}

const displayGroupedMetrics = (grouped: Map<string, string[]>, displayFn: (text: string) => void) => {
  Array.from(grouped.keys())
    .sort()
    .forEach(project => {
      const identifiers = grouped.get(project)!.sort()
      displayFn(`${project} > ${identifiers.join(', ')}`)
    })
}

const displayAddedMetrics = (metrics: Metric[], added: string[]) => {
  if (added.length === 0) return

  text.subheader(`${added.length} Metrics Added:`)
  const grouped = groupMetricsByProject(metrics, added)
  displayGroupedMetrics(grouped, text.added)
}

const displayRemovedMetrics = (removed: string[]) => {
  if (removed.length === 0) return

  text.subheader(`${removed.length} Metrics Removed:`)
  const grouped = groupRemovedMetrics(removed)
  displayGroupedMetrics(grouped, text.removed)
}

const displayChangedMetrics = (changes: MetricChange[]) => {
  if (changes.length === 0) return

  text.subheader(`${changes.length} Field Changes Detected:`)

  // Group changes by metric
  const changesByMetric = new Map<string, MetricChange[]>()

  changes.forEach(change => {
    const key = `${change.project}/${change.identifier}`
    const list = changesByMetric.get(key) || []
    list.push(change)
    changesByMetric.set(key, list)
  })

  // Display grouped by project
  const changesByProject = new Map<string, Map<string, MetricChange[]>>()

  changesByMetric.forEach((metricChanges, key) => {
    const [project, identifier] = key.split('/')
    if (!changesByProject.has(project!)) {
      changesByProject.set(project!, new Map())
    }
    changesByProject.get(project!)!.set(identifier!, metricChanges)
  })

  Array.from(changesByProject.keys())
    .sort()
    .forEach(project => {
      const metrics = changesByProject.get(project)!
      Array.from(metrics.keys())
        .sort()
        .forEach(identifier => {
          const metricChanges = metrics.get(identifier)!
          text.warn(`${project}/${identifier}:`)
          metricChanges.forEach(change => {
            const oldVal = change.oldValue === undefined ? 'undefined' : JSON.stringify(change.oldValue)
            const newVal = change.newValue === undefined ? 'undefined' : JSON.stringify(change.newValue)
            text.warnDetail(`  ${change.field}: ${oldVal} → ${newVal}`)
          })
        })
    })
}

const displayOmittedMetrics = (omitted: Metric[]) => {
  if (omitted.length === 0) return

  text.warn(`${omitted.length} Metrics Omitted (Bad Descriptions):`)
  const grouped = groupOmittedMetrics(omitted)

  Array.from(grouped.keys())
    .sort()
    .forEach(project => {
      const items = grouped.get(project)!.sort((a, b) => a.identifier.localeCompare(b.identifier))
      items.forEach(item => {
        text.warnDetail(`${project}/${item.identifier}: ${item.description.substring(0, 60)}`)
      })
    })
}

const displayApiErrors = () => {
  if (apiErrors.length === 0) return

  text.warn(`${apiErrors.length} API Errors:`)
  apiErrors.forEach(error => {
    text.warnDetail(`URL: ${error.url}`)
    text.warnDetail(`${error.status} ${error.message}`)
  })
}

const displayValidationIssues = (validationResult: any) => {
  if (!validationResult || validationResult.issues.length === 0) return

  text.warnHeader(`${validationResult.issues.length} Validation Issues:`)

  const issueTypes = new Map<string, number>()
  validationResult.issues.forEach((issue: any) => {
    const type = issue.issue.split(':')[0]
    issueTypes.set(type || 'Unknown', (issueTypes.get(type || 'Unknown') || 0) + 1)
  })

  issueTypes.forEach((count, type) => {
    text.warn(`${count}x ${type}`)
  })

  const issuesByProject = new Map<string, any[]>()
  validationResult.issues.forEach((issue: any) => {
    const list = issuesByProject.get(issue.metric.project) || []
    list.push(issue)
    issuesByProject.set(issue.metric.project, list)
  })

  issuesByProject.forEach((projectIssues) => {
    projectIssues.forEach(issue => {
      text.warnDetail(`{ project: ${issue.metric.project}, identifier: ${issue.metric.identifier} }`)
    })
  })
}

const displaySummaryStats = (results: PipelineResults) => {
  const { metrics, omittedMetrics, added, removed, changed, shouldContinue, removedFiles, removedDirs, validationResult } = results

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
    text.summarySuccess('Navigation updated')
    if (added.length > 0) text.summarySuccess(`Added Metrics: {count}`, added.length)
    if (removed.length > 0) text.summarySuccess(`Removed Metrics: {count}`, removed.length)
    if (changed.length > 0) text.summaryWarn(`Changed Fields: {count}`, changed.length)
  } else {
    text.summaryWarn('Sync skipped (no changes)')
  }

  if (removedFiles.length > 0) text.summarySuccess(`Cleaned up files: {count}`, removedFiles.length)
  if (removedDirs.length > 0) text.summarySuccess(`Removed empty dirs: {count}`, removedDirs.length)

  if (apiErrors.length > 0) {
    text.summaryWarn(`API Errors: ${apiErrors.length}`)
  } else {
    text.summarySuccess(`API Errors: {count}`, 0)
  }

  if (validationResult) {
    if (validationResult.issues.length > 0) {
      text.summaryWarn(`Validation Issues: ${validationResult.issues.length}`)
    } else {
      text.summarySuccess(`Validation Issues: {count}`, 0)
    }
  }
}

export const displaySummary = (results: PipelineResults) => {
  displayAddedMetrics(results.metrics, results.added)
  displayRemovedMetrics(results.removed)
  displayChangedMetrics(results.changed)
  displayOmittedMetrics(results.omittedMetrics)
  displayApiErrors()
  displayValidationIssues(results.validationResult)
  displaySummaryStats(results)
}