#!/bin/bash
# Double-click in Finder to run the floor plan batch (macOS).
# Prompts for property code and supplier folder, then calls run-batch-now.sh.

set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE"

if [[ ! -f "$HERE/run-batch-now.sh" ]]; then
  osascript -e 'display alert "Missing run-batch-now.sh" message "Put this file in the floorplan-automation folder next to run-batch-now.sh." as critical'
  exit 1
fi

CODE=$(osascript <<'APPLESCRIPT'
tell application "System Events" to activate
set r to display dialog "Property code (3 letters, e.g. ABC):" default answer "ABC" buttons {"Cancel", "OK"} default button "OK"
return text returned of r
APPLESCRIPT
) || exit 0

CODE=$(echo "$CODE" | tr '[:lower:]' '[:upper:]' | tr -d '[:space:]')
if [[ -z "$CODE" ]]; then
  osascript -e 'display alert "Empty code" message "Enter a property code (e.g. ABC)." as warning'
  exit 1
fi

SUPPLIER=$(osascript <<'APPLESCRIPT'
POSIX path of (choose folder with prompt "Select supplier folder (e.g. projects//supplier)")
APPLESCRIPT
) || exit 0

SUPPLIER=$(echo "$SUPPLIER" | tr -d '\r')
SUPPLIER="${SUPPLIER%/}"

echo ""
echo "=== Floor plan batch ==="
echo "Property code: $CODE"
echo "Supplier folder:"
echo "$SUPPLIER"
echo ""

bash "$HERE/run-batch-now.sh" "$SUPPLIER" "$CODE"

echo ""
read -r -p "Press Enter to close…" _
