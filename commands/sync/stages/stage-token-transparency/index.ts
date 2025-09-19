import { generateTokenTransparencyPage } from './generator'
import { updateNavigation } from './navigation'
import * as text from '../../lib/text'

/**
 * Token Transparency Stage
 * Generates the token transparency page from Strapi CMS data
 */
export const runTokenTransparencyStage = async (): Promise<void> => {
  text.header('🔍 Token Transparency Stage')

  try {
    // Generate the token transparency page
    await generateTokenTransparencyPage('.')

    // Update navigation to include the token transparency page
    await updateNavigation()

    text.pass('Token transparency stage completed successfully')
  } catch (error) {
    text.fail('Token transparency stage failed')
    throw error
  }
}