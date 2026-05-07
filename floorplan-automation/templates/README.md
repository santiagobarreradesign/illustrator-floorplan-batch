# Presentation `.ai` template

Use this when you need **pixel-perfect branding** (fonts, rules, safe margins) instead of the built-in auto layout.

## Steps in Illustrator

1. Create or paste your branded letter layout (any artboard size — usually landscape letter).
2. Add placeholders the script will replace:
   - **`FP_TITLE`** — Select the **title text frame** (area or point type). In the **Layers** panel, double-click the item name and set it to exactly `FP_TITLE`.
   - **`FP_LOGO`** — Optional. Same as plan: a placed placeholder named `FP_LOGO`. If you omit this object, the batch logo file is ignored (useful if the logo is already baked into artwork — prefer the placeholder if you want a linked logo each run).
   - **`FP_PLAN`** must be a **placed** graphic (`PlacedItem`). A plain rectangle alone will not work — place any EPS, then name that placed item `FP_PLAN`.

3. Save as **`MyBrand-Presentation-Master.ai`** anywhere on disk (repo paths are fine).

4. Run:

```bash
bash floorplan-automation/run-presentation-batch.sh \
  "/path/to/EPS RGB Outlined" \
  "/path/to/output PDF folder" \
  "/path/to/logo.png" \
  "/path/to/MyBrand-Presentation-Master.ai"
```

**Notes**

- Names are **case-sensitive** (`FP_TITLE`, not `fp_title`).
- **`FP_PLAN`** is required in template mode (must be a placed graphic). **`FP_TITLE`** / **`FP_LOGO`** are optional; missing title leaves template text unchanged; missing logo skips logo replacement.
