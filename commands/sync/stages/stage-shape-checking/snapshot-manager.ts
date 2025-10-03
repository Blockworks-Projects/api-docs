import { readTextFile, writeTextFile, exists } from '../../lib/file-operations'
import { join } from 'node:path'
import type { EndpointSnapshot } from './types'

const SNAPSHOTS_DIR = 'commands/sync/snapshots'

/**
 * Generate a filename for a snapshot based on endpoint and params
 */
const getSnapshotFilename = (endpoint: string, params?: Record<string, string>): string => {
  const sanitized = endpoint.replace(/^\//, '').replace(/\//g, '_')

  if (params && Object.keys(params).length > 0) {
    const paramStr = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}-${v}`)
      .join('_')
    return `${sanitized}__${paramStr}.json`
  }

  return `${sanitized}.json`
}

/**
 * Load snapshot for an endpoint
 */
export const loadSnapshot = async (
  endpoint: string,
  params?: Record<string, string>
): Promise<EndpointSnapshot | null> => {
  const filename = getSnapshotFilename(endpoint, params)
  const filepath = join(SNAPSHOTS_DIR, filename)

  const fileExists = await exists(filepath)
  if (!fileExists) {
    return null
  }

  try {
    const content = await readTextFile(filepath)
    return JSON.parse(content)
  } catch {
    return null
  }
}

/**
 * Save snapshot for an endpoint
 */
export const saveSnapshot = async (
  endpoint: string,
  shape: any,
  params?: Record<string, string>
): Promise<void> => {
  const filename = getSnapshotFilename(endpoint, params)
  const filepath = join(SNAPSHOTS_DIR, filename)

  const snapshot: EndpointSnapshot = {
    endpoint,
    params,
    shape,
    timestamp: Date.now()
  }

  await writeTextFile(filepath, JSON.stringify(snapshot, null, 2))
}
