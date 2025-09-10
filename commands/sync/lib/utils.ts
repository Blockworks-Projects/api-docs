
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
 * Strip updated_at fields from metrics for comparison
 */
export const stripUpdatedFields = (metrics: any[]): any[] => {
  return metrics.map(metric => {
    const { updated_at, ...metricWithoutUpdatedAt } = metric
    return metricWithoutUpdatedAt
  })
}

/**
 * Compare two metrics arrays (ignoring updated_at fields)
 */
export const metricsEqual = (metrics1: any[], metrics2: any[]): boolean => {
  const stripped1 = stripUpdatedFields(metrics1)
  const stripped2 = stripUpdatedFields(metrics2)
  
  // Simple deep comparison via JSON serialization
  // This works well for our use case since metrics have consistent structure
  return JSON.stringify(stripped1.sort((a, b) => a.id - b.id)) === 
         JSON.stringify(stripped2.sort((a, b) => a.id - b.id))
}