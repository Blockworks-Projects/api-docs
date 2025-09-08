import type { ValidationIssue, ValidationResult } from './types'
import { colors as c } from '../lib/constants'

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
  if (dataTypeIssueCount > 0) {
    console.log(c.warning(`   ⚠️ Found ${dataTypeIssueCount} data_type inconsistencies`))
  } else {
    console.log(c.green(`   ✓ All metrics have consistent data_type values`))
  }

  if (issues.length === 0) {
    console.log(c.green(`✅ All ${totalChecked} metrics passed validation`))
    return
  }

  console.log(c.warning(`\n⚠️ Found ${issues.length} validation issues:`))

  // Group issues by type for summary
  const issueTypes = new Map<string, number>()
  issues.forEach(issue => {
    const type = issue.issue.split(':')[0]
    issueTypes.set(type || 'Unknown', (issueTypes.get(type || 'Unknown') || 0) + 1)
  })

  issueTypes.forEach((count, type) => {
    console.log(c.warning(`   ${count}x ${type}`))
  })

  // Show ALL issues grouped by project
  console.log(c.muted('\n   All issues by project:'))
  const issuesByProject = new Map<string, ValidationIssue[]>()
  issues.forEach(issue => {
    const list = issuesByProject.get(issue.metric.project) || []
    list.push(issue)
    issuesByProject.set(issue.metric.project, list)
  })

  issuesByProject.forEach((projectIssues, project) => {
    console.log(c.muted(`\n   ${project}:`))
    projectIssues.forEach(issue => {
      const entry = generateIssueEntry(issue)
      console.log(c.muted(`     - ${entry}`))
      if (issue.data && issue.issue.includes('Malformed')) {
        console.log(c.muted(`       Data: ${JSON.stringify(issue.data).substring(0, 100)}...`))
      }
    })
  })
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