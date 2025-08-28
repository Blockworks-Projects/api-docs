import { exists, rm, readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import type { Metric } from '../sync.types'
import { colors as c } from './const'

/**
 * Clean up obsolete metric files and empty directories
 */
export const cleanupObsoleteContent = async (
  existingMetrics: Set<string>,
  currentMetrics: Metric[],
  outputDir: string
): Promise<{ removedFiles: string[], removedDirs: string[] }> => {
  const removedFiles: string[] = []
  const removedDirs: string[] = []

  // Create a set of current metric keys for quick lookup (project/identifier format)
  const currentMetricKeys = new Set(currentMetrics.map(metric => 
    `${metric.project}/${metric.identifier}`
  ))

  // Find metrics that exist on disk but not in current API response
  const obsoleteMetrics = Array.from(existingMetrics).filter(metricKey => !currentMetricKeys.has(metricKey))

  console.log(c.subHeader('\n  Removing obsolete metric files...'))
  
  // Remove obsolete metric files
  for (const metricKey of obsoleteMetrics) {
    const [project, identifier] = metricKey.split('/')
    
    // Find the file by scanning the project directory
    const projectDir = join(outputDir, project)
    try {
      if (await exists(projectDir)) {
        const foundFile = await findMetricFile(projectDir, identifier)
        if (foundFile) {
          await rm(foundFile, { force: true })
          const relativePath = foundFile.replace(outputDir + '/', '')
          console.log(c.muted(`   - Removed ${relativePath}`))
          removedFiles.push(relativePath)
        }
      }
    } catch (error) {
      console.warn(`⚠️  Failed to remove metric ${metricKey}:`, error)
    }
  }

  console.log(c.subHeader('\n  Cleaning up empty directories...'))

  // Clean up empty directories
  await cleanupEmptyDirectories(outputDir, removedDirs)

  return { removedFiles, removedDirs }
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
    if (!(await exists(dir))) return

    const entries = await readdir(dir)
    
    // Recursively check subdirectories first
    for (const entry of entries) {
      const entryPath = join(dir, entry)
      const stats = await stat(entryPath)
      
      if (stats.isDirectory()) {
        await cleanupEmptyDirectories(entryPath, removedDirs, baseDir)
      }
    }

    // Check if directory is now empty
    const updatedEntries = await readdir(dir)
    if (updatedEntries.length === 0) {
      // Don't remove the base output directory itself
      if (dir !== baseDir) {
        await rm(dir, { recursive: true, force: true })
        const relativePath = dir.replace(baseDir + '/', '')
        console.log(c.muted(`   - Removed empty directory ${relativePath}/`))
        removedDirs.push(relativePath)
      }
    }
  } catch (error) {
    console.warn(`⚠️  Failed to clean up directory ${dir}:`, error)
  }
}

/**
 * Find a metric file by scanning directory structure
 */
async function findMetricFile(projectDir: string, identifier: string): Promise<string | null> {
  try {
    const entries = await readdir(projectDir)
    
    for (const entry of entries) {
      const entryPath = join(projectDir, entry)
      const stats = await stat(entryPath)
      
      if (stats.isDirectory()) {
        // Look for the file in subdirectories
        const subEntries = await readdir(entryPath)
        const targetFile = `${identifier}.mdx`
        
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