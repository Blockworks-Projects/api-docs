import type { Metric, MetricDataResponse } from '../types'

export type ValidationIssue = {
  metric: Metric
  issue: string
  data?: any
}

export type ValidationResult = {
  issues: ValidationIssue[]
  totalChecked: number
  failedFetches: number
  metricDataCache: Map<string, MetricDataResponse>
}