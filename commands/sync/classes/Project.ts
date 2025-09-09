import { toTitleCase } from '../lib/utils'
import { type Metric } from './Metric'

type ProjectType = 'chain' | 'treasury' | 'etf' | 'project'

export class Project {
  name: string
  slug: string
  metrics: Metric[]

  constructor(config: Project) {
    this.name = config.name
    this.slug = config.slug
    this.metrics = config.metrics
  }

  get isChain() {
    return this.metrics.some(metric => metric.identifier === 'transactions-failed') || this.name.toLowerCase() === 'bitcoin'
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
}