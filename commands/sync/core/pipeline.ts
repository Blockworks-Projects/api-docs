import { apiErrors, OUTPUT_DIR } from '../lib/utils'
import { Metric, Project } from '../classes'
import { runFetchingStage } from '../stages/stage-fetching'
import { runCleanupStage } from '../stages/stage-cleanup'
import { compareMetrics } from '../stages/stage-scanning/metrics-catalog'
import { runGenerationStage } from '../stages/stage-generation'
import { populateMetricDataCache } from '../lib/cache'
import { writeTextFile } from '../lib/file-operations'
import { runValidationStage } from '../stages/stage-validation'
import { generateValidationReport } from '../stages/stage-validation/validation-reporter'
import * as text from '../lib/text'

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

const filterProjects = (projects: Map<string, Project>) => {
  const filteredProjects = new Map<string, Project>()
  const omittedMetrics: Metric[] = []

  for (const [name, project] of projects) {
    const filteredProject = new Project({ name: project.name, slug: project.slug, metrics: [] })
    
    project.metrics.forEach(metric => {
      if (BAD_DESCRIPTION_PATTERN.test(metric.description)) {
        omittedMetrics.push(metric)
      } else {
        metric.parent = filteredProject
        filteredProject.addMetric(metric)
      }
    })
    
    if (filteredProject.metrics.length > 0) {
      filteredProjects.set(name, filteredProject)
    }
  }

  return { filteredProjects, omittedMetrics }
}

const saveValidationReport = async (validationResult: any) => {
  try {
    await writeTextFile('./validation_report.md', generateValidationReport(validationResult))
    text.pass('Validation report saved to validation_report.md')
  } catch {
    text.warn('Could not save validation report')
  }
}

export const runSyncPipeline = async ({ updateOnlyMode = false } = {}): Promise<PipelineResults> => {
  const { existingMetrics, projects, shouldContinue } = await runFetchingStage({ outputDir: OUTPUT_DIR, updateOnlyMode })
  const { filteredProjects, omittedMetrics } = filterProjects(projects)
  const metrics = Array.from(filteredProjects.values()).flatMap(p => p.metrics)
  
  const validationResult = await runValidationStage(metrics)
  populateMetricDataCache(validationResult.metricDataCache)
  
  const { added, removed } = compareMetrics(existingMetrics, metrics)
  const { removedFiles, removedDirs } = await runCleanupStage(existingMetrics, metrics, OUTPUT_DIR)
  
  if (shouldContinue) await runGenerationStage({ metrics, projects: filteredProjects })
  if (validationResult.issues.length > 0) await saveValidationReport(validationResult)

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


const groupByProject = <T>(items: T[], getProject: (item: T) => string, getValue: (item: T) => string) => {
  const grouped = new Map<string, string[]>()
  items.forEach(item => {
    const project = getProject(item)
    const values = grouped.get(project) || []
    values.push(getValue(item))
    grouped.set(project, values)
  })
  return grouped
}

const displayGrouped = (grouped: Map<string, string[]>, displayFn: (text: string) => void) => {
  Array.from(grouped.keys()).sort().forEach(project => {
    const items = grouped.get(project)!.sort()
    displayFn(`${project} > ${items.join(', ')}`)
  })
}

const displayMetrics = (title: string, items: any[], displayFn: (text: string) => void, metrics?: Metric[]) => {
  if (items.length === 0) return
  displayFn(`${title}: ${items.length}`)
  
  if (metrics && typeof items[0] === 'string') {
    const grouped = groupByProject(items.map(key => metrics.find(m => `${m.project}/${m.identifier}` === key)!).filter(Boolean), m => m.project, m => m.identifier)
    displayGrouped(grouped, text.detail)
  } else if (typeof items[0] === 'string') {
    const grouped = new Map<string, string[]>()
    items.forEach(key => {
      const [project, identifier] = key.split('/')
      const values = grouped.get(project!) || []
      values.push(identifier!)
      grouped.set(project!, values)
    })
    displayGrouped(grouped, displayFn)
  } else {
    const grouped = groupByProject(items, (m: any) => m.project, (m: any) => `${m.identifier}: ${m.description?.substring(0, 60) || ''}`)
    displayGrouped(grouped, displayFn)
  }
}

export const displaySummary = ({ metrics, added, removed, omittedMetrics, shouldContinue, removedFiles, removedDirs, validationResult }: PipelineResults) => {
  displayMetrics('+ Added', added, text.subheader, metrics)
  displayMetrics('- Removed', removed, text.warn)
  displayMetrics('Omitted (Bad Descriptions)', omittedMetrics, text.warn)
  
  if (apiErrors.length > 0) {
    text.warn(`${apiErrors.length} API Errors`)
    apiErrors.forEach(err => text.warnDetail(`${err.url}: ${err.status} ${err.message}`))
  }
  
  if (validationResult?.issues?.length > 0) {
    text.warnHeader(`${validationResult.issues.length} Validation Issues`)
    const issueTypes = new Map<string, number>()
    validationResult.issues.forEach((issue: any) => {
      const type = issue.issue.split(':')[0] || 'Unknown'
      issueTypes.set(type, (issueTypes.get(type) || 0) + 1)
    })
    issueTypes.forEach((count, type) => text.warn(`${count}x ${type}`))
  }
  
  text.summaryHeader('Sync Summary:')
  text.summarySuccess(`Output Folder: {dir}`, OUTPUT_DIR)
  text.summarySuccess(`Metric Pages: {count}`, metrics.length)
  text.summarySuccess(`Projects: {count}`, new Set(metrics.map(m => m.project)).size)
  text.summarySuccess(`Categories: {count}`, new Set(metrics.map(m => m.category)).size)
  
  if (omittedMetrics.length > 0) text.summaryWarn(`Omitted Pages: {count}`, omittedMetrics.length)
  if (shouldContinue) {
    text.summarySuccess('Navigation updated')
    if (added.length > 0) text.summarySuccess(`Added: {count}`, added.length)
    if (removed.length > 0) text.summarySuccess(`Removed: {count}`, removed.length)
  } else {
    text.summaryWarn('Sync skipped (no changes)')
  }
  
  if (removedFiles.length > 0) text.summarySuccess(`Cleaned files: {count}`, removedFiles.length)
  if (removedDirs.length > 0) text.summarySuccess(`Removed dirs: {count}`, removedDirs.length)
  
  const apiErrorCount = apiErrors.length
  const validationCount = validationResult?.issues?.length || 0
  
  if (apiErrorCount > 0) text.summaryWarn(`API Errors: ${apiErrorCount}`)
  else text.summarySuccess(`API Errors: {count}`, 0)
  
  if (validationCount > 0) text.summaryWarn(`Validation Issues: ${validationCount}`)
  else text.summarySuccess(`Validation Issues: {count}`, 0)
}