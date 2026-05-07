#!/usr/bin/env bash
# Sanity-check FloorPlan-Batch.jsx API symbols (no artwork / PDF required).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
JSX="$(dirname "$0")/FloorPlan-Batch.jsx"
FAIL=0

echo "=== Floor plan batch script checks ==="
echo "ROOT: $ROOT"
echo "JSX: $JSX"
echo ""

if [[ ! -f "$JSX" ]]; then
  echo "FAIL: JSX not found."
  exit 1
fi

require_jsx() {
  local needle="$1"
  if grep -Fq "$needle" "$JSX"; then
    echo "OK  JSX references: $needle"
  else
    echo "FAIL JSX missing: $needle"
    FAIL=1
  fi
}

require_jsx "DocumentColorSpace.RGB"
require_jsx "EPSSaveOptions"
require_jsx "outlineAllText"
require_jsx "outlineAllTextSkippingLayer"
require_jsx "isolateLowestCaptionLayer"
require_jsx "CAPTION_LAYER_MARK"
require_jsx "RulerUnits.Pixels"
require_jsx "ExportOptionsJPEG"
require_jsx "fitArtboardToSelectedArt"
require_jsx "PDFSaveOptions"
require_jsx "blackConversionPass"
require_jsx "scaleLongEdgeGrouped"
require_jsx "deleteCaptionForJPEG"
require_jsx "describeCaptionPreview"
require_jsx "runHeadlessIfConfigured"
require_jsx "fullBatch"
require_jsx "assertTargetNew"
require_jsx "assertNoForbiddenOffBlack"

JSX_PRES="$(dirname "$0")/Presentation-PDF.jsx"
if [[ -f "$JSX_PRES" ]]; then
  echo ""
  echo "=== Presentation-PDF.jsx checks ==="
  require_pres() {
    local needle="$1"
    if grep -Fq "$needle" "$JSX_PRES"; then
      echo "OK  Presentation JSX: $needle"
    else
      echo "FAIL Presentation JSX missing: $needle"
      FAIL=1
    fi
  }
  require_pres "presentationBatch"
  require_pres "buildOneFromTemplate"
  require_pres "findTitleFrame"
  require_pres "FP_PLAN"
  require_pres "DocumentPreset"
  require_pres "fitPlacedInRect"
else
  echo ""
  echo "SKIP Presentation-PDF.jsx not found."
fi

echo ""
echo "=== Adobe Illustrator (optional) ==="
if [[ "$(uname)" == "Darwin" ]]; then
  FOUND=""
  for app in \
    "/Applications/Adobe Illustrator 2025/Adobe Illustrator.app" \
    "/Applications/Adobe Illustrator 2024/Adobe Illustrator.app" \
    "/Applications/Adobe Illustrator 2023/Adobe Illustrator.app"; do
    if [[ -d "$app" ]]; then
      FOUND="$app"
      break
    fi
  done
  if [[ -n "$FOUND" ]]; then
    echo "OK  Illustrator found: $FOUND"
    echo "    Run from Illustrator: File > Scripts > Other Script..."
    echo "    $JSX"
  else
    echo "SKIP No Illustrator app in standard locations (install to run end-to-end)."
  fi
else
  echo "SKIP Illustrator GUI check is macOS-specific."
fi

echo ""
if [[ "$FAIL" -eq 0 ]]; then
  echo "All automated checks passed."
  exit 0
else
  echo "Some checks failed."
  exit 1
fi
