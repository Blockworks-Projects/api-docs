import { join } from 'node:path'
import { fileExists, readDirectory, remove, getStats } from '../lib/file-operations'
import { getUniqueProjects } from '../lib/metric-utils'
import * as text from '../lib/text'
import type { Metric } from '../classes'

/**
 * Clean up existing content for projects found in metrics
 */
export async function cleanupExistingContent(metrics: Metric[], outputDir: string): Promise<void> {
  text.header('🧹 Wiping existing metrics pages...')

  const projects = getUniqueProjects(metrics)
  let removedCount = 0

  for (const project of projects) {
    const projectDir = join(outputDir, project)

    try {
      if (await fileExists(projectDir)) {
        await remove(projectDir, { recursive: true })
        removedCount++
      }
    } catch (error) {
      console.warn(`⚠️  Failed to remove ${project}/ directory:`, error)
    }
  }

  // Clean up expand options directory
  const expandDir = './api-reference/assets/expand'
  try {
    if (await fileExists(expandDir)) {
      await remove(expandDir, { recursive: true })
      removedCount++
    }
  } catch (error) {
    console.warn(`Failed to remove assets/expand/ directory:`, error)
  }

  if (removedCount > 0) {
    text.detail(text.withCount('Removed {count} existing directories', removedCount))
  }
}

/**
 * Clean up obsolete metric files and empty directories
 */
export async function cleanupObsoleteContent(
  existingMetrics: Set<string>,
  currentMetrics: Metric[],
  outputDir: string
): Promise<{ removedFiles: string[], removedDirs: string[] }> {
  text.header('🗑️ Cleaning up obsolete content...')

  const removedFiles: string[] = []
  const removedDirs: string[] = []

  // Create a set of current metric keys for quick lookup
  const currentMetricKeys = new Set(currentMetrics.map(metric =>
    `${metric.project}/${metric.identifier}`
  ))

  // Find metrics that exist on disk but not in current API response
  const obsoleteMetrics = Array.from(existingMetrics).filter(metricKey =>
    !currentMetricKeys.has(metricKey)
  )

  text.detail('Removing obsolete metric files...')

  // Remove obsolete metric files
  for (const metricKey of obsoleteMetrics) {
    const [project, identifier] = metricKey.split('/')

    // Find the file by scanning the project directory
    const projectDir = join(outputDir, project!)
    try {
      if (await fileExists(projectDir)) {
        const foundFile = await findMetricFile(projectDir, identifier!)
        if (foundFile) {
          await remove(foundFile)
          const relativePath = foundFile.replace(outputDir + '/', '')
          removedFiles.push(relativePath)
        }
      }
    } catch (error) {
      text.warn(`Failed to remove metric ${metricKey}:`, error)
    }
  }

  if (removedFiles.length > 0) {
    text.detail(text.withCount('Removed {count} obsolete metric files', removedFiles.length))
  }

  text.detail('Cleaning up empty directories...')

  // Clean up empty directories
  await cleanupEmptyDirectories(outputDir, removedDirs)

  if (removedDirs.length > 0) {
    text.detail(text.withCount('Removed {count} empty directories', removedDirs.length))
  }

  return { removedFiles, removedDirs }
}

/**
 * Find a metric file by scanning directory structure
 */
async function findMetricFile(projectDir: string, identifier: string): Promise<string | null> {
  try {
    const targetFile = `${identifier}.mdx`
    const directPath = join(projectDir, targetFile)

    // First check if file fileExists directly in project directory (new structure)
    if (await fileExists(directPath)) {
      return directPath
    }

    // Fall back to checking subdirectories (old structure) for cleanup
    const entries = await readDirectory(projectDir)

    for (const entry of entries) {
      const entryPath = join(projectDir, entry)
      const getStatss = await getStats(entryPath)

      if (getStatss.isDirectory()) {
        const subEntries = await readDirectory(entryPath)

        if (subEntries.includes(targetFile)) {
          return join(entryPath, targetFile)
        }
      }
    }
  } catch (error) {
    // Ignore errors
  }

  return null
}

/**
 * Recursively remove empty directories
 */
async function cleanupEmptyDirectories(
  dir: string,
  removedDirs: string[],
  baseDir: string = dir
): Promise<void> {
  try {
    if (!(await fileExists(dir))) return

    const entries = await readDirectory(dir)

    // Recursively check subdirectories first
    for (const entry of entries) {
      const entryPath = join(dir, entry)
      const getStatss = await getStats(entryPath)

      if (getStatss.isDirectory()) {
        await cleanupEmptyDirectories(entryPath, removedDirs, baseDir)
      }
    }

    // Check if directory is now empty
    const updatedEntries = await readDirectory(dir)
    if (updatedEntries.length === 0) {
      // Don't remove the base output directory itself
      if (dir !== baseDir) {
        await remove(dir, { recursive: true })
        const relativePath = dir.replace(baseDir + '/', '')
        removedDirs.push(relativePath)
      }
    }
  } catch (error) {
    text.warn(`Failed to clean up directory ${dir}:`, error)
  }
}