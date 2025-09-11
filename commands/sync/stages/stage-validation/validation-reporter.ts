import { colors as c } from '../../lib/utils'
import * as text from '../../lib/text'
import type { ValidationIssue, ValidationResult } from './types'

/**
 * Generate issue entry string for reporting
 */
export function generateIssueEntry(issue: ValidationIssue): string {
  return `{ project: '${issue.metric.project}', identifier: '${issue.metric.identifier}', issue: '${issue.issue}' }`
}

/**
 * Display validation results to console
 */
export function displayValidationResults(
  issues: ValidationIssue[],
  totalChecked: number,
  dataTypeIssueCount: number
): void {
  text.subheader('Validation Results:')

  if (dataTypeIssueCount > 0) {
    text.warn(`Found ${dataTypeIssueCount} data_type inconsistencies`)
  } else {
    text.pass(`All metrics have consistent data_type values`)
  }

  if (issues.length === 0) {
    text.pass(`All ${totalChecked} metrics passed validation`)
    return
  }

  text.warn(`Found ${issues.length} validation issues`)
}

/**
 * Generate validation report for PR body
 */
export function generateValidationReport(result: ValidationResult): string {
  if (result.issues.length === 0) {
    return ''
  }

  let report = '### 🔍 Validation Issues\n\n'
  report += `Found ${result.issues.length} validation issues across ${result.totalChecked} metrics.\n\n`

  // Group issues by project
  const byProject = new Map<string, ValidationIssue[]>()
  result.issues.forEach(issue => {
    const list = byProject.get(issue.metric.project) || []
    list.push(issue)
    byProject.set(issue.metric.project, list)
  })

  // Sort projects by issue count (most issues first)
  const sortedProjects = Array.from(byProject.entries())
    .sort((a, b) => b[1].length - a[1].length)

  report += '<details>\n<summary>Click to expand validation issues</summary>\n\n```\n'

  // Show ALL projects and their issues
  sortedProjects.forEach(([project, projectIssues]) => {
    report += `\n${project}: ${projectIssues.length} issue${projectIssues.length > 1 ? 's' : ''}\n`

    // List each metric and its issue
    projectIssues.forEach(issue => {
      const entry = generateIssueEntry(issue)
      report += `  - ${entry}\n`
    })
  })

  report += '```\n\n</details>\n\n'

  return report
}