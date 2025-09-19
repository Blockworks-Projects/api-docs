import { readJsonFile, writeJsonFile } from '../../lib/file-operations'

/**
 * Update navigation to include token transparency page
 */
export const updateNavigation = async (): Promise<void> => {
  const docsPath = './docs.json'

  try {
    // Read the current docs.json
    const docs = await readJsonFile<any>(docsPath)

    // Find the Introduction group
    const introGroup = docs.navigation.tabs[0].groups.find((g: any) => g.group === 'Introduction')

    if (introGroup) {
      // Add token transparency page if it's not already there
      if (!introGroup.pages.includes('token-transparency')) {
        introGroup.pages.push('token-transparency')

        // Write back the updated docs.json
        await writeJsonFile(docsPath, docs)
        console.log('   ✓ Added token transparency to navigation')
      } else {
        console.log('   ✓ Token transparency already in navigation')
      }
    } else {
      console.warn('   ⚠ Introduction group not found in navigation')
    }
  } catch (error) {
    console.error('   ✗ Failed to update navigation:', error)
    throw error
  }
}