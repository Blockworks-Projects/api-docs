import { Metric, Project } from '../sync/classes'
import { fetch } from '../sync/lib/api-client'
import { apiErrors } from '../sync/lib/api-errors'
import { OUTPUT_DIR } from '../sync/lib/constants'
import { writeTextFile } from '../sync/lib/file-operations'
import * as text from '../sync/lib/text'
import { runFetchingStage } from '../sync/stages/stage-fetching'
import { compareMetrics } from '../sync/stages/stage-scanning/metrics-catalog'
import { runShapeCheckingStage } from '../sync/stages/stage-shape-checking'
import { runValidationStage } from '../sync/stages/stage-validation'
import { generateValidationReport } from '../sync/stages/stage-validation/validation-reporter'
import { CHECK_ENDPOINTS } from '../check-endpoints'

type ValidationResults = {
  projects: Map<string, Project>
  metrics: Metric[]
  added: string[]
  removed: string[]
  omittedMetrics: Metric[]
  validationResult: any
  shapeCheckResult?: any
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

const runShapeCheckingForValidation = async () => {
  const responses = await Promise.all(
    CHECK_ENDPOINTS.map(async ({ path, query }) => {
      try {
        const response = await fetch(path, query)
        return response ? { endpoint: path, params: query, response } : null
      } catch {
        return null // Shape checking is optional
      }
    })
  )

  return await runShapeCheckingStage(responses.filter(Boolean) as any[])
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

  // Run shape checking on non-metric endpoints
  const shapeCheckResult = await runShapeCheckingForValidation()

  // Save validation report if there are issues
  if (validationResult.issues.length > 0) {
    await saveValidationReport(validationResult)
  }

  const totalShapeChanges = shapeCheckResult?.results?.reduce((sum: number, r: any) => sum + r.changes.length, 0) || 0

  const hasIssues = (
    validationResult.issues.length > 0 ||
    apiErrors.length > 0 ||
    omittedMetrics.length > 0 ||
    added.length > 0 ||
    removed.length > 0 ||
    totalShapeChanges > 0
  )

  return {
    projects: filteredProjects,
    metrics,
    added,
    removed,
    omittedMetrics,
    validationResult,
    shapeCheckResult,
    hasIssues
  }
}

const groupByProject = (keys: string[], metrics?: Metric[]) => {
  const grouped = new Map<string, string[]>()

  keys.forEach(key => {
    const [project, identifier] = metrics
      ? [metrics.find(m => `${m.project}/${m.identifier}` === key)?.project, metrics.find(m => `${m.project}/${m.identifier}` === key)?.identifier]
      : key.split('/')

    if (project && identifier) {
      const identifiers = grouped.get(project) || []
      identifiers.push(identifier)
      grouped.set(project, identifiers)
    }
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
    displayGroupedMetrics(groupByProject(added, metrics), text.detail)
  }

  if (removed.length > 0) {
    text.warn(`📉 ${removed.length} Missing Metrics Detected:`)
    displayGroupedMetrics(groupByProject(removed), text.warnDetail)
  }

  if (added.length === 0 && removed.length === 0) {
    text.pass('No metric changes detected')
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
}

const displayApiErrors = () => {
  if (apiErrors.length === 0) return text.pass('No API errors')

  text.warn(`🔥 ${apiErrors.length} API Errors:`)
  apiErrors.forEach(error => text.warnDetail(`${error.url} → ${error.status} ${error.message}`))
}

const displayValidationIssues = (validationResult: any) => {
  if (!validationResult?.issues.length) return text.pass('No validation issues')

  text.warnHeader(`🔍 ${validationResult.issues.length} Validation Issues:`)

  const issueTypes = new Map<string, number>()
  const issuesByProject = new Map<string, any[]>()

  validationResult.issues.forEach((issue: any) => {
    const type = issue.issue.split(':')[0] || 'Unknown'
    issueTypes.set(type, (issueTypes.get(type) || 0) + 1)

    const list = issuesByProject.get(issue.metric.project) || []
    list.push(issue)
    issuesByProject.set(issue.metric.project, list)
  })

  issueTypes.forEach((count, type) => text.warn(`  ${count}x ${type}`))

  text.warnDetail('\nDetails by project:')
  issuesByProject.forEach((projectIssues, project) => {
    text.warnDetail(`${project}:`)
    projectIssues.forEach(issue => text.warnDetail(`  ${issue.metric.identifier}: ${issue.issue}`))
  })
}

const displayShapeChanges = (shapeCheckResult: any) => {
  const changedEndpoints = shapeCheckResult?.results?.filter((r: any) => r.changes.length > 0)
  if (!changedEndpoints?.length) return

  text.warnHeader(`🔄 ${changedEndpoints.length} Endpoint Shape Changes Detected:`)

  changedEndpoints.forEach((result: any) => {
    const paramStr = result.params ? `?${Object.entries(result.params).map(([k, v]) => `${k}=${v}`).join('&')}` : ''
    text.warn(`${result.endpoint}${paramStr}`)

    result.changes.forEach((change: any) => {
      const symbols = { added: '+', removed: '-', type_changed: '~' }
      const symbol = symbols[change.changeType as keyof typeof symbols] || '?'
      const value = change.changeType === 'type_changed'
        ? `${change.oldValue} → ${change.newValue}`
        : change.newValue || change.oldValue
      text.detail(`  ${symbol} ${change.path}: ${value}`)
    })
  })
}

const displayValidationStats = (results: ValidationResults) => {
  const { metrics, omittedMetrics, added, removed, validationResult, shapeCheckResult } = results

  text.summaryHeader('📊 Validation Summary:')

  text.summarySuccess(`Total Metrics: {count}`, metrics.length)
  text.summarySuccess(`Projects: {count}`, new Set(metrics.map(m => m.project)).size)
  text.summarySuccess(`Categories: {count}`, new Set(metrics.map(m => m.category)).size)

  const counts = [
    { label: 'New Metrics', count: added.length },
    { label: 'Missing Metrics', count: removed.length },
    { label: 'Bad Descriptions', count: omittedMetrics.length },
    { label: 'API Errors', count: apiErrors.length },
    { label: 'Validation Issues', count: validationResult?.issues.length || 0 },
    { label: 'Shape Changes', count: shapeCheckResult?.results.reduce((sum: number, r: any) => sum + r.changes.length, 0) || 0 }
  ]

  counts.forEach(({ label, count }) => {
    count > 0 ? text.summaryWarn(`${label}: {count}`, count) : text.summarySuccess(`${label}: {count}`, 0)
  })
}

export const displayValidationSummary = (results: ValidationResults) => {
  displayChanges(results.metrics, results.added, results.removed)
  displayOmittedMetrics(results.omittedMetrics)
  displayApiErrors()
  displayValidationIssues(results.validationResult)
  displayShapeChanges(results.shapeCheckResult)
  displayValidationStats(results)
}