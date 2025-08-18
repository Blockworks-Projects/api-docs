import chalk from 'chalk'

// Configuration
export const API_BASE_URL = 'https://api.blockworks.com/v1'
export const API_KEY = process.env.BWR_API_KEY
export const OUTPUT_DIR = './api-reference/metrics'

export const colors = {
  green: chalk.greenBright,
  darkGreen: chalk.green,
  number: chalk.yellowBright.bold,
  duration: chalk.hex('#0099FF'),
  header: chalk.greenBright.bold,
  subHeader: chalk.magentaBright.bold,
  muted: chalk.grey,
  bold: chalk.bold,
  error: chalk.red,
  warning: chalk.yellowBright.bold,
  yellow: chalk.yellow,
  white: chalk.white.bold,
  adding: chalk.hex('#33AA33'),
}