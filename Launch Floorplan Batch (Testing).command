#!/bin/bash
# Double-click: runs the floor plan batch using the testing/ sandbox (not production).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
exec bash "$ROOT/testing/floorplan-automation/run-batch-interactive.command"
