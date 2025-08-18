# Blockworks API Documentation

A modern documentation site for Blockworks API metrics, built with [Mintlify](https://mintlify.com) and automated metric synchronization.

# Quick Start

### Prerequisites

- [Bun](https://bun.sh) runtime

### Installation

```bash
# Clone the repository
git clone git@github.com:Blockworks-Projects/api-docs.git
cd api-docs

# Install dependencies
bun install
```

### Development

```bash
# Start the development server
bun dev
```

The documentation site will be available at `http://localhost:3333`.

### Sync Metrics

```bash
# Synchronize metrics from API
bun sync
```

# Available Commands

### `bun dev`
Starts the Mintlify development server on port 3333 (to avoid conflicting with other services on 3000). This provides live reloading and preview of documentation changes.

### `bun sync`
Executes the complete metric synchronization process:

- **Fetches** all metrics from the Blockworks API
- **Filters** out metrics with incomplete descriptions
- **Generates** individual metric documentation pages
- **Creates** a comprehensive metrics catalog
- **Updates** navigation structure in `docs.json`
- **Synchronizes** OpenAPI specification with standardized examples
- **Links** USD and native currency metric pairs
- **Reports** any API errors or omitted metrics

<img width="621" height="553" alt="image" src="https://github.com/user-attachments/assets/0a7d9eae-23dd-41e5-946b-597cf844759b" />

## Why [Bun](https://bun.sh)?

- **Native TypeScript Support**: No additional transpilation setup required
- **Built-in Package Manager**: Fast dependency installation and management
- **Single Runtime**: Eliminates the need for separate Node.js and npm/yarn setup
- **Performance**: Significantly faster execution compared to Node.js
- **Simplicity**: Everything needed is included out of the box
