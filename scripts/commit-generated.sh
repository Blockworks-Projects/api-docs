#!/bin/bash

# Script to stage only generated files from sync command

echo "🤖 Staging generated files..."

# Clear current staging area
git reset --quiet

# Add only generated files
git add \
  api-reference/ \
  docs.json \
  openapi.json \
  metrics.json \
  assets.json \
  projects-supported.mdx

# Check if there are any changes staged
staged_files=$(git diff --cached --name-only)
if [ -z "$staged_files" ]; then
  echo "❌ No generated files to stage"
  exit 0
fi

# Show what is now staged
echo "📋 Generated files staged:"
echo "$staged_files" | sed 's/^/  /'

# Check if there are still unstaged changes and stash them automatically
unstaged_files=$(git diff --name-only)
if [ -n "$unstaged_files" ]; then
  echo ""
  echo "📦 Stashing remaining unstaged files:"
  echo "$unstaged_files" | sed 's/^/  /'
  git stash push --quiet -m "unstaged-changes-$(date +%s)"
fi

echo ""
echo "📊 Current status:"
git status

echo ""
echo "✅ Ready to commit"