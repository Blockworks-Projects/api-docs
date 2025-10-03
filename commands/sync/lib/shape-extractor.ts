/**
 * Extract the shape/schema of an object, returning a lean structure
 * that captures field names and types (including nested structures)
 */

type ShapeValue =
  | { type: 'primitive', valueType: string }
  | { type: 'array', itemShape: Shape | string }
  | { type: 'object', shape: Shape }
  | { type: 'null' }

type Shape = Record<string, ShapeValue>

/**
 * Extract shape from a value
 */
const extractValueShape = (value: any): ShapeValue => {
  if (value === null) {
    return { type: 'null' }
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return { type: 'array', itemShape: 'unknown' }
    }

    // Check if all items have same shape (sample first item)
    const firstItemShape = extractValueShape(value[0])

    return {
      type: 'array',
      itemShape: firstItemShape.type === 'object'
        ? (firstItemShape as any).shape
        : typeof value[0]
    }
  }

  if (typeof value === 'object') {
    const shape: Shape = {}
    for (const [key, val] of Object.entries(value)) {
      shape[key] = extractValueShape(val)
    }
    return { type: 'object', shape }
  }

  return { type: 'primitive', valueType: typeof value }
}

/**
 * Extract shape from a response object
 */
export const extractShape = (response: any): Shape => {
  if (typeof response !== 'object' || response === null) {
    throw new Error('Response must be an object')
  }

  const shape: Shape = {}
  for (const [key, value] of Object.entries(response)) {
    shape[key] = extractValueShape(value)
  }

  return shape
}

/**
 * Convert shape to a readable string format (for debugging)
 */
export const shapeToString = (shape: Shape, indent = 0): string => {
  const spaces = '  '.repeat(indent)
  const lines: string[] = []

  for (const [key, value] of Object.entries(shape)) {
    if (value.type === 'primitive') {
      lines.push(`${spaces}${key}: ${value.valueType}`)
    } else if (value.type === 'null') {
      lines.push(`${spaces}${key}: null`)
    } else if (value.type === 'array') {
      if (typeof value.itemShape === 'string') {
        lines.push(`${spaces}${key}: ${value.itemShape}[]`)
      } else {
        lines.push(`${spaces}${key}: [`)
        lines.push(shapeToString(value.itemShape, indent + 1))
        lines.push(`${spaces}]`)
      }
    } else if (value.type === 'object') {
      lines.push(`${spaces}${key}: {`)
      lines.push(shapeToString(value.shape, indent + 1))
      lines.push(`${spaces}}`)
    }
  }

  return lines.join('\n')
}
