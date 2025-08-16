/**
 * Determine unit from data_type
 */
export const getUnitFromDataType = (dataType: string): string => {
  if (dataType.includes('usd')) return 'USD'
  if (dataType.includes('float')) return 'Native units'
  if (dataType.includes('int')) return 'Count'
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