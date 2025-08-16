export type Metric = {
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

export type MetricsResponse = {
  data: Metric[]
  total: number
  page: number
}

export type MetricDataPoint = {
  date: string
  value: number | string
}

export type MetricDataResponse = {
  [project: string]: MetricDataPoint[]
}

export type APIError = {
  status: number
  error: string
  message: string[]
  url?: string
}