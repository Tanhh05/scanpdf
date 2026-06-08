#!/usr/bin/env bash
set -euo pipefail

STORAGE_ROOT="${STORAGE_ROOT:-storage}"
BACKUP_DIR="${BACKUP_DIR:-backups/storage}"
mkdir -p "$BACKUP_DIR"

if [[ ! -d "$STORAGE_ROOT" ]]; then
  echo "Storage root not found: $STORAGE_ROOT" >&2
  exit 1
fi

timestamp="$(date +%Y%m%d-%H%M%S)"
target="$BACKUP_DIR/scanpdf-storage-$timestamp.tar.gz"

tar -czf "$target" -C "$STORAGE_ROOT" .
echo "$target"
