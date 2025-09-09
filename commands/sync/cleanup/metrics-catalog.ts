import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import * as text from '../lib/text'

/**
 * Catalog existing metrics from current documentation files
 */
export async function catalogExistingMetrics(outputDir: string): Promise<Set<string>> {
  text.header('📂 Cataloging existing metrics...')

  const existingMetrics = new Set<string>()

  try {
    const files = await findMdxFiles(outputDir)
    text.detail(text.withCount(`Found {count} existing metric files`, files.length))

    for (const filePath of files) {
      try {
        const metricKey = extractMetricKeyFromPath(filePath)
        if (metricKey) {
          existingMetrics.add(metricKey)
        }
      } catch (error) {
        // Skip files that can't be processed
        continue
      }
    }

    text.pass(text.withCount(`Cataloged {count} existing metrics`, existingMetrics.size))

  } catch (error) {
    text.warn(`No existing metrics found (${error instanceof Error ? error.message : 'unknown error'})`)
  }

  return existingMetrics
}

/**
 * Compare metric sets to determine changes
 */
export function compareMetrics(
  existing: Set<string>,
  incoming: { project: string; identifier: string }[]
): { added: string[]; removed: string[] } {

  // Create set of incoming metrics
  const incomingSet = new Set(
    incoming.map(metric => `${metric.project}/${metric.identifier}`)
  )

  // Find added metrics (in incoming but not in existing)
  const added = Array.from(incomingSet).filter(metric => !existing.has(metric))

  // Find removed metrics (in existing but not in incoming)
  const removed = Array.from(existing).filter(metric => !incomingSet.has(metric))

  return { added, removed }
}

/**
 * Extract metric key from file path
 */
function extractMetricKeyFromPath(filePath: string): string | null {
  let relativePath: string | undefined = filePath

  if (filePath.includes('api-reference/metrics/')) {
    relativePath = filePath.split('api-reference/metrics/')[1]
  }

  const parts = relativePath?.split('/')

  // Handle both 2-level (new) and 3-level (old) directory structures
  if (parts?.length === 2 && parts[1]?.endsWith('.mdx')) {
    // New structure: {project}/{identifier}.mdx
    const project = parts[0]
    const identifier = parts[1].replace('.mdx', '')
    return `${project}/${identifier}`
  } else if (parts?.length === 3 && parts[2]?.endsWith('.mdx')) {
    // Old structure: {project}/{category}/{identifier}.mdx
    const project = parts[0]
    const identifier = parts[2].replace('.mdx', '')
    return `${project}/${identifier}`
  }

  return null
}

/**
 * Recursively find all MDX files in a directory
 */
async function findMdxFiles(dir: string): Promise<string[]> {
  const files: string[] = []

  try {
    const entries = await readdir(dir)

    for (const entry of entries) {
      const fullPath = join(dir, entry)
      const stats = await stat(fullPath)

      if (stats.isDirectory()) {
        const subFiles = await findMdxFiles(fullPath)
        files.push(...subFiles)
      } else if (entry.endsWith('.mdx')) {
        files.push(fullPath)
      }
    }
  } catch (error) {
    // Directory doesn't exist or can't be read
  }

  return files
}