import { Metric, Project } from '../../classes'
import { generateMetricPage } from './metric-page-generator'
import { updateOpenApiSpec } from './openapi-generator'
import { updateNavigation } from './navigation-generator'
import { generateMetricsCatalog } from './catalog-generator'
import { generateProjectsPage } from './projects-page-generator'
import * as text from '../../lib/text'
import { createProgressBar } from '../../lib/createProgressBar'

type GenerationStageConfig = { 
  metrics: Metric[]
  projects: Map<string, Project>
}

export const runGenerationStage = async ({ metrics, projects }: GenerationStageConfig) => {
  await generateMetricPages({ metrics })

  text.header('📖 Generating metrics catalog...')
  await generateMetricsCatalog(metrics)

  await updateOpenApiSpec(metrics)

  // Generate projects page
  const projectsList = Array.from(projects.values())
  await generateProjectsPage(projectsList)

  await updateNavigation(metrics, projects)
}

const generateMetricPages = async ({ metrics }: { metrics: Metric[] }) => {
  text.header('✏️ Generating metric pages...')

  const progressBar = createProgressBar()
  progressBar.start(metrics.length, 0)

  let completed = 0
  const promises = metrics.map(async (metric) => {
    await generateMetricPage({ metric, allMetrics: metrics })
    completed++
    progressBar.update(completed)
  })

  await Promise.all(promises)
  progressBar.stop()
}

// Re-export for backwards compatibility
export const runGenerators = runGenerationStage