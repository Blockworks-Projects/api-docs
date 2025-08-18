import type { Metric } from '../sync.types'

/**
 * Determine unit from data_type
 */
export const getUnit = (metric: Metric): string => {
  if (metric.data_type === 'string') return 'string'
  if (metric.identifier.includes('-usd') || metric.data_type.includes('usd')) return 'USD'
  if (metric.data_type.includes('float')) return 'native units'
  if (metric.data_type.includes('int')) return 'count'
  return 'Various'
}

/**
 * Capitalize first letter of each word
 */
export const toTitleCase = (str: string): string => {
  return str.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

/**
 * Escape double quotes for YAML frontmatter
 */
export const escapeYamlString = (str: string): string => {
  return str.replace(/"/g, '\\"')
}