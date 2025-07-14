# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Mintlify documentation site for API documentation. The repository contains MDX files that define documentation pages, API reference endpoints, and configuration for the Mintlify documentation platform.

## Development Commands

### Local Development
```bash
# Install Mintlify CLI globally
npm i -g mintlify

# Start local development server (runs on http://localhost:3000)
mintlify dev

# Use custom port
mintlify dev --port 3333

# Update CLI to latest version
npm i -g mintlify@latest
```

### Validation
```bash
# Check for broken links in documentation
mintlify broken-links

# Fix dependencies if dev server fails
mintlify install
```

## Architecture

### Core Configuration
- `docs.json`: Main configuration file defining navigation, theme, colors, and site structure
- Navigation is organized into tabs: "Guides" and "API Reference"
- Theme colors: primary (#16A34A), light (#07C983), dark (#15803D)

### Content Structure
- `index.mdx`: Homepage with hero images and card-based navigation
- `quickstart.mdx`: Getting started guide with setup instructions
- `development.mdx`: Development workflow and troubleshooting
- `essentials/`: Core documentation features (markdown, code blocks, images, etc.)
- `api-reference/`: API documentation and endpoint examples
- `api-reference/openapi.json`: OpenAPI specification for Plant Store API
- `snippets/`: Reusable content snippets

### File Organization
- All documentation pages are `.mdx` files with frontmatter
- Images stored in `/images/` directory
- Logo assets in `/logo/` (light.svg, dark.svg)
- Favicon: `/favicon.svg`

### Navigation Structure
The site uses a two-tab structure:
1. **Guides Tab**: Get Started group + Essentials group
2. **API Reference Tab**: API Documentation + Endpoint Examples

## Content Guidelines

### MDX Format
- All content files use MDX with YAML frontmatter
- Required frontmatter: `title`, `description`
- Supports React components like `<Card>`, `<CardGroup>`, `<Accordion>`, etc.
- Image components should include both light and dark variants

### API Documentation
- Uses OpenAPI specification in `/api-reference/openapi.json`
- Authentication via Bearer tokens
- Sample API endpoints for a Plant Store
- Endpoint examples in `/api-reference/endpoint/` directory

## Deployment

Changes are automatically deployed via GitHub App integration. The deployment process:
1. Push changes to the default branch
2. GitHub App automatically deploys to production
3. Check deployment status on Mintlify dashboard

## Prerequisites

- Node.js version 19 or higher
- Mintlify CLI installed globally
- Use `docs.json` configuration (not legacy `mint.json`)