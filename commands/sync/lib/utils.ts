
import * as cliProgress from 'cli-progress'
import chalk from 'chalk'

// Constants
export const API_BASE_URL = 'https://api.blockworks.com/v1'
export const API_KEY = process.env.BWR_API_KEY
export const OUTPUT_DIR = './api-reference/metrics'

// API Error tracking
export const apiErrors: Array<{url: string, status: number, message: string[]}> = []

// Colors
export const colors = {
  green: chalk.greenBright,
  darkGreen: chalk.green,
  number: chalk.yellowBright.bold,
  duration: chalk.hex('#0099FF'),
  header: chalk.greenBright.bold,
  subHeader: chalk,
  muted: chalk.grey,
  bold: chalk.bold,
  error: chalk.red,
  warning: chalk.yellowBright.bold,
  yellow: chalk.yellow,
  white: chalk.white.bold,
  adding: chalk.hex('#33AA33'),
  fail: chalk.redBright,
}

// Progress bar factory
export const createProgressBar = () =>
  new cliProgress.SingleBar({
    format: '   Progress |{bar}| {percentage}% || {value}/{total} || ETA: {eta}s',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true
  }, cliProgress.Presets.legacy)

export const toTitleCase = (str: string): string => 
  str.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

export const escapeYamlString = (str: string): string => 
  str.replace(/"/g, '\\"')

export const stripUpdatedFields = (metrics: any[]): any[] =>
  metrics.map(({ updated_at, ...rest }) => rest)

export const metricsEqual = (metrics1: any[], metrics2: any[]): boolean => {
  const stripped1 = stripUpdatedFields(metrics1)
  const stripped2 = stripUpdatedFields(metrics2)
  return JSON.stringify(stripped1.sort((a, b) => a.id - b.id)) === 
         JSON.stringify(stripped2.sort((a, b) => a.id - b.id))
}