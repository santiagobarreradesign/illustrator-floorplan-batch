#!/usr/bin/env bash
# Section 9 — subset validation: JPEG long edge = 1600; loose pairing AI/JPEG/PDF/EPS.
# Usage: validate-spec-outputs.sh /path/to/ROOT_DIR PROPERTY_CODE

set -euo pipefail
ROOT="${1:?ROOT_DIR required}"
CODE="${2:?PROPERTY_CODE required}"

JPG_DIR="$ROOT/${CODE} 1600 PXL JPEG"
AI_DIR="$ROOT/${CODE} Working Files AI"
EPS_DIR="$ROOT/${CODE} EPS RGB Outlined"
PDF_DIR="$ROOT/${CODE} FP PDF"

FAIL=0

echo "=== Spec validation (ROOT=$ROOT CODE=$CODE) ==="

for d in "$JPG_DIR" "$AI_DIR" "$EPS_DIR" "$PDF_DIR"; do
  if [[ ! -d "$d" ]]; then
    echo "FAIL: missing folder: $d"
    FAIL=1
  fi
done
[[ "$FAIL" -eq 0 ]] || exit 1

shopt -s nullglob
for f in "$JPG_DIR"/*.jpg; do
  W=$(sips -g pixelWidth "$f" 2>/dev/null | awk '/pixelWidth/ {print $2}')
  H=$(sips -g pixelHeight "$f" 2>/dev/null | awk '/pixelHeight/ {print $2}')
  LONG=$W
  [[ "$H" -gt "$W" ]] && LONG=$H
  base=$(basename "$f")
  if [[ "${LONG:-0}" -ne 1600 ]]; then
    echo "FAIL: JPEG long edge != 1600 (${LONG}px): $base (${W}x${H})"
    FAIL=1
  else
    echo "OK  JPEG long edge 1600: $base (${W}x${H})"
  fi
done

for ai in "$AI_DIR"/*.ai; do
  [[ -f "$ai" ]] || continue
  stem=$(basename "$ai" .ai)
  eps=$(echo "$stem" | perl -pe 's/-(\d+)$/-RGB-$1/')
  jpg="$JPG_DIR/${stem}.jpg"
  pdf="$PDF_DIR/${stem}.pdf"
  epsf="$EPS_DIR/${eps}.eps"
  if [[ ! -f "$jpg" ]]; then
    echo "FAIL: missing JPEG for $stem"
    FAIL=1
  fi
  if [[ ! -f "$pdf" ]]; then
    echo "FAIL: missing PDF for $stem"
    FAIL=1
  fi
  if [[ ! -f "$epsf" ]]; then
    echo "WARN: missing EPS (expected ${eps}.eps) for $stem"
  fi
done

if [[ "$FAIL" -eq 0 ]]; then
  echo "=== All checks passed ==="
  exit 0
else
  echo "=== Validation failed ==="
  exit 1
fi
