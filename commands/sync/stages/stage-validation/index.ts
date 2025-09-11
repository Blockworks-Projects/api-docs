import { Metric } from '../../classes'
import type { ValidationResult } from './types'
import { validateMetrics } from './validator'

/**
 * Validation stage - handles all metric validation
 */
export async function runValidationStage(metrics: Metric[]): Promise<ValidationResult> {
  return await validateMetrics(metrics)
}