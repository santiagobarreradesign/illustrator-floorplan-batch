#!/usr/bin/env bash
# Runs full FS pipeline (Working AI, EPS, JPEG, PDF) headlessly via Illustrator.
# Usage:
#   ./run-batch-now.sh "/path/to/supplier/folder" ABC

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
JSX="$SCRIPT_DIR/FloorPlan-Batch.jsx"
CFG="$SCRIPT_DIR/headless-run.txt"
OUT="$SCRIPT_DIR/headless-result.txt"

FOLDER="${1:?Usage: $0 /path/to/supplier/folder PROPERTYCODE}"
CODE="${2:?Usage: $0 /path/to/supplier/folder PROPERTYCODE}"

[[ -d "$FOLDER" ]] || { echo "Not a folder: $FOLDER"; exit 1; }

rm -f "$CFG" "$OUT"
printf 'fullBatch\t%s\t%s\n' "$FOLDER" "$CODE" > "$CFG"

export ILLUSTRATOR_JSX="$JSX"
python3 <<'PY'
import os
import subprocess

jsx = os.environ["ILLUSTRATOR_JSX"]
escaped = jsx.replace("\\", "\\\\").replace('"', '\\"')
applescript = (
    # Large batches exceed the default ~2min AppleEvent timeout (-1712).
    'with timeout of 7200 seconds\n'
    'tell application "Adobe Illustrator"\n'
    '  activate\n'
    f'  do javascript (POSIX file "{escaped}")\n'
    'end tell\n'
    'end timeout\n'
)
subprocess.run(["osascript", "-e", applescript], check=True, stdout=subprocess.DEVNULL)
PY

if [[ -f "$OUT" ]]; then
  cat "$OUT"
else
  echo "Expected $OUT was not written."
  exit 1
fi
