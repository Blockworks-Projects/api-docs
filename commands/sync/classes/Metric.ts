import { toTitleCase } from '../lib/utils'
import { ValidationError } from './ValidationError'
import { type Project } from './Project'

type MetricConfig = {
  name: string
  description: string
  identifier: string
  project: string
  source: string
  data_type: string
  parameters: Record<string, any>
  interval: string
  aggregation: string
  category: string
  updated_at: number
}

export class Metric {
  name: string
  description: string
  identifier: string
  project: string
  source: string
  data_type: string
  parameters: Record<string, any>
  interval: string
  aggregation: string
  category: string
  updated_at: number
  validationErrors: ValidationError[] = []
  parent: Project

  constructor(config: MetricConfig) {
    this.name = config.name
    this.description = config.description
    this.identifier = config.identifier
    this.project = config.project
    this.source = config.source
    this.data_type = config.data_type
    this.parameters = config.parameters
    this.interval = config.interval
    this.aggregation = config.aggregation
    this.category = config.category
    this.updated_at = config.updated_at

    // TODO: Add parent project
    // this.parent =
  }

  get title() {
    return toTitleCase(this.name)
  }

  addValidationError(error: ValidationError) {
    this.validationErrors.push(error)
  }

  get pageTitle() {
    return this.parent.isChain ? `${this.parent.title}: ${this.title}` : this.title
  }

  get unit(): string {
    if (this.data_type === 'string') return 'string'
    if (this.identifier.includes('-usd') || this.data_type.includes('usd')) return 'USD'
    if (this.data_type.includes('float')) return 'native units'
    if (this.data_type.includes('int')) return 'count'
    return 'Various'
  }

  get hasValidationErrors(): boolean {
    return this.validationErrors.length > 0
  }

  get validationSummary(): string {
    if (!this.hasValidationErrors) return ''
    return this.validationErrors.map(e => e.message).join(', ')
  }

  validateDataType(): ValidationError[] {
    const issues: ValidationError[] = []
    
    // Check for -usd metrics that should have timeseries_usd data_type
    if (this.identifier.endsWith('-usd') && this.data_type !== 'timeseries_usd') {
      issues.push(new ValidationError({
        type: 'data_type',
        message: `USD metric has wrong data_type: expected "timeseries_usd", got "${this.data_type}"`,
        endpoint: `/metrics/${this.identifier}?project=${this.project}`
      }))
    }
    
    // Check for market-cap metrics that should consistently be USD
    if (this.identifier === 'market-cap' && this.data_type !== 'timeseries_usd') {
      issues.push(new ValidationError({
        type: 'data_type',
        message: `Market cap metric has inconsistent data_type: expected "timeseries_usd" for consistency, got "${this.data_type}"`,
        endpoint: `/metrics/${this.identifier}?project=${this.project}`
      }))
    }
    
    return issues
  }

  validateData(response: any): ValidationError[] {
    const issues: ValidationError[] = []
    const projectData = response[this.project]
    
    if (!projectData || !Array.isArray(projectData)) {
      issues.push(new ValidationError({
        type: 'data_validation',
        message: `No data found for project ${this.project}`,
        endpoint: `/metrics/${this.identifier}?project=${this.project}`
      }))
      return issues
    }
    
    // Validate each data point
    projectData.forEach((point: any, index: number) => {
      if (!point.date) {
        issues.push(new ValidationError({
          type: 'data_validation',
          message: `Missing date at index ${index}`,
          endpoint: `/metrics/${this.identifier}?project=${this.project}`
        }))
      }
      
      if (point.value === null || point.value === undefined) {
        issues.push(new ValidationError({
          type: 'data_validation', 
          message: `Missing value at index ${index}`,
          endpoint: `/metrics/${this.identifier}?project=${this.project}`
        }))
      }
    })
    
    return issues
  }

  validate(response?: any): ValidationError[] {
    const issues: ValidationError[] = []
    
    // Always run data type validation
    issues.push(...this.validateDataType())
    
    // Run data validation if response provided
    if (response) {
      issues.push(...this.validateData(response))
    }
    
    // Add issues to the metric's validation errors
    issues.forEach(issue => this.addValidationError(issue))
    
    return issues
  }
}