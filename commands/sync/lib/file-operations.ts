import { readFile, writeFile, mkdir, readdir, stat, rm, access } from 'node:fs/promises'

/**
 * Read and parse a JSON file
 */
export async function readJsonFile<T>(filePath: string): Promise<T> {
  const content = await readFile(filePath, 'utf-8')
  return JSON.parse(content)
}

/**
 * Write data to a JSON file with formatting
 */
export async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  const content = JSON.stringify(data, null, 2)
  await writeFile(filePath, content, 'utf-8')
}

/**
 * Write content to a file
 */
export async function writeTextFile(filePath: string, content: string): Promise<void> {
  await writeFile(filePath, content, 'utf-8')
}

/**
 * Ensure directory exists, creating it recursively if needed
 */
export async function ensureDirectory(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true })
}

/**
 * Safe JSON parsing with error handling
 */
export function safeJsonParse<T>(content: string): T | null {
  try {
    return JSON.parse(content)
  } catch {
    return null
  }
}

/**
 * Read directory contents
 */
export const readDirectory = async (dirPath: string) => readdir(dirPath)

/**
 * Get file/directory stats
 */
export const getStats = async (path: string) => stat(path)

/**
 * Remove file or directory
 */
export const remove = async (path: string, options?: { recursive?: boolean }) => 
  rm(path, { recursive: options?.recursive || false })

/**
 * Check if file/directory exists
 */
export const fileExists = async (path: string): Promise<boolean> => {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

/**
 * Read text file
 */
export const readTextFile = async (filePath: string): Promise<string> =>
  readFile(filePath, 'utf-8')