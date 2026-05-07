# Project workspaces

Each batch should live in its own folder:

```
projects/
  your-project-name/
    supplier/              ? put supplier .eps / .ai here (only folder you pass to the script)
    ABC Source Files/      ? generated (copy of supplier)
    ABC Working Files AI/  ? generated
    ABC EPS RGB Outlined/
    ABC 1600 PXL JPEG/
    ABC FP PDF/
    ABC FP Versions/
```

Replace **`ABC`** with your **three-letter property code**.

The script writes deliverables to **`supplier`**'s parent folder, so keeping `supplier/` inside **`projects/your-project/`** keeps everything for that job in one place.

## Example folder

This repo includes **`projects/example/supplier/`** (empty except `.gitkeep`). Copy the structure for a new property:

```bash
mkdir -p projects/my-hotel/supplier
# drop .eps files into supplier/

bash floorplan-automation/run-batch-now.sh "$(pwd)/projects/my-hotel/supplier" MHT
```

Validation:

```bash
bash floorplan-automation/validate-spec-outputs.sh "$(pwd)/projects/my-hotel" MHT
```
