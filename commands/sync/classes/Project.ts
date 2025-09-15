import { toTitleCase } from '../lib/utils'
import { type Metric } from './Metric'

type ProjectType = 'chain' | 'treasury' | 'etf' | 'project'

type ProjectConfig = {
  name: string
  slug: string
  metrics: Metric[]
}

export class Project {
  name: string
  slug: string
  metrics: Metric[]

  constructor(config: ProjectConfig) {
    this.name = config.name
    this.slug = config.slug
    this.metrics = config.metrics
  }

  get isChain() {
    return this.metrics.some(metric => metric.identifier === 'transaction-fail-total') || this.name.toLowerCase() === 'bitcoin'
  }

  get isTreasury() {
    return this.metrics.some(metric => metric.category === 'Treasury')
  }

  get isETF() {
    return this.metrics.some(metric => metric.category === 'ETF')
  }

  get type(): ProjectType {
    if (this.isChain) return 'chain'
    if (this.isTreasury) return 'treasury'
    if (this.isETF) return 'etf'
    return 'project'
  }

  get title() {
    return toTitleCase(this.name)
  }

  addMetric(metric: Metric) {
    this.metrics.push(metric)
  }

  get metricsByCategory(): Map<string, Metric[]> {
    const categories = new Map<string, Metric[]>()
    for (const metric of this.metrics) {
      const list = categories.get(metric.category) || []
      list.push(metric)
      categories.set(metric.category, list)
    }
    return categories
  }

  get hasValidationErrors(): boolean {
    return this.metrics.some(m => m.hasValidationErrors)
  }

  get validationErrorCount(): number {
    return this.metrics.reduce((count, m) => count + m.validationErrors.length, 0)
  }
}