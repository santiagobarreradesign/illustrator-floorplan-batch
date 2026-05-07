#!/usr/bin/env bash
# Runs a headless Illustrator dry-run (no dialogs) via headless-run.txt + FloorPlan-Batch.jsx.
# Usage:
#   ./run-dry-run-now.sh                          # first .eps under parent folder
#   ./run-dry-run-now.sh "/path/to/file.eps"
#   RUN_FOLDER=1 ./run-dry-run-now.sh "/path/to/folder"   # batch dry-run all eps/ai in folder

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
JSX="$SCRIPT_DIR/FloorPlan-Batch.jsx"
CFG="$SCRIPT_DIR/headless-run.txt"
OUT="$SCRIPT_DIR/headless-result.txt"

rm -f "$CFG" "$OUT"

if [[ "${RUN_FOLDER:-}" == "1" ]]; then
  FOLDER="${1:?Pass folder path as first argument}"
  [[ -d "$FOLDER" ]] || { echo "Not a folder: $FOLDER"; exit 1; }
  printf 'dryRunFolder\t%s\n' "$FOLDER" > "$CFG"
else
  EPS="${1:-}"
  if [[ -z "$EPS" ]]; then
    EPS="$(find "$ROOT" -type f -iname '*.eps' 2>/dev/null | head -1 || true)"
  fi
  [[ -n "$EPS" && -f "$EPS" ]] || { echo "No EPS file found. Pass path to a .eps file."; exit 1; }
  printf 'dryRunFile\t%s\n' "$EPS" > "$CFG"
fi

export ILLUSTRATOR_JSX="$JSX"
python3 <<'PY'
import os
import subprocess

jsx = os.environ["ILLUSTRATOR_JSX"]
escaped = jsx.replace("\\", "\\\\").replace('"', '\\"')
applescript = (
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
  echo "Expected $OUT was not written. Is Illustrator installed, and scripting allowed?"
  exit 1
fi
