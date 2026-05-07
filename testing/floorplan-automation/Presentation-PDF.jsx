/*
  Branded one-page presentation PDFs: title + property logo + floor plan (EPS/AI placed).

  Letter landscape 792 x 612 pt when building from scratch (no template).

  Headless (Terminal) — presentation-headless-run.txt first line, tab-separated:
    presentationBatch<TAB>epsFolder<TAB>pdfFolder<TAB>logoFile<TAB>optionalTemplate.ai

  Optional 5th field: path to a master .ai template. If omitted or empty, layout is generated
  in code. If provided, the template must contain named items (Layers panel name):
    FP_TITLE  — TextFrame (area or point); contents replaced with slide title
    FP_LOGO   — PlacedItem; link replaced with your logo, scaled to fit the original bounds
    FP_PLAN   — PlacedItem; link replaced with the floor plan EPS, scaled to fit original bounds

  Interactive: File > Scripts > Other Script… (optional 4th dialog = template .ai).
*/

#target illustrator

(function () {
    var MARGIN_PT = 36;
    var HEADER_H_PT = 72;
    var LOGO_MAX_W_PT = 200;
    var LOGO_MAX_H_PT = 44;
    var TITLE_SIZE_PT = 13;

    var NAME_TITLE = "FP_TITLE";
    var NAME_LOGO = "FP_LOGO";
    var NAME_PLAN = "FP_PLAN";

    if (runHeadlessIfConfigured()) {
        return;
    }

    var epsFolder = Folder.selectDialog("Select folder containing .eps / .ai floor plans");
    if (!epsFolder) {
        return;
    }
    var outFolder = Folder.selectDialog("Select folder for presentation PDFs");
    if (!outFolder) {
        return;
    }
    var logoFile = File.openDialog("Select property logo (PNG, AI, EPS, or PDF)", "*.png;*.ai;*.eps;*.pdf;*.svg", false);
    if (!logoFile) {
        return;
    }
    var templateFile = File.openDialog("Optional: presentation template .ai (Cancel = auto layout)", "*.ai", false);

    var result = runPresentationBatch(epsFolder, outFolder, logoFile, templateFile && templateFile.exists ? templateFile : null);
    alert(result);

    function runHeadlessIfConfigured() {
        var scriptFile = new File($.fileName);
        var dir = scriptFile.parent;
        var cfg = new File(dir.fsName + "/presentation-headless-run.txt");
        if (!cfg.exists) {
            return false;
        }

        var resultFile = new File(dir.fsName + "/presentation-headless-result.txt");

        function writeResult(text) {
            try {
                resultFile.encoding = "UTF-8";
                resultFile.open("w");
                resultFile.write(text);
                resultFile.close();
            } catch (e0) {}
        }

        var raw = "";
        try {
            cfg.open("r");
            raw = cfg.read();
            cfg.close();
            try {
                cfg.remove();
            } catch (eRm) {}
        } catch (eRead) {
            writeResult("ERROR: could not read presentation-headless-run.txt\n" + eRead.message);
            return true;
        }

        var line = String(raw).replace(/^\s+|\s+$/g, "").split(/[\r\n]+/)[0] || "";
        var parts = line.split("\t");
        var cmd = parts[0] || "";

        try {
            if (cmd !== "presentationBatch") {
                writeResult(
                    'ERROR: unknown command "' +
                        cmd +
                        '". Expected presentationBatch<TAB>epsFolder<TAB>pdfFolder<TAB>logoFile[<TAB>template.ai]'
                );
                return true;
            }
            if (parts.length < 4) {
                writeResult(
                    "ERROR: presentationBatch requires:\n" +
                        "presentationBatch<TAB>epsFolder<TAB>pdfFolder<TAB>logoFile[<TAB>template.ai]"
                );
                return true;
            }

            var epsPath = parts[1];
            var pdfFolderPath = parts[2];
            var logoPath = parts[3];
            var templatePath = parts.length > 4 ? parts[4] : "";

            var epsF = new Folder(epsPath);
            var pdfF = new Folder(pdfFolderPath);
            var logoFi = new File(logoPath);
            var templateFi = null;
            if (templatePath && String(templatePath).replace(/^\s+|\s+$/g, "").length) {
                templateFi = new File(templatePath);
                if (!templateFi.exists) {
                    writeResult("ERROR: Template file not found:\n" + templatePath);
                    return true;
                }
            }

            if (!epsF.exists) {
                writeResult("ERROR: EPS folder not found:\n" + epsPath);
                return true;
            }
            if (!logoFi.exists) {
                writeResult("ERROR: Logo file not found:\n" + logoPath);
                return true;
            }
            if (!pdfF.exists) {
                try {
                    pdfF.create();
                } catch (ec) {
                    writeResult("ERROR: could not create PDF folder:\n" + pdfFolderPath);
                    return true;
                }
            }

            var msg = runPresentationBatch(epsF, pdfF, logoFi, templateFi);
            writeResult(msg);
            return true;
        } catch (e) {
            writeResult("ERROR: " + e.message);
            return true;
        }
    }

    function runPresentationBatch(epsFolder, pdfOutFolder, logoFile, templateFile) {
        var files = epsFolder.getFiles(function (f) {
            if (f instanceof Folder) {
                return false;
            }
            return /\.(eps|ai)$/i.test(f.name);
        });

        if (!files.length) {
            return "No .eps or .ai files in:\n" + epsFolder.fsName;
        }

        files.sort(function (a, b) {
            if (a.name.toLowerCase() < b.name.toLowerCase()) {
                return -1;
            }
            if (a.name.toLowerCase() > b.name.toLowerCase()) {
                return 1;
            }
            return 0;
        });

        var ok = 0;
        var errors = [];
        var i;
        for (i = 0; i < files.length; i++) {
            try {
                if (templateFile) {
                    buildOneFromTemplate(files[i], pdfOutFolder, logoFile, templateFile);
                } else {
                    buildOneProgrammatic(files[i], pdfOutFolder, logoFile);
                }
                ok++;
            } catch (e2) {
                errors.push(files[i].name + " — " + e2.message);
            }
        }

        var report =
            "Presentation PDF batch\n\n" +
            "EPS folder:\n" +
            epsFolder.fsName +
            "\n\nPDF folder:\n" +
            pdfOutFolder.fsName +
            "\n\nLogo:\n" +
            logoFile.fsName +
            "\n\n" +
            (templateFile ? "Template:\n" + templateFile.fsName + "\n\n" : "Template: (none — built-in layout)\n\n") +
            "Created: " +
            ok +
            " / " +
            files.length;
        if (errors.length) {
            report += "\n\nErrors:\n" + errors.join("\n");
        }
        return report;
    }

    function buildOneFromTemplate(epsFile, pdfOutFolder, logoFile, templateFile) {
        var doc = app.open(templateFile);
        try {
            var titleText = titleFromFilename(epsFile.name);

            var titleItem = findTitleFrame(doc);
            if (titleItem && titleItem.typename === "TextFrame") {
                titleItem.contents = titleText;
            }

            var logoItem = findNamedInDocument(doc, NAME_LOGO);
            if (logoItem) {
                if (logoItem.typename !== "PlacedItem") {
                    throw new Error(NAME_LOGO + " must be a placed image (PlacedItem), not " + logoItem.typename);
                }
                var gbLogoBox = logoItem.geometricBounds;
                logoItem.file = logoFile;
                fitPlacedInRect(logoItem, gbLogoBox[0], gbLogoBox[1], gbLogoBox[2], gbLogoBox[3]);
            }

            var planItem = findNamedInDocument(doc, NAME_PLAN);
            if (!planItem) {
                throw new Error('Template must include a placed item named "' + NAME_PLAN + '" (placeholder EPS to replace).');
            }
            if (planItem.typename !== "PlacedItem") {
                throw new Error(NAME_PLAN + " must be a placed graphic (PlacedItem), not " + planItem.typename);
            }
            var gbPlanBox = planItem.geometricBounds;
            planItem.file = epsFile;
            fitPlacedInRect(planItem, gbPlanBox[0], gbPlanBox[1], gbPlanBox[2], gbPlanBox[3]);

            savePresentationPdf(doc, pdfOutFolder, epsFile.name);
        } finally {
            doc.close(SaveOptions.DONOTSAVECHANGES);
        }
    }

    function buildOneProgrammatic(epsFile, pdfOutFolder, logoFile) {
        var doc = createLetterLandscapeDoc();
        try {
            var ab = doc.artboards[0].artboardRect;
            var L = ab[0];
            var T = ab[1];
            var R = ab[2];
            var B = ab[3];

            var innerTop = T - MARGIN_PT;
            var innerBottom = B + MARGIN_PT;
            var headerBandBottom = innerTop - HEADER_H_PT;

            var bg = doc.pathItems.rectangle(T, L, R - L, T - B);
            bg.filled = true;
            bg.stroked = false;
            var white = new RGBColor();
            white.red = 255;
            white.green = 255;
            white.blue = 255;
            bg.fillColor = white;

            var plan = doc.placedItems.add();
            plan.file = epsFile;
            fitPlacedInRect(plan, L + MARGIN_PT, headerBandBottom, R - MARGIN_PT, innerBottom);

            var titleText = titleFromFilename(epsFile.name);
            var titleBounds = [L + MARGIN_PT, innerTop, R - MARGIN_PT - 220, headerBandBottom];
            var tf;
            try {
                tf = doc.textFrames.areaText(titleBounds);
            } catch (eat) {
                tf = doc.textFrames.pointText([L + MARGIN_PT, innerTop - 16]);
            }
            tf.contents = titleText;
            try {
                tf.textRange.characterAttributes.textFont = app.textFonts.getByName("HelveticaNeue-Medium");
            } catch (ef) {
                try {
                    tf.textRange.characterAttributes.textFont = app.textFonts.getByName("Helvetica-Bold");
                } catch (ef2) {}
            }
            tf.textRange.characterAttributes.size = TITLE_SIZE_PT;
            var black = new RGBColor();
            black.red = 0;
            black.green = 0;
            black.blue = 0;
            tf.textRange.characterAttributes.fillColor = black;

            var logo = doc.placedItems.add();
            logo.file = logoFile;
            scalePlacedToMax(logo, LOGO_MAX_W_PT, LOGO_MAX_H_PT);
            var gbLogo = logo.geometricBounds;
            var dxLogo = R - MARGIN_PT - gbLogo[2];
            var dyLogo = innerTop - gbLogo[1];
            logo.translate(dxLogo, dyLogo);

            savePresentationPdf(doc, pdfOutFolder, epsFile.name);
        } finally {
            doc.close(SaveOptions.DONOTSAVECHANGES);
        }
    }

    function savePresentationPdf(doc, pdfOutFolder, sourceFileName) {
        var base = stripExt(sourceFileName);
        var pdfFile = new File(pdfOutFolder.fsName + "/" + base + "-Presentation.pdf");
        if (pdfFile.exists) {
            try {
                pdfFile.remove();
            } catch (er) {
                throw new Error("PDF already exists (delete or move): " + pdfFile.name);
            }
        }

        var pdfOpts = new PDFSaveOptions();
        pdfOpts.compatibility = PDFCompatibility.ACROBAT7;
        pdfOpts.preserveEditability = false;
        pdfOpts.generateThumbnails = true;
        pdfOpts.optimization = true;
        doc.saveAs(pdfFile, pdfOpts);
    }

    function findTitleFrame(doc) {
        var i;
        var tf;
        for (i = 0; i < doc.textFrames.length; i++) {
            tf = doc.textFrames[i];
            if (tf.name === NAME_TITLE) {
                return tf;
            }
        }
        var found = findNamedInDocument(doc, NAME_TITLE);
        if (found && found.typename === "TextFrame") {
            return found;
        }
        return null;
    }

    function findNamedInContainer(container, targetName) {
        var i;
        var it;
        if (!container || container.pageItems === undefined) {
            return null;
        }
        for (i = 0; i < container.pageItems.length; i++) {
            it = container.pageItems[i];
            if (it.name === targetName) {
                return it;
            }
            if (it.typename === "GroupItem") {
                var inside = findNamedInContainer(it, targetName);
                if (inside) {
                    return inside;
                }
            }
        }
        return null;
    }

    function findInLayerTree(layer, targetName) {
        var found = findNamedInContainer(layer, targetName);
        if (found) {
            return found;
        }
        var j;
        if (!layer.layers) {
            return null;
        }
        for (j = 0; j < layer.layers.length; j++) {
            found = findInLayerTree(layer.layers[j], targetName);
            if (found) {
                return found;
            }
        }
        return null;
    }

    function findNamedInDocument(doc, targetName) {
        var li;
        for (li = 0; li < doc.layers.length; li++) {
            var found = findInLayerTree(doc.layers[li], targetName);
            if (found) {
                return found;
            }
        }
        return null;
    }

    function createLetterLandscapeDoc() {
        try {
            var preset = new DocumentPreset();
            preset.width = 792;
            preset.height = 612;
            preset.colorMode = DocumentColorSpace.RGB;
            preset.units = RulerUnits.Points;
            return app.documents.addDocument(DocumentColorSpace.RGB, preset);
        } catch (e) {
            var doc = app.documents.add(DocumentColorSpace.RGB);
            try {
                doc.artboards[0].artboardRect = [0, 612, 792, 0];
            } catch (e2) {}
            return doc;
        }
    }

    function stripExt(name) {
        return name.replace(/\.[^.]+$/, "");
    }

    function titleFromFilename(name) {
        var s = stripExt(name);
        s = s.replace(/-RGB-\d+$/i, "");
        s = s.replace(/_RGB$/i, "");
        s = s.replace(/^AML-FP-/i, "");
        s = s.replace(/-/g, " ");
        s = s.replace(/_/g, " ");
        return s;
    }

    function scalePlacedToMax(item, maxW, maxH) {
        var gb = item.geometricBounds;
        var w = gb[2] - gb[0];
        var h = gb[1] - gb[3];
        if (w < 0.01 || h < 0.01) {
            return;
        }
        var factor = Math.min(maxW / w, maxH / h);
        item.width = w * factor;
        item.height = h * factor;
    }

    function fitPlacedInRect(item, left, top, right, bottom) {
        var gb = item.geometricBounds;
        var iw = gb[2] - gb[0];
        var ih = gb[1] - gb[3];
        var bw = right - left;
        var bh = top - bottom;
        if (iw < 0.01 || ih < 0.01 || bw < 0.01 || bh < 0.01) {
            return;
        }
        var factor = Math.min(bw / iw, bh / ih);
        item.width = iw * factor;
        item.height = ih * factor;
        gb = item.geometricBounds;
        var cx = (left + right) / 2 - (gb[0] + gb[2]) / 2;
        var cy = (top + bottom) / 2 - (gb[1] + gb[3]) / 2;
        item.translate(cx, cy);
    }
})();
