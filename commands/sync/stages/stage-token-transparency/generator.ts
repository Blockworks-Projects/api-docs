import { readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { fetchTokenTransparencies } from '../../lib/strapi'
import type { TokenTransparency } from '../../lib/strapi'

// Helper function to get score display
const formatScore = (score: number, total: number): string => {
  return `**${score}**/${total}`
}

// Generate a single table row for a token transparency entry
const generateTableRow = (item: TokenTransparency): string => {
  const attrs = item.attributes

  // Calculate totals for each category
  const projectAndTeamTotal = 10
  const tokenAllocationTotal = 18
  const marketStructureTotal = 7
  const financialDisclosureTotal = 5
  const totalPossible = 40

  const totalScore = attrs.projectAndTeamRating +
                    attrs.tokenSupplyAndAllocationRating +
                    attrs.transactionsAndMarketStructureRating +
                    attrs.financialDisclosureRating

  return `| **${attrs.projectName}**<br/>${attrs.tokenSymbol} | ${formatScore(attrs.projectAndTeamRating, projectAndTeamTotal)} | ${formatScore(attrs.tokenSupplyAndAllocationRating, tokenAllocationTotal)} | ${formatScore(attrs.transactionsAndMarketStructureRating, marketStructureTotal)} | ${formatScore(attrs.financialDisclosureRating, financialDisclosureTotal)} | ${formatScore(totalScore, totalPossible)} | **${Math.round(totalScore / totalPossible * 10000) / 100}%** | [Download](${attrs.filingReportUrl}) |`
}

export const generateTokenTransparencyPage = async (outputPath: string): Promise<void> => {
  console.log('🔍 Generating Token Transparency page...')

  try {
    // Fetch token transparency data from Strapi
    const transparencies = await fetchTokenTransparencies()

    if (!transparencies || transparencies.length === 0) {
      console.log('   No token transparencies found, skipping page generation')
      return
    }

    // Sort by total score (highest first), then by project name
    const sortedTransparencies = transparencies.sort((a, b) => {
      const scoreA = a.attributes.projectAndTeamRating +
                     a.attributes.tokenSupplyAndAllocationRating +
                     a.attributes.transactionsAndMarketStructureRating +
                     a.attributes.financialDisclosureRating
      const scoreB = b.attributes.projectAndTeamRating +
                     b.attributes.tokenSupplyAndAllocationRating +
                     b.attributes.transactionsAndMarketStructureRating +
                     b.attributes.financialDisclosureRating

      if (scoreB !== scoreA) {
        return scoreB - scoreA
      }
      return a.attributes.projectName.localeCompare(b.attributes.projectName)
    })

    // Generate table rows
    const tableRows = sortedTransparencies.map(generateTableRow).join('\n')

    // Read the template
    const templatePath = path.join(__dirname, 'template.mdx')
    const template = readFileSync(templatePath, 'utf-8')

    // Replace placeholder with actual table rows
    const content = template.replace('{{TABLE_ROWS}}', tableRows)

    // Write the final MDX file
    const outputFilePath = path.join(outputPath, 'token-transparency.mdx')
    writeFileSync(outputFilePath, content)

    console.log(`   ✓ Generated token transparency page with ${transparencies.length} projects`)
  } catch (error) {
    console.error('   ✗ Error generating token transparency page:', error)
    throw error
  }
}