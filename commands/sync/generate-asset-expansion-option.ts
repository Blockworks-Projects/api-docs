import { mkdir, writeFile } from 'node:fs/promises'
import { colors as c } from './const'
import { fetchAssetSampleData } from './fetch-asset-sample-data'
import { ASSET_EXPANSION_OPTION_PAGE, FIELD_DEFINITIONS } from './templates'
import { toTitleCase, escapeYamlString } from './utils'

/**
 * Generate a single asset expansion option page
 */
export const generateAssetExpansionOption = async (option: string): Promise<void> => {
  const expandDir = './api-reference/assets/expand'
  const fileName = `${option.replace(/\./g, '-')}.mdx`
  const filePath = `${expandDir}/${fileName}`

  console.log(c.adding(`     + ${option}`))

  // Ensure directory exists
  await mkdir(expandDir, { recursive: true })

  // Fetch sample data
  const sampleData = await fetchAssetSampleData(option)

  // Format the response
  const exampleResponse = JSON.stringify(sampleData, null, 2)

  // Generate field reference table
  const fields = FIELD_DEFINITIONS[option] || []
  let fieldReference = ''
  if (fields.length > 0) {
    const tableRows = fields.map(field =>
      `| \`${field.field}\` | ${field.type} | ${field.description} |`
    ).join('\n')

    fieldReference = `### Field Reference

| Field | Type | Description |
|---|---|---|
${tableRows}`
  }

  // Generate content from template
  let title = toTitleCase(option.replace(/[._]/g, ' '))
  // Special case: uppercase OHLCV
  title = title.replace(/\bOhlcv\b/g, 'OHLCV')
  const description = `Retrieve ${option} data for an asset using the expand parameter`
  const accessor = option.replace(/\./g, '?.')
  const article = option === 'ohlcv_last_24_h' ? 'an' : 'a'
  const objectType = option.includes('.') ? 'nested object' : 'object'

  const content = ASSET_EXPANSION_OPTION_PAGE
    .replace('{expansion_title}', escapeYamlString(title))
    .replace('{expansion_description}', escapeYamlString(description))
    .replace(/\{expansion_option\}/g, option)
    .replace('{expansion_accessor}', accessor)
    .replace('{expansion_article}', article)
    .replace('{expansion_object_type}', objectType)
    .replace('{example_response}', exampleResponse)
    .replace('{field_reference}', fieldReference)

  // Write the file
  await writeFile(filePath, content, 'utf-8')
}