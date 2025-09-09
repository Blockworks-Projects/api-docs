import chalk from 'chalk'
import { colors as c } from './constants'

// main section header with emoji
export const header = (text: string): void => console.log(chalk.greenBright.bold(`\n${text}`))

// sub-section header with numbering
export const subheader = (text: string): void => console.log(`\n   ${text}`)

// indented detail message
export const detail = (text: string): void => console.log(chalk.grey(`   ${text}`))

// skipped message
export const skip = (text: string): void => console.log('   ', chalk.grey.strikethrough(text))

// passed message
export const pass = (...args: any[]): void => console.log(chalk.grey('   ✓', ...args))

// failed message
export const fail = (...args: any[]): void => console.log(c.fail('   ✗', ...args))

// warning message
export const warn = (...args: any[]): void => console.log(chalk.yellowBright.bold('\n  ', ...args))

// warning header
export const warnHeader = (...args: any[]): void => console.log('\n', chalk.yellowBright.bold.underline(...args))

// warning detail message
export const warnDetail = (...args: any[]): void => console.log(chalk.yellow('  ', ...args))

// helper function to replace {count} with the count
export const withCount = (text: string, ...values: number[]): string =>
  text.replace(/\{[^}]+\}/g, () => chalk.yellowBright.bold(values.shift() ?? ''))

// summary header
export const summaryHeader = (text: string): void => console.log('\n', c.header.underline(text))

// summary item with count
export const summarySuccess = (text: string, ...details: (number | string)[]): void =>
  console.log('  ', c.green(text.replace(/\{[^}]+\}/g, () => c.darkGreen(details.shift() ?? ''))))

// summary warning
export const summaryWarn = (text: string, ...details: (number | string)[]): void =>
  console.log('  ', chalk.yellowBright.bold(text.replace(/\{[^}]+\}/g, () => chalk.yellow(details.shift() ?? ''))))