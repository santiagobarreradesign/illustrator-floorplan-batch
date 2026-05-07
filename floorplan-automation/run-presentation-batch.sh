#!/usr/bin/env bash
# Branded presentation PDFs (letter landscape): title + logo + placed EPS/AI.
# Usage:
#   ./run-presentation-batch.sh "/path/to/eps-folder" "/path/to/pdf-output-folder" "/path/to/logo.png" ["/path/to/template.ai"]

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
JSX="$SCRIPT_DIR/Presentation-PDF.jsx"
CFG="$SCRIPT_DIR/presentation-headless-run.txt"
OUT="$SCRIPT_DIR/presentation-headless-result.txt"

EPS="${1:?Usage: $0 /path/to/eps-folder /path/to/pdf-output-folder /path/to/logo [template.ai]}"
PDF_OUT="${2:?Usage: $0 /path/to/eps-folder /path/to/pdf-output-folder /path/to/logo [template.ai]}"
LOGO="${3:?Usage: $0 /path/to/eps-folder /path/to/pdf-output-folder /path/to/logo [template.ai]}"
TEMPLATE="${4:-}"

[[ -d "$EPS" ]] || { echo "Not a folder: $EPS"; exit 1; }
[[ -f "$LOGO" ]] || { echo "Logo not found: $LOGO"; exit 1; }
if [[ -n "$TEMPLATE" ]]; then
  [[ -f "$TEMPLATE" ]] || { echo "Template not found: $TEMPLATE"; exit 1; }
fi
mkdir -p "$PDF_OUT"

rm -f "$CFG" "$OUT"
printf 'presentationBatch\t%s\t%s\t%s\t%s\n' "$EPS" "$PDF_OUT" "$LOGO" "$TEMPLATE" > "$CFG"

export ILLUSTRATOR_JSX="$JSX"
python3 <<'PY'
import os
import subprocess

jsx = os.environ["ILLUSTRATOR_JSX"]
escaped = jsx.replace("\\", "\\\\").replace('"', '\\"')
applescript = (
    "with timeout of 7200 seconds\n"
    'tell application "Adobe Illustrator"\n'
    "  activate\n"
    f'  do javascript (POSIX file "{escaped}")\n'
    "end tell\n"
    "end timeout\n"
)
subprocess.run(["osascript", "-e", applescript], check=True, stdout=subprocess.DEVNULL)
PY

if [[ -f "$OUT" ]]; then
  cat "$OUT"
else
  echo "Expected $OUT was not written."
  exit 1
fi
