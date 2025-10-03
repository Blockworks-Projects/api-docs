/**
 * Compare two shapes and detect differences
 */

type ShapeValue =
  | { type: 'primitive', valueType: string }
  | { type: 'array', itemShape: any }
  | { type: 'object', shape: Record<string, ShapeValue> }
  | { type: 'null' }

type Shape = Record<string, ShapeValue>

export type ShapeChange = {
  path: string
  changeType: 'added' | 'removed' | 'type_changed' | 'structure_changed'
  oldValue?: string
  newValue?: string
}

/**
 * Compare two shape values
 */
const compareShapeValues = (
  oldValue: ShapeValue | undefined,
  newValue: ShapeValue | undefined,
  path: string,
  changes: ShapeChange[]
): void => {
  if (!oldValue && newValue) {
    changes.push({
      path,
      changeType: 'added',
      newValue: describeShapeValue(newValue)
    })
    return
  }

  if (oldValue && !newValue) {
    changes.push({
      path,
      changeType: 'removed',
      oldValue: describeShapeValue(oldValue)
    })
    return
  }

  if (!oldValue || !newValue) return

  // Type change
  if (oldValue.type !== newValue.type) {
    changes.push({
      path,
      changeType: 'type_changed',
      oldValue: describeShapeValue(oldValue),
      newValue: describeShapeValue(newValue)
    })
    return
  }

  // Compare based on type
  if (oldValue.type === 'primitive' && newValue.type === 'primitive') {
    if (oldValue.valueType !== newValue.valueType) {
      changes.push({
        path,
        changeType: 'type_changed',
        oldValue: oldValue.valueType,
        newValue: newValue.valueType
      })
    }
  } else if (oldValue.type === 'array' && newValue.type === 'array') {
    // Compare array item shapes
    if (typeof oldValue.itemShape === 'object' && typeof newValue.itemShape === 'object') {
      compareShapes(oldValue.itemShape, newValue.itemShape, `${path}[]`, changes)
    }
  } else if (oldValue.type === 'object' && newValue.type === 'object') {
    compareShapes(oldValue.shape, newValue.shape, path, changes)
  }
}

/**
 * Compare two shapes recursively
 */
export const compareShapes = (
  oldShape: Shape,
  newShape: Shape,
  basePath = '',
  changes: ShapeChange[] = []
): ShapeChange[] => {
  const allKeys = new Set([...Object.keys(oldShape), ...Object.keys(newShape)])

  for (const key of allKeys) {
    const path = basePath ? `${basePath}.${key}` : key
    const oldValue = oldShape[key]
    const newValue = newShape[key]

    compareShapeValues(oldValue, newValue, path, changes)
  }

  return changes
}

/**
 * Describe a shape value in human-readable format
 */
const describeShapeValue = (value: ShapeValue): string => {
  if (value.type === 'primitive') return value.valueType
  if (value.type === 'null') return 'null'
  if (value.type === 'array') {
    if (typeof value.itemShape === 'string') {
      return `${value.itemShape}[]`
    }
    return 'object[]'
  }
  if (value.type === 'object') return 'object'
  return 'unknown'
}
