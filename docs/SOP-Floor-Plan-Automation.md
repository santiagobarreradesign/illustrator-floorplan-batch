# Standard Operating Procedure — Illustrator floor plan batch

**Purpose:** Batch supplier `.eps` / `.ai` floor plans into Working AI, RGB EPS, JPEG (1600 px long edge), and PDF using **Adobe Illustrator** on **macOS**.

**No IDE required** — shell scripts or the interactive launcher drive Illustrator.

---

## 1. Prerequisites

| Requirement | Notes |
|-------------|--------|
| **macOS** | Scripts target macOS + AppleScript. |
| **Adobe Illustrator** | Must launch; ExtendScript runs inside Illustrator. |
| **Python 3** | Used by the headless wrapper (`python3` calling `osascript`). |

---

## 2. Folder layout

Put each job under **`projects/<name>/`** with a **`supplier/`** subfolder containing source files.

Outputs are written to **`supplier`**'s parent — e.g. **`projects/my-hotel/`** gets `{CODE} Working Files AI`, `{CODE} EPS RGB Outlined`, etc.

See **`projects/README.md`**.

---

## 3. Property code

Three letters, uppercase (e.g. `ABC`, `MHT`). Used in output folder names and filenames.

---

## 4. Run methods

### A — Interactive launcher

Open **`floorplan-automation/run-batch-interactive.command`** ? enter code ? choose **`supplier`** folder.

### B — Terminal

```bash
bash "/path/to/floorplan-automation/run-batch-now.sh" \
  "/path/to/projects/my-hotel/supplier" ABC
```

### C — Illustrator UI

**File ? Scripts ? Other Script…** ? **`floorplan-automation/FloorPlan-Batch.jsx`**

---

## 5. Dry run

```bash
RUN_FOLDER=1 bash "/path/to/floorplan-automation/run-dry-run-now.sh" \
  "/path/to/projects/my-hotel/supplier"
```

---

## 6. Validation

After a batch:

```bash
bash "/path/to/floorplan-automation/validate-spec-outputs.sh" \
  "/path/to/projects/my-hotel" ABC
```

First argument = folder containing **`ABC 1600 PXL JPEG`**, **`ABC Working Files AI`**, etc.

---

## 7. Conflicts

The script refuses to overwrite existing outputs ("Section 10"). Remove or move conflicting deliverables in the project folder, then rerun.

---

## 8. Troubleshooting

| Issue | Try |
|-------|-----|
| Illustrator does not start | Open Illustrator once; allow Automation in **Privacy & Security**. |
| Wrong output location | Pass the **`supplier`** path you intend; outputs go to its **parent**. |
| Enumeration errors | Match Illustrator version to ExtendScript APIs; update **`FloorPlan-Batch.jsx`** if needed. |

---

## 9. Ship only tooling

This repo should contain **`FloorPlan-Batch.jsx`** and runners — not client artwork. Add **`supplier`** files locally; use **`.gitignore`** if needed.
