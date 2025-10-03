import { extractShape } from '../../lib/shape-extractor'
import { compareShapes } from '../../lib/shape-comparator'
import { loadSnapshot, saveSnapshot } from './snapshot-manager'
import type { ShapeCheckResult, ShapeCheckingResult } from './types'
import * as text from '../../lib/text'

type EndpointResponse = {
  endpoint: string
  params?: Record<string, string>
  response: any
}

/**
 * Check shape for a single endpoint response
 */
const checkEndpointShape = async (
  endpoint: string,
  response: any,
  params?: Record<string, string>
): Promise<ShapeCheckResult> => {
  const newShape = extractShape(response)
  const snapshot = await loadSnapshot(endpoint, params)

  if (!snapshot) {
    // New endpoint - save snapshot
    await saveSnapshot(endpoint, newShape, params)
    return {
      endpoint,
      params,
      changes: [],
      isNew: true
    }
  }

  // Compare with existing snapshot
  const changes = compareShapes(snapshot.shape, newShape)

  // Save new snapshot if there are changes
  if (changes.length > 0) {
    await saveSnapshot(endpoint, newShape, params)
  }

  return {
    endpoint,
    params,
    changes,
    isNew: false
  }
}

/**
 * Run shape checking stage for multiple endpoint responses
 */
export const runShapeCheckingStage = async (
  responses: EndpointResponse[]
): Promise<ShapeCheckingResult> => {
  text.header('🔍 Checking endpoint shapes...')

  const results: ShapeCheckResult[] = []

  for (const { endpoint, response, params } of responses) {
    const result = await checkEndpointShape(endpoint, response, params)
    results.push(result)

    const paramStr = params ? `?${Object.entries(params).map(([k, v]) => `${k}=${v}`).join('&')}` : ''

    if (result.isNew) {
      text.detail(`📄 New endpoint: ${endpoint}${paramStr}`)
    } else if (result.changes.length > 0) {
      text.warn(`⚠️  Shape changed: ${endpoint}${paramStr} (${result.changes.length} changes)`)
    }
  }

  const hasChanges = results.some(r => r.changes.length > 0)
  const newEndpoints = results.filter(r => r.isNew).length

  if (newEndpoints > 0) {
    text.pass(`Saved ${newEndpoints} new endpoint snapshots`)
  }

  if (!hasChanges) {
    text.pass('No shape changes detected')
  }

  return {
    results,
    hasChanges
  }
}
