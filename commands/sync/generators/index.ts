import type { Metric } from '../types'
import { generateMetricPage } from './metric-page-generator'
import { updateOpenApiSpec } from './openapi-generator'
import { updateNavigation } from './navigation-generator'
import { updateAssetExpansionOptions } from './asset-expansion-options-generator'
import { colors as c } from '../lib/constants'
import * as text from '../lib/text'
import { createProgressBar } from '../lib/createProgressBar'

/**
 * Generators stage - handles all content generation
 */
export async function runGeneratorsStage(metrics: Metric[]): Promise<void> {
  // Stage 1: Generate individual metric pages
  await generateMetricPages(metrics)

  // Stage 2: Generate metrics catalog (placeholder - would be implemented)
  text.header('📖 Generating metrics catalog...')
  text.skip('Skipped - generator needs import path fixes')

  // Stage 3: Update OpenAPI spec
  await updateOpenApiSpec(metrics)

  // Stage 4: Update asset expansion options
  text.header('🎯 Updating asset expansion options...')
  const expandOptions = await updateAssetExpansionOptions()

  // Stage 5: Update misc endpoints (placeholder - would be implemented)
  text.header('🎯 Updating misc endpoints...')
  text.skip('Skipped - generator needs import path fixes')

  // Stage 6: Update navigation
  await updateNavigation(metrics, expandOptions)
}

/**
 * Generate individual metric pages with progress bar
 */
async function generateMetricPages(metrics: Metric[]): Promise<void> {
  text.header('✏️ Generating metric pages...')

  const progressBar = createProgressBar()
  progressBar.start(metrics.length, 0)

  let completed = 0
  const promises = metrics.map(async (metric) => {
    await generateMetricPage(metric, metrics)
    completed++
    progressBar.update(completed)
  })

  await Promise.all(promises)
  progressBar.stop()
}