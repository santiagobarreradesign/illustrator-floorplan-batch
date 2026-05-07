# Testing sandbox (isolated automation)

This folder is a **full copy** of **`../floorplan-automation/`** for experiments—especially **presentation PDFs** and batch tweaks—**without changing production scripts** at the repo root.

| Location | Use |
|----------|-----|
| **`floorplan-automation/`** (repo root) | Stable / team / ship — keep as the source of truth. |
| **`testing/floorplan-automation/`** | Edit and run here when prototyping. Merge changes back to root only when ready. |

## Commands (from repo root)

**Main batch (testing copy):**

```bash
bash testing/floorplan-automation/run-batch-now.sh "projects/your-project/supplier" ABC
```

**Presentation PDFs (testing copy):**

```bash
bash testing/floorplan-automation/run-presentation-batch.sh \
  "/path/to/eps-folder" \
  "/path/to/pdf-out" \
  "/path/to/logo.png" \
  "/optional/template.ai"
```

**Double-click (testing):** use **`Launch Floorplan Batch (Testing).command`** in the repo root (forwards to `testing/floorplan-automation/run-batch-interactive.command`).

Headless temp files (`headless-run.txt`, etc.) live under **`testing/floorplan-automation/`** so they do not clash with production’s `floorplan-automation/`.

## Syncing

The sandbox was created with **`rsync`** from production. To refresh the testing copy from root (overwrites testing changes):

```bash
rsync -a --delete \
  --exclude 'headless-result.txt' --exclude 'headless-run.txt' \
  --exclude 'presentation-headless-result.txt' --exclude 'presentation-headless-run.txt' \
  floorplan-automation/ testing/floorplan-automation/
```

Use **`--delete`** only if you intend to drop local testing edits.
