import type { ShapeChange } from '../../lib/shape-comparator'

export type EndpointSnapshot = {
  endpoint: string
  params?: Record<string, string>
  shape: any
  timestamp: number
}

export type ShapeCheckResult = {
  endpoint: string
  params?: Record<string, string>
  changes: ShapeChange[]
  isNew: boolean
}

export type ShapeCheckingResult = {
  results: ShapeCheckResult[]
  hasChanges: boolean
}
