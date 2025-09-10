import { apiErrors } from '../lib/api-errors'
import { OUTPUT_DIR } from '../lib/constants'
import { Metric, Project } from '../classes'
import { runApiStage } from '../api'
import { runCleanupStage } from '../cleanup'
import { compareMetrics } from '../cleanup/metrics-catalog'
import { runGenerators } from '../generators'
import { populateMetricDataCache } from '../lib/cache'
import { writeTextFile } from '../lib/file-operations'
import { runValidationStage } from '../validation'
import { generateValidationReport } from '../validation/validation-reporter'
import * as text from '../lib/text'

type PipelineConfig = { updateOnlyMode?: boolean }
type PipelineResults = {
  projects: Map<string, Project>
  metrics: Metric[]
  added: string[]
  removed: string[]
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
  const { existingMetrics, projects, shouldContinue } = await runApiStage({ outputDir: OUTPUT_DIR, updateOnlyMode })
  const { filteredProjects, omittedMetrics } = filterProjects(projects)
  const metrics = extractMetrics(filteredProjects)
  
  const validationResult = await runValidationStage(metrics)
  populateMetricDataCache(validationResult.metricDataCache)
  
  const { added, removed } = compareMetrics(existingMetrics, metrics)
  const { removedFiles, removedDirs } = await runCleanupStage(existingMetrics, metrics, OUTPUT_DIR)
  
  if (shouldContinue) {
    await runGenerators({ metrics, projects: filteredProjects })
  }
  
  if (validationResult.issues.length > 0) {
    await saveValidationReport(validationResult)
  }

  return {
    projects: filteredProjects,
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
  
  text.subheader(`+ ${added.length} Metrics Added:`)
  const grouped = groupMetricsByProject(metrics, added)
  displayGroupedMetrics(grouped, text.detail)
}

const displayRemovedMetrics = (removed: string[]) => {
  if (removed.length === 0) return
  
  text.warn(`- ${removed.length} Metrics Removed:`)
  const grouped = groupRemovedMetrics(removed)
  displayGroupedMetrics(grouped, text.warnDetail)
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
  const { metrics, omittedMetrics, added, removed, shouldContinue, removedFiles, removedDirs, validationResult } = results
  
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
  displayOmittedMetrics(results.omittedMetrics)
  displayApiErrors()
  displayValidationIssues(results.validationResult)
  displaySummaryStats(results)
}