# Illustrator floor plan batch tool

macOS batch pipeline: supplier **`.eps` / `.ai`** floor plans become **Working `.ai`**, **RGB outlined EPS**, **JPEG** (1600 px long edge), and **PDF**. Driven by **Adobe Illustrator** (ExtendScript) and small shell helpers. No IDE required.

**Repository:** [github.com/santiagobarreradesign/illustrator-floorplan-batch](https://github.com/santiagobarreradesign/illustrator-floorplan-batch)

## What it does

| Stage | Output |
|--------|--------|
| Working AI | Editable `.ai` master |
| EPS | RGB, outlined type, optional black-ink normalization, pixel rulers |
| JPEG | Long edge 1600 px, caption layer removed per script rules |
| PDF | From Working AI |
| Presentation PDF | Optional branded one-pager: title + logo + outlined EPS (`Presentation-PDF.jsx`) |

Headless mode: `run-batch-now.sh` drives Illustrator via AppleScript so batches can run from Terminal or a double-click launcher.

## Requirements

- macOS  
- Adobe Illustrator (recent CC)  
- Python 3 (for the `osascript` wrapper; usually pre-installed)

## Quick start

1. Put supplier files in **`projects/<your-project>/supplier/`** (see **`projects/README.md`**).

2. Run from the repo root:

```bash
bash floorplan-automation/run-batch-now.sh "projects/example/supplier" ABC
```

Use a **three-letter property code** (for example `ABC`). Outputs appear in the **parent** of `supplier/`.

3. **Easiest:** double-click **`Launch Floorplan Batch.command`** at the repo root. Enter the property code and choose the **`supplier`** folder when Finder asks.

   - First run: **Right-click**, choose **Open**, if Gatekeeper blocks the script.

4. Optional validation:

```bash
bash floorplan-automation/validate-spec-outputs.sh "projects/your-project" ABC
```

5. Optional JSX check (no artwork):

```bash
bash floorplan-automation/test-pipeline.sh
```

### Optional: presentation PDFs (title + logo + plan)

After you have **`CODE EPS RGB Outlined`** from the main batch:

```bash
bash floorplan-automation/run-presentation-batch.sh \
  "projects/your-project/CODE EPS RGB Outlined" \
  "projects/your-project/CODE Presentation PDFs" \
  "floorplan-automation/assets/your-logo.png"
```

Optional **4th argument:** branded **`.ai`** template. See **`floorplan-automation/templates/README.md`** (`FP_TITLE`, `FP_LOGO`, `FP_PLAN`).

To experiment without changing production scripts, use **`testing/floorplan-automation/`** and **`Launch Floorplan Batch (Testing).command`** (see **`testing/README.md`**).

## For your team

Start with **[docs/TEAM.md](docs/TEAM.md)**.

## Repository layout

| Path | Contents |
|------|----------|
| **`Launch Floorplan Batch.command`** | Double-click: production batch |
| **`Launch Floorplan Batch (Testing).command`** | Double-click: **`testing/`** sandbox only |
| **`floorplan-automation/`** | Production scripts and runners |
| **`testing/floorplan-automation/`** | Sandbox copy for experiments |
| **`floorplan-automation/templates/`** | Presentation **`.ai`** template naming |
| **`projects/`** | Workspaces; **`projects/example/supplier/`** is the template |
| **`docs/`** | **[TEAM.md](docs/TEAM.md)**, technical SOP, GitHub how-to |

## Docs

- **[docs/TEAM.md](docs/TEAM.md)** -- Designers and PMs: setup, double-click flow, outputs, troubleshooting  
- **[docs/SOP-Floor-Plan-Automation.md](docs/SOP-Floor-Plan-Automation.md)** -- Full procedure  
- **[docs/GITHUB-PUBLISH.md](docs/GITHUB-PUBLISH.md)** -- Git and GitHub  

## License

MIT -- see **[LICENSE](LICENSE)**. Artwork you process remains yours; this repository publishes **tooling only**.
