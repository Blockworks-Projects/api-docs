import { mkdir, writeFile } from 'node:fs/promises'
import * as text from '../../lib/text'
import { fetchAssetSampleData } from '../stage-fetching/assets-api'
import { getAssetExpansionPage, getFieldReference } from '../../templates/asset-expansion-option'
import { toTitleCase } from '../../lib/utils'

export const generateAssetExpansionOption = async (option: string) => {
  const expandDir = './api-reference/assets/expand'
  const fileName = `${option.replace(/\./g, '-')}.mdx`
  const filePath = `${expandDir}/${fileName}`

  text.detail(`+ ${option}`)

  await mkdir(expandDir, { recursive: true })

  const sampleData = await fetchAssetSampleData(option)
  let title = toTitleCase(option.replace(/[._]/g, ' '))
  title = title.replace(/\bOhlcv\b/g, 'OHLCV')

  const content = getAssetExpansionPage({
    option,
    sampleData,
    title,
    description: `Retrieve ${option} data for an asset using the expand parameter`,
    accessor: option.replace(/\./g, '?.'),
    article: option === 'ohlcv_last_24_h' ? 'an' : 'a',
    objectType: option.includes('.') ? 'nested object' : 'object',
    fieldReference: getFieldReference(option)
  })

  await writeFile(filePath, content, 'utf-8')

  return { option, sampleData }
}