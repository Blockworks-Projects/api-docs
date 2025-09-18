import { apiErrors } from '../sync/lib/api-errors'
import { OUTPUT_DIR } from '../sync/lib/constants'
import { Metric, Project } from '../sync/classes'
import { runFetchingStage } from '../sync/stages/stage-fetching'
import { compareMetrics } from '../sync/stages/stage-scanning/metrics-catalog'
import { runValidationStage } from '../sync/stages/stage-validation'
import { generateValidationReport } from '../sync/stages/stage-validation/validation-reporter'
import { writeTextFile } from '../sync/lib/file-operations'
import * as text from '../sync/lib/text'

type ValidationResults = {
  projects: Map<string, Project>
  metrics: Metric[]
  added: string[]
  removed: string[]
  omittedMetrics: Metric[]
  validationResult: any
  hasIssues: boolean
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

export const runValidationPipeline = async (): Promise<ValidationResults> => {
  // Only fetch data, don't trigger generation
  const { existingMetrics, projects } = await runFetchingStage({
    outputDir: OUTPUT_DIR,
    updateOnlyMode: true
  })

  const { filteredProjects, omittedMetrics } = filterProjects(projects)
  const metrics = extractMetrics(filteredProjects)

  // Run validation checks
  const validationResult = await runValidationStage(metrics)

  // Compare with existing to identify changes
  const { added, removed } = compareMetrics(existingMetrics, metrics)

  // Save validation report if there are issues
  if (validationResult.issues.length > 0) {
    await saveValidationReport(validationResult)
  }

  const hasIssues = (
    validationResult.issues.length > 0 ||
    apiErrors.length > 0 ||
    omittedMetrics.length > 0 ||
    added.length > 0 ||
    removed.length > 0
  )

  return {
    projects: filteredProjects,
    metrics,
    added,
    removed,
    omittedMetrics,
    validationResult,
    hasIssues
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

const displayChanges = (metrics: Metric[], added: string[], removed: string[]) => {
  if (added.length > 0) {
    text.subheader(`📈 ${added.length} New Metrics Detected:`)
    const grouped = groupMetricsByProject(metrics, added)
    displayGroupedMetrics(grouped, text.detail)
    console.log()
  }

  if (removed.length > 0) {
    text.warn(`📉 ${removed.length} Missing Metrics Detected:`)
    const grouped = groupRemovedMetrics(removed)
    displayGroupedMetrics(grouped, text.warnDetail)
    console.log()
  }

  if (added.length === 0 && removed.length === 0) {
    text.pass('✅ No metric changes detected')
    console.log()
  }
}

const displayOmittedMetrics = (omitted: Metric[]) => {
  if (omitted.length === 0) return

  text.warn(`🚫 ${omitted.length} Metrics with Bad Descriptions:`)
  const grouped = groupOmittedMetrics(omitted)

  Array.from(grouped.keys())
    .sort()
    .forEach(project => {
      const items = grouped.get(project)!.sort((a, b) => a.identifier.localeCompare(b.identifier))
      items.forEach(item => {
        text.warnDetail(`${project}/${item.identifier}: ${item.description.substring(0, 60)}...`)
      })
    })
  console.log()
}

const displayApiErrors = () => {
  if (apiErrors.length === 0) {
    text.pass('✅ No API errors')
    console.log()
    return
  }

  text.warn(`🔥 ${apiErrors.length} API Errors:`)
  apiErrors.forEach(error => {
    text.warnDetail(`${error.url} → ${error.status} ${error.message}`)
  })
  console.log()
}

const displayValidationIssues = (validationResult: any) => {
  if (!validationResult || validationResult.issues.length === 0) {
    text.pass('✅ No validation issues')
    console.log()
    return
  }

  text.warnHeader(`🔍 ${validationResult.issues.length} Validation Issues:`)

  // Group by issue type
  const issueTypes = new Map<string, number>()
  validationResult.issues.forEach((issue: any) => {
    const type = issue.issue.split(':')[0]
    issueTypes.set(type || 'Unknown', (issueTypes.get(type || 'Unknown') || 0) + 1)
  })

  issueTypes.forEach((count, type) => {
    text.warn(`  ${count}x ${type}`)
  })

  // Show details by project
  const issuesByProject = new Map<string, any[]>()
  validationResult.issues.forEach((issue: any) => {
    const list = issuesByProject.get(issue.metric.project) || []
    list.push(issue)
    issuesByProject.set(issue.metric.project, list)
  })

  text.warnDetail('\nDetails by project:')
  issuesByProject.forEach((projectIssues, project) => {
    text.warnDetail(`${project}:`)
    projectIssues.forEach(issue => {
      text.warnDetail(`  ${issue.metric.identifier}: ${issue.issue}`)
    })
  })

  console.log()
}

const displayValidationStats = (results: ValidationResults) => {
  const { metrics, omittedMetrics, added, removed, validationResult } = results

  text.summaryHeader('📊 Validation Summary:')

  const uniqueProjects = new Set(metrics.map(m => m.project)).size
  const uniqueCategories = new Set(metrics.map(m => m.category)).size

  text.summarySuccess(`Total Metrics: {count}`, metrics.length)
  text.summarySuccess(`Projects: {count}`, uniqueProjects)
  text.summarySuccess(`Categories: {count}`, uniqueCategories)

  if (added.length > 0) text.summaryWarn(`New Metrics: {count}`, added.length)
  if (removed.length > 0) text.summaryWarn(`Missing Metrics: {count}`, removed.length)
  if (omittedMetrics.length > 0) text.summaryWarn(`Bad Descriptions: {count}`, omittedMetrics.length)

  if (apiErrors.length > 0) {
    text.summaryWarn(`API Errors: {count}`, apiErrors.length)
  } else {
    text.summarySuccess(`API Errors: {count}`, 0)
  }

  if (validationResult && validationResult.issues.length > 0) {
    text.summaryWarn(`Validation Issues: {count}`, validationResult.issues.length)
  } else {
    text.summarySuccess(`Validation Issues: {count}`, 0)
  }
}

export const displayValidationSummary = (results: ValidationResults) => {
  displayChanges(results.metrics, results.added, results.removed)
  displayOmittedMetrics(results.omittedMetrics)
  displayApiErrors()
  displayValidationIssues(results.validationResult)
  displayValidationStats(results)
}