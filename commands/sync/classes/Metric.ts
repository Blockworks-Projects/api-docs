import { toTitleCase } from '../lib/utils'
import { type ValidationError } from './ValidationError'
import { type Project } from './Project'

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

  constructor(config: Metric) {
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
}