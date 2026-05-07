#!/bin/bash
# Double-click this file (repo root) to run the batch — forwards to the interactive launcher.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
exec bash "$ROOT/floorplan-automation/run-batch-interactive.command"
