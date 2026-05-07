# Team rollout — easiest path to run batches

Share **[the GitHub repo](https://github.com/santiagobarreradesign/illustrator-floorplan-batch)** (or a ZIP download) so everyone uses the **same scripts**.

---

## One-time setup per Mac

| Step | What to do |
|------|------------|
| 1 | **macOS** only (this workflow does not run on Windows for Illustrator automation). |
| 2 | Install **Adobe Illustrator** (Creative Cloud). Open it once so macOS can prompt for permissions later. |
| 3 | **Get the project:** clone or download ZIP from GitHub → unzip somewhere stable (e.g. `~/Studio/illustrator-floorplan-batch`). Avoid iCloud-only synced folders if Illustrator hangs on network delays. |
| 4 | First launch of scripts: if macOS blocks unsigned scripts, **Right‑click → Open** on **`Launch Floorplan Batch.command`** once, then click **Open**. |

**Python 3** ships on recent macOS; no separate install needed for the thin launcher.

---

## Easiest workflow for designers / PMs

### Option A — Double‑click (recommended)

1. Put supplier **`.eps` / `.ai`** files into  
   **`projects/<job-name>/supplier/`**  
   (create folders if needed, e.g. `projects/downtown-hotel/supplier/`).

2. Double‑click **`Launch Floorplan Batch.command`** at the **top level** of the project folder.

3. Enter the **property code** — three letters your team agrees on (e.g. `HWD` for “hotel-wide default”). Same code ⇒ same folder names every run.

4. When Finder asks, pick the **`supplier`** folder you filled in step 1.

5. Wait until Terminal prints the summary. Illustrator will open automatically.

### Option B — Terminal (copy‑paste)

From inside the repo folder:

```bash
bash floorplan-automation/run-batch-now.sh "$PWD/projects/downtown-hotel/supplier" HWD
```

Replace path and code with your job.

---

## Where outputs go

Outputs appear **next to** `supplier/` — inside the same project folder, e.g.:

`projects/downtown-hotel/HWD Working Files AI/`,  
`HWD EPS RGB Outlined/`, `HWD 1600 PXL JPEG/`, `HWD FP PDF/`, etc.

---

## GitHub access for the team

- **Collaborators:** Repo → **Settings → Collaborators** → invite teammates by GitHub username (works well if everyone uses Git `pull` to get updates).
- **Non‑Git users:** They can use **Code → Download ZIP** whenever you announce an update; replace their old folder or merge only `floorplan-automation/` + docs.

---

## Common issues

| Problem | Fix |
|---------|-----|
| “Illustrator can’t be opened” / scripts blocked | **System Settings → Privacy & Security → Automation** — allow Terminal (or Cursor) to control Illustrator. |
| “Section 10” / conflict | Script won’t overwrite existing files. Move or delete old outputs in that job folder, then run again. |
| Wrong folder picked | They must choose the **`supplier`** folder that contains the EPS files, not the repo root. |

Full detail: **[SOP-Floor-Plan-Automation.md](SOP-Floor-Plan-Automation.md)**.  
Optional **presentation PDFs** (title + logo + plan): see the **Quick start** section in the root **[README.md](../README.md)**.

---

## What you (lead) should standardize

1. **Naming:** One property code per brand/site (`ABC`, `HWD`, …). Put it in your internal wiki.
2. **Folder convention:** Always `projects/<site>/supplier/` so paths stay predictable.
3. **Updates:** When you change `FloorPlan-Batch.jsx`, announce **“pull latest or re-download ZIP”** so everyone stays in sync.
