#!/usr/bin/env bash
# Ermittelt, welche Add-ons ein Workflow-Lauf prüfen muss, und gibt sie als JSON-Array aus,
# z. B. ["budget_tracker"]. Ein Add-on ist jedes Verzeichnis im Repository-Root mit config.yaml.
#
# Regeln:
#   - ADDONS gesetzt (workflow_call, z. B. aus dem Release-Workflow) → genau diese Add-ons
#   - workflow_dispatch, unbekannter Basis-Commit oder Änderung an .github/ → alle Add-ons
#   - sonst → nur Add-ons, in deren Verzeichnis sich Dateien geändert haben
#
# Erwartet: EVENT_NAME, optional ADDONS, BASE_SHA, HEAD_SHA (vollständige Git-Historie nötig).
set -euo pipefail

all_addons() {
  for config in */config.yaml; do
    [ -f "$config" ] && dirname "$config"
  done
}

to_json() {
  jq --raw-input --slurp --compact-output 'split("\n") | map(select(length > 0))'
}

if [ -n "${ADDONS:-}" ]; then
  echo "$ADDONS" | jq --compact-output '.'
  exit 0
fi

base="${BASE_SHA:-}"
if [ "${EVENT_NAME:-}" = "workflow_dispatch" ] || [ -z "$base" ] \
  || [[ "$base" =~ ^0+$ ]] || ! git cat-file -e "$base^{commit}" 2>/dev/null; then
  all_addons | to_json
  exit 0
fi

changed=$(git diff --name-only "$base" "${HEAD_SHA:-HEAD}")
if grep -q '^\.github/' <<<"$changed"; then
  all_addons | to_json
  exit 0
fi

all_addons | while read -r addon; do
  if grep -q "^$addon/" <<<"$changed"; then echo "$addon"; fi
done | to_json
