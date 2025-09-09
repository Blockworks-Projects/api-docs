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
export const warn = (...args: any[]): void => console.log(chalk.yellowBright.bold('\n   ⚠️', ...args))

export const warnDetail = (...args: any[]): void => console.log(chalk.yellow.bold('   ', ...args))

// helper function to replace {count} with the count
// export const withCount = (text: string, count: number): string => text.replace('{count}', c.number(count))

export const withCount = (text: string, ...values: number[]): string =>
  text.replace(/\{[^}]+\}/g, () => chalk.yellowBright.bold(values.shift() ?? ''))