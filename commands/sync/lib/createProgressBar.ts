import * as cliProgress from 'cli-progress'

export const createProgressBar: cliProgress.SingleBar = () =>
  new cliProgress.SingleBar({
      format: '   Progress |{bar}| {percentage}% || {value}/{total} || ETA: {eta}s',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    }, cliProgress.Presets.legacy)