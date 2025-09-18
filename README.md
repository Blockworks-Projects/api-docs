# Blockworks API Documentation

Blockworks API documentation site, built with [Mintlify](https://mintlify.com), using automated metric synchronization.

# Quick Start

### 0. Prerequisites

- [Bun](https://bun.sh) runtime.  _(see [explanation](#why-bun) for details)_

### 1. Installation

```bash
# Clone the repository
git clone git@github.com:Blockworks-Projects/api-docs.git
cd api-docs

# Install dependencies
bun install
```

### 2. Create `.env.local`

Follow the [guide](https://docs.blockworksresearch.com/getting-started#complete-walkthrough) to get a valid API key.

```bash
# .env.local
BWR_API_KEY="valid-research-api-key"
```

# Available Commands

### `bun dev`
Starts the Mintlify development server on port [3333](http://localhost:3333) (to avoid conflicting with other services on 3000). This provides live reloading and preview of documentation changes.

### `bun sync`
Executes the complete metric synchronization process:

- **Fetches** all metrics from the Blockworks API
- **Filters** out metrics with incomplete descriptions
- **Generates** individual metric documentation pages
- **Creates** a comprehensive metrics catalog
- **Updates** OpenAPI specification with standardized examples
- **Generates** asset expansion option pages with live examples
- **Updates** navigation structure in `docs.json`
- **Links** USD and native currency metric pairs
- **Reports** any API errors or omitted metrics

### `bun validate`
Runs validation checks without generating documentation:

- **Fetches** latest metrics from the API
- **Identifies** new, missing, or changed metrics
- **Validates** project structure and identifiers
- **Reports** API errors and validation issues
- **Outputs** comprehensive validation summary

### `bun only:code`
Stages only code changes (excludes generated files) and automatically stashes remaining unstaged files for clean commits.

### `bun only:generated`
Stages only generated files from sync command output for separate commit tracking.

<br /><br />

# GitHub Actions

### Sync Metrics Documentation
Automated workflow that runs twice weekly (Tuesday/Thursday at 9:00 AM UTC) to sync metrics documentation with the latest API changes and create pull requests with updates.

### Daily Metrics Validation
Automated workflow that runs every morning (8:00 AM UTC) to validate API metrics and sends Slack alerts when issues are detected (new/missing metrics, API errors, validation failures).

<br /><br />

# Why [Bun](https://bun.sh)?

- **Native TypeScript Support**: No additional transpilation setup required
- **Built-in Package Manager**: Fast dependency installation and management
- **Single Runtime**: Eliminates the need for separate Node.js and npm/yarn setup
- **Performance**: Significantly faster execution compared to Node.js
- **Simplicity**: Everything needed is included out of the box
