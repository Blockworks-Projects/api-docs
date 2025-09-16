#!/bin/bash

# Script to stage only code changes, excluding generated files

echo "🔧 Staging code changes only..."

# Clear current staging area
git reset --quiet

# Stash any generated files that might be modified
git stash push --quiet -m "temp-stash-generated" -- \
  api-reference/ \
  docs.json \
  openapi.json \
  metrics.json \
  assets.json \
  projects-supported.mdx \
  sync_output.txt \
  validation_report.md 2>/dev/null || true

# Add only code and infrastructure files
git add \
  .github/ \
  commands/ \
  package.json \
  tsconfig.json \
  CLAUDE.md \
  README.md \
  scripts/ \
  authentication.mdx \
  getting-started.mdx \
  index.mdx \
  understanding-pagination.mdx \
  usage.mdx \
  styles.css

# Check if there are any changes staged
staged_files=$(git diff --cached --name-only)
if [ -z "$staged_files" ]; then
  echo "❌ No code changes to stage"
  # Restore stashed files
  git stash pop --quiet 2>/dev/null || true

  # Still check for unstaged files and stash them (but only generated files)
  unstaged_files=$(git diff --name-only)
  if [ -n "$unstaged_files" ]; then
    echo ""
    echo "📦 Stashing remaining unstaged files:"
    echo "$unstaged_files" | sed 's/^/  /'

    # Filter to only stash generated files, not code files
    generated_files=""
    for file in $unstaged_files; do
      case "$file" in
        api-reference/*|docs.json|openapi.json|metrics.json|assets.json|projects-supported.mdx|sync_output.txt|validation_report.md)
          generated_files="$generated_files $file"
          ;;
      esac
    done

    if [ -n "$generated_files" ]; then
      git stash push --quiet -m "unstaged-changes-$(date +%s)" -- $generated_files
    fi
  fi

  echo ""
  echo "📊 Current status:"
  git status

  exit 0
fi

# Show what is now staged
echo "📋 Code files staged:"
echo "$staged_files" | sed 's/^/  /'

# Restore stashed generated files
git stash pop --quiet 2>/dev/null || true

# Check if there are still unstaged changes and stash them automatically (but not code files)
unstaged_files=$(git diff --name-only)
if [ -n "$unstaged_files" ]; then
  echo ""
  echo "📦 Stashing remaining unstaged files:"
  echo "$unstaged_files" | sed 's/^/  /'

  # Filter to only stash generated files, not code files
  generated_files=""
  for file in $unstaged_files; do
    case "$file" in
      api-reference/*|docs.json|openapi.json|metrics.json|assets.json|projects-supported.mdx|sync_output.txt|validation_report.md)
        generated_files="$generated_files $file"
        ;;
    esac
  done

  if [ -n "$generated_files" ]; then
    git stash push --quiet -m "unstaged-changes-$(date +%s)" -- $generated_files
  fi
fi

echo ""
echo "📊 Current status:"
git status

echo ""
echo "✅ Ready to commit"