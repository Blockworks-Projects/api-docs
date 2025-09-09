import { toTitleCase } from '../lib/utils'
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
  }

  get title() {
    return toTitleCase(this.name)
  }

  get pageTitle() {
    return this.project.isChain ? this.title : `${this.title}: `
  }
}