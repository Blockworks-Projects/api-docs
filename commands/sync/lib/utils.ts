
/**
 * Capitalize first letter of each word
 */
export const toTitleCase = (str: string): string => {
  return str.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

/**
 * Escape double quotes for YAML frontmatter
 */
export const escapeYamlString = (str: string): string => {
  return str.replace(/"/g, '\\"')
}

/**
 * Strip updated_at and parameters fields from metrics for comparison
 */
export const stripUpdatedFields = (metrics: any[]): any[] => {
  return metrics.map(metric => {
    const { updated_at, parameters, ...metricWithoutIgnoredFields } = metric
    return metricWithoutIgnoredFields
  })
}

/**
 * Compare two metrics arrays (ignoring updated_at and parameters fields)
 */
export const metricsEqual = (metrics1: any[], metrics2: any[]): boolean => {
  const stripped1 = stripUpdatedFields(metrics1)
  const stripped2 = stripUpdatedFields(metrics2)

  // Simple deep comparison via JSON serialization
  // This works well for our use case since metrics have consistent structure
  return JSON.stringify(stripped1.sort((a, b) => a.id - b.id)) ===
         JSON.stringify(stripped2.sort((a, b) => a.id - b.id))
}

type MetricChange = {
  project: string
  identifier: string
  field: string
  oldValue: any
  newValue: any
}

type DetailedMetricComparison = {
  added: string[]
  removed: string[]
  changed: MetricChange[]
}

/**
 * Create a map of metrics keyed by project/identifier
 */
const createMetricMap = (metrics: any[]): Map<string, any> => {
  const map = new Map<string, any>()
  metrics.forEach(metric => {
    const key = `${metric.project}/${metric.identifier}`
    map.set(key, metric)
  })
  return map
}

/**
 * Compare two metric objects field by field
 */
const compareMetricFields = (oldMetric: any, newMetric: any, key: string): MetricChange[] => {
  const changes: MetricChange[] = []
  const fieldsToCompare = ['name', 'description', 'source', 'data_type', 'interval', 'aggregation', 'category', 'denomination']

  fieldsToCompare.forEach(field => {
    const oldValue = oldMetric[field]
    const newValue = newMetric[field]

    // Handle undefined/null as equivalent for optional fields
    if (oldValue !== newValue) {
      if (oldValue === undefined && newValue === undefined) return
      if (oldValue === null && newValue === null) return

      changes.push({
        project: newMetric.project,
        identifier: newMetric.identifier,
        field,
        oldValue,
        newValue
      })
    }
  })

  return changes
}

/**
 * Perform detailed comparison of two metrics arrays
 * Returns added, removed, and changed metrics with field-level details
 */
export const compareMetricsDetailed = (oldMetrics: any[], newMetrics: any[]): DetailedMetricComparison => {
  const strippedOld = stripUpdatedFields(oldMetrics)
  const strippedNew = stripUpdatedFields(newMetrics)

  const oldMap = createMetricMap(strippedOld)
  const newMap = createMetricMap(strippedNew)

  const added: string[] = []
  const removed: string[] = []
  const changed: MetricChange[] = []

  // Find added and changed metrics
  newMap.forEach((newMetric, key) => {
    if (!oldMap.has(key)) {
      added.push(key)
    } else {
      const oldMetric = oldMap.get(key)
      const metricChanges = compareMetricFields(oldMetric, newMetric, key)
      if (metricChanges.length > 0) {
        changed.push(...metricChanges)
      }
    }
  })

  // Find removed metrics
  oldMap.forEach((_, key) => {
    if (!newMap.has(key)) {
      removed.push(key)
    }
  })

  return { added, removed, changed }
}