import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { colors as c } from './const'

/**
 * Catalog existing metrics from current documentation files
 */
export const catalogExistingMetrics = async (outputDir: string): Promise<Set<string>> => {
  const existingMetrics = new Set<string>()

  try {
    // Find all existing metric MDX files recursively
    const files = await findMdxFiles(outputDir)

    console.log(c.muted(`   Found ${files.length} existing metric files`))

    for (const filePath of files) {
      try {
        // Extract project/category/identifier from file path
        // Path format: OUTPUT_DIR/{project}/{category}/{identifier}.mdx
        // Need to handle both absolute and relative paths
        let relativePath: string | undefined = filePath
        if (filePath.includes('api-reference/metrics/')) {
          // Extract just the part after 'api-reference/metrics/'
          relativePath = filePath.split('api-reference/metrics/')[1]
        }
        const parts = relativePath?.split('/')

        // Only process files in the proper 3-level directory structure for metrics
        // Exclude files like catalog.mdx which are in the root metrics directory
        if (parts?.length === 3 && parts[2]?.endsWith('.mdx')) {
          const project = parts[0]
          const category = parts[1]
          const identifier = parts[2].replace('.mdx', '')

          // Create unique key for this metric
          const metricKey = `${project}/${identifier}`
          existingMetrics.add(metricKey)
        }
      } catch (error) {
        // Skip files that can't be processed
        continue
      }
    }

    console.log(c.muted(`   Cataloged ${existingMetrics.size} existing metrics`))

  } catch (error) {
    // If directory doesn't exist or other errors, return empty set
    console.log(c.muted(`   No existing metrics found (${error instanceof Error ? error.message : 'unknown error'})`))
  }

  return existingMetrics
}

/**
 * Compare metric sets to determine changes
 */
export const compareMetrics = (
  existing: Set<string>,
  incoming: { project: string; identifier: string }[]
): { added: string[]; removed: string[] } => {

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
        // Recursively search subdirectories
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