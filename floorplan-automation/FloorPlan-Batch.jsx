/*
================================================================================
  Illustrator floor plan batch processor

  Phases:
    A. Working AI  - Save As .ai only (live fonts; no RGB/outline before save).
    B. EPS          - From Working AI: outline all copy, RGB, R35/G31/B32 to #000000 only, pixels, EPS (no resize).
    C. JPEG         - From EPS: caption removal, group-scale long edge 1600, fit, export.
    D. PDF          - From Working AI: PDF save (live text).

  Section 10: outputs must not exist before write (halt on conflict).

  Run: File > Scripts > Other Script...
================================================================================
*/

#target illustrator

(function () {

    var SILENT_DELETE_IN_BATCH = true;

    /** Lowest-on-page caption isolated here before EPS outline; removed for JPEG only. */
    var CAPTION_LAYER_MARK = "FLOORPLAN_JPEG_CAPTION";

    /** Only R35/G31/B32 (Illustrator readout for H345 S11% B14%) ? #000000; no other colours */
    var OFF_BLACK = { r: 35, g: 31, b: 32 };
    var MATCH_TOL = 2;
    var FORBIDDEN_LOW = [33, 29, 30];
    var FORBIDDEN_HIGH = [37, 33, 34];

    if (runHeadlessIfConfigured()) return;

    var dryRun = !confirm(
        "Choose run mode:\n\n" +
        "OK = Full pipeline (Working AI, EPS, JPEG, PDF)\n\n" +
        "Cancel = Dry run only: preview footer/caption text (no saves)."
    );

    if (app.documents.length === 0) {
        var supplierFolder = Folder.selectDialog("Select the folder of supplier floor plan files");
        if (!supplierFolder) return;
        runBatch(supplierFolder, dryRun);
    } else {
        runSingle(app.activeDocument, dryRun);
    }

    function runBatch(folder, dryRun) {
        var files = folder.getFiles(function (f) {
            if (f instanceof Folder) return false;
            return /\.(eps|ai)$/i.test(f.name);
        });

        if (!files.length) {
            alert("No .eps or .ai files found in:\n" + folder.fsName);
            return;
        }

        if (dryRun) {
            var report = "DRY RUN\nFolder:\n" + folder.fsName + "\n\n";
            var n = 0;
            for (var d = 0; d < files.length; d++) {
                var docDry = app.open(files[d]);
                try {
                    report += "---\n" + files[d].name + "\n";
                    report += describeCaptionPreview(docDry) + "\n";
                    n++;
                } finally {
                    docDry.close(SaveOptions.DONOTSAVECHANGES);
                }
            }
            report += "\n---\nFiles checked: " + n + "\n";
            alert(truncateAlert(report));
            return;
        }

        var firstName = stripExt(files[0].name);
        var propertyName = firstName.split("_")[0];
        var propertyCode = derivePropertyCode(propertyName);

        var confirmedCode = prompt(
            "Property code derived from \"" + propertyName + "\":\n\n" +
            "Code: " + propertyCode + "\n\nEdit if needed and click OK.",
            propertyCode
        );
        if (!confirmedCode) return;
        propertyCode = confirmedCode.toUpperCase();

        var rootFolder = folder.parent;
        var folders = createFolderStructure(rootFolder, propertyCode);

        for (var i = 0; i < files.length; i++) {
            var dest = new File(folders.source + "/" + files[i].name);
            if (!dest.exists) {
                files[i].copy(dest);
            }
        }

        var processed = 0;
        var skipped = [];
        for (var j = 0; j < files.length; j++) {
            try {
                var doc = app.open(files[j]);
                processFile(doc, propertyCode, folders, files[j].name, SILENT_DELETE_IN_BATCH);
                processed++;
            } catch (e) {
                skipped.push(files[j].name + " - " + e.message);
            }
        }

        var msg = "Batch complete.\n\nProcessed: " + processed + " of " + files.length;
        if (skipped.length) msg += "\n\nSkipped:\n" + skipped.join("\n");
        msg += "\n\nOutput root:\n" + rootFolder.fsName;
        alert(msg);
    }

    function runSingle(doc, dryRun) {
        if (!doc.fullName.exists) {
            alert("Save the file to disk before running this script.");
            return;
        }

        if (dryRun) {
            alert(
                "DRY RUN\n\nFile: " + doc.name + "\n\n" +
                describeCaptionPreview(doc) +
                "\n\nDocument was not modified."
            );
            return;
        }

        var fileName = doc.name;
        var parsed = parseFileName(fileName);

        var propertyCode = parsed.code;
        if (!propertyCode && parsed.propertyName) {
            propertyCode = derivePropertyCode(parsed.propertyName);
            var confirmed = prompt(
                "Property code derived from \"" + parsed.propertyName + "\":\n\n" +
                "Code: " + propertyCode + "\n\nEdit if needed.",
                propertyCode
            );
            if (!confirmed) return;
            propertyCode = confirmed.toUpperCase();
        }

        if (!propertyCode) {
            alert("Could not determine property code from filename:\n" + fileName);
            return;
        }

        var rootFolder = doc.path.parent && doc.path.parent.exists ? doc.path.parent : doc.path;
        var folders = createFolderStructure(rootFolder, propertyCode);

        if (parsed.isSupplier) {
            var srcCopy = new File(folders.source + "/" + fileName);
            if (!srcCopy.exists && doc.fullName.fsName !== srcCopy.fsName) {
                File(doc.fullName).copy(srcCopy);
            }
        }

        processFile(doc, propertyCode, folders, fileName, false);
        alert("Done.\n\nOutput written under:\n" + rootFolder.fsName);
    }

    function describeCaptionPreview(doc) {
        if (findLayerByExactName(doc, CAPTION_LAYER_MARK)) {
            return "Caption layer \"" + CAPTION_LAYER_MARK + "\" (if present, removed for JPEG only).";
        }
        var capLayer = findLayerByNames(doc, ["caption", "description"]);
        if (capLayer) {
            return "Caption layer found: \"" + capLayer.name + "\" (would delete for JPEG).";
        }
        var tf = findLowestTextFrame(doc);
        if (tf) {
            var preview = String(tf.contents).replace(/[\r\n]+/g, " ");
            if (preview.length > 120) preview = preview.substring(0, 120) + "...";
            return "Lowest live text (caption candidate):\n\"" + preview + "\"";
        }
        return "No caption layer / no live text - JPEG caption step may skip.";
    }

    // =========================================================================
    // CORE PIPELINE - phased open/save (spec sections 4-7)
    // =========================================================================
    function processFile(doc, propertyCode, folders, originalFileName, silentDelete) {
        var parsed = parseFileName(originalFileName);
        var descriptor = parsed.descriptor;
        var langCode = parsed.langCode;
        var version = parsed.version || "1";

        var baseName = propertyCode + "-FP-" + descriptor;
        if (langCode) baseName += "-" + langCode;
        baseName += "-" + version;

        var workingFile = new File(folders.working + "/" + baseName + ".ai");
        var epsFile = new File(
            folders.eps + "/" + propertyCode + "-FP-" + descriptor +
            (langCode ? "-" + langCode : "") + "-RGB-" + version + ".eps"
        );
        var jpegFile = new File(folders.jpeg + "/" + baseName + ".jpg");
        var pdfFile = new File(folders.pdf + "/" + baseName + ".pdf");

        var aiOpts = new IllustratorSaveOptions();
        aiOpts.embedICCProfile = true;
        aiOpts.pdfCompatible = true;

        // --- Phase A: Working AI only (spec 4) - no outline, no RGB change ---
        var alreadyWorking =
            doc.fullName.exists &&
            doc.fullName.fsName === workingFile.fsName;

        if (!alreadyWorking) {
            assertTargetNew(workingFile, "Working AI");
            doc.saveAs(workingFile, aiOpts);
        }
        doc.close(SaveOptions.DONOTSAVECHANGES);

        // --- Phase B: EPS from Working AI (spec 5) ---
        var docEps = app.open(workingFile);
        try {
            isolateLowestCaptionLayer(docEps, CAPTION_LAYER_MARK);
            app.executeMenuCommand("selectall");
            outlineAllText(docEps);
            if (docEps.documentColorSpace !== DocumentColorSpace.RGB) {
                app.executeMenuCommand("doc-color-rgb");
            }
            blackConversionPass(docEps);
            assertNoForbiddenOffBlack(docEps);
            setUnitsPixels(docEps);

            assertTargetNew(epsFile, "EPS RGB Outlined");
            var epsOpts = new EPSSaveOptions();
            epsOpts.embedAllFonts = true;
            docEps.saveAs(epsFile, epsOpts);
        } finally {
            docEps.close(SaveOptions.DONOTSAVECHANGES);
        }

        // --- Phase C: JPEG from EPS (spec 6) ---
        var docJpg = app.open(epsFile);
        try {
            deleteCaptionForJPEG(docJpg, silentDelete);
            try {
                app.preferences.generalPreferences.scaleLineWeightAndStroke = true;
            } catch (prefE) {}
            app.executeMenuCommand("selectall");
            scaleLongEdgeGrouped(docJpg, 1600);
            app.executeMenuCommand("selectall");
            docJpg.fitArtboardToSelectedArt(0);
            docJpg.selection = null;

            assertTargetNew(jpegFile, "JPEG");
            var jpegOpts = new ExportOptionsJPEG();
            jpegOpts.qualitySetting = 100;
            jpegOpts.antiAliasing = true;
            jpegOpts.optimization = true;
            jpegOpts.artBoardClipping = true;
            docJpg.exportFile(jpegFile, ExportType.JPEG, jpegOpts);
        } finally {
            docJpg.close(SaveOptions.DONOTSAVECHANGES);
        }

        // --- Phase D: PDF from Working AI (spec 7) - live fonts ---
        var docPdf = app.open(workingFile);
        try {
            assertTargetNew(pdfFile, "PDF");
            var pdfOpts = new PDFSaveOptions();
            pdfOpts.compatibility = PDFCompatibility.ACROBAT7;
            pdfOpts.preserveEditability = false;
            pdfOpts.generateThumbnails = true;
            pdfOpts.optimization = true;
            docPdf.saveAs(pdfFile, pdfOpts);
        } finally {
            docPdf.close(SaveOptions.DONOTSAVECHANGES);
        }
    }

    function assertTargetNew(f, label) {
        if (f.exists) {
            throw new Error(
                "Section 10 conflict: output already exists (" + label + "). Halting.\n" +
                    f.fsName
            );
        }
    }

    function setUnitsPixels(doc) {
        doc.rulerUnits = RulerUnits.Pixels;
    }

    function findLayerByExactName(doc, targetName) {
        function walk(parent) {
            try {
                var ls = parent.layers;
                if (!ls) return null;
                var li;
                for (li = 0; li < ls.length; li++) {
                    var L = ls[li];
                    if (L.name === targetName) return L;
                    var inner = walk(L);
                    if (inner) return inner;
                }
            } catch (eW) {}
            return null;
        }
        return walk(doc);
    }

    function isolateLowestCaptionLayer(doc, layerName) {
        var existing = findLayerByExactName(doc, layerName);
        if (existing) {
            try {
                existing.remove();
            } catch (eR) {}
        }
        var low = findLowestTextFrame(doc);
        if (!low) return;
        var lay = doc.layers.add();
        lay.name = layerName;
        try {
            low.move(lay, ElementPlacement.PLACEATEND);
        } catch (eM) {
            try {
                lay.remove();
            } catch (eR2) {}
            return;
        }
    }

    function findLayerByNames(doc, namesLower) {
        function walk(layerParent) {
            var layers = layerParent.layers;
            var li;
            for (li = 0; li < layers.length; li++) {
                var L = layers[li];
                var nm = String(L.name).toLowerCase();
                var ni;
                for (ni = 0; ni < namesLower.length; ni++) {
                    if (nm.indexOf(namesLower[ni]) !== -1) return L;
                }
                var inner = walk(L);
                if (inner) return inner;
            }
            return null;
        }
        return walk(doc);
    }

    function deleteCaptionForJPEG(doc, silent) {
        var marked = findLayerByExactName(doc, CAPTION_LAYER_MARK);
        if (marked) {
            marked.remove();
            return;
        }
        var capLayer = findLayerByNames(doc, ["caption", "description"]);
        if (capLayer) {
            capLayer.remove();
            return;
        }
        var lowest = findLowestTextFrame(doc);
        if (!lowest) return;

        var preview = String(lowest.contents).replace(/[\r\n]+/g, " ");
        if (preview.length > 60) preview = preview.substring(0, 60) + "...";

        if (!silent) {
            var ok = confirm(
                "Delete JPEG caption (lowest live text)?\n\n\"" + preview + "\""
            );
            if (!ok) return;
        }
        lowest.remove();
    }

    function findLowestTextFrame(doc) {
        if (doc.textFrames.length === 0) return null;
        var lowest = null;
        var lowestY = Infinity;
        var i;
        for (i = 0; i < doc.textFrames.length; i++) {
            var tf = doc.textFrames[i];
            var bottomY = tf.visibleBounds[3];
            if (bottomY < lowestY) {
                lowestY = bottomY;
                lowest = tf;
            }
        }
        return lowest;
    }

    function scaleLongEdgeGrouped(doc, targetLongPx) {
        app.executeMenuCommand("selectall");
        var sel = doc.selection;
        if (!sel || sel.length === 0) return;

        var minL = Infinity;
        var maxR = -Infinity;
        var maxT = -Infinity;
        var minB = Infinity;
        var i;
        for (i = 0; i < sel.length; i++) {
            var b = sel[i].visibleBounds;
            if (b[0] < minL) minL = b[0];
            if (b[2] > maxR) maxR = b[2];
            if (b[1] > maxT) maxT = b[1];
            if (b[3] < minB) minB = b[3];
        }
        var w = maxR - minL;
        var h = maxT - minB;
        if (w <= 0 || h <= 0) return;

        var longEdge = Math.max(w, h);
        var scalePct = (targetLongPx / longEdge) * 100;

        if (sel.length > 1) {
            app.executeMenuCommand("group");
        }
        sel = doc.selection;
        if (!sel || sel.length === 0) return;
        var g = sel[0];
        g.resize(
            scalePct,
            scalePct,
            true,
            true,
            true,
            true,
            scalePct,
            Transformation.TOPLEFT
        );

        app.executeMenuCommand("selectall");
        sel = doc.selection;
        if (sel && sel.length === 1 && sel[0].typename === "GroupItem") {
            app.executeMenuCommand("ungroup");
        }
    }

    function blackConversionPass(doc) {
        var items = doc.pageItems;
        var i;
        for (i = 0; i < items.length; i++) {
            convertBlacksRecursive(items[i]);
        }
    }

    function convertBlacksRecursive(item) {
        if (item.typename === "GroupItem") {
            var j;
            for (j = 0; j < item.pageItems.length; j++) {
                convertBlacksRecursive(item.pageItems[j]);
            }
            return;
        }
        if (item.typename === "CompoundPathItem") {
            var k;
            for (k = 0; k < item.pathItems.length; k++) {
                convertBlacksRecursive(item.pathItems[k]);
            }
            return;
        }
        if (item.typename === "PathItem") {
            if (item.filled) item.fillColor = convertOffBlack(item.fillColor);
            if (item.stroked) item.strokeColor = convertOffBlack(item.strokeColor);
        }
    }

    function convertOffBlack(color) {
        if (!color || !color.typename) return color;
        if (color.typename === "RGBColor") {
            if (matchesOffBlackRgb(color, MATCH_TOL)) return makeRGBBlack();
            return color;
        }
        if (color.typename === "CMYKColor") {
            if (color.black >= 99 && color.cyan < 2 && color.magenta < 2 && color.yellow < 2) {
                return makeRGBBlack();
            }
            return color;
        }
        return color;
    }

    function matchesOffBlackRgb(c, tol) {
        return (
            Math.abs(c.red - OFF_BLACK.r) <= tol &&
            Math.abs(c.green - OFF_BLACK.g) <= tol &&
            Math.abs(c.blue - OFF_BLACK.b) <= tol
        );
    }

    function assertNoForbiddenOffBlack(doc) {
        var bad = [];
        var i;
        for (i = 0; i < doc.pageItems.length; i++) {
            collectForbiddenRecursive(doc.pageItems[i], bad);
            if (bad.length >= 16) break;
        }
        if (bad.length > 0) {
            throw new Error(
                "Section 5a: off-black band (R35/G31/B32) still present after conversion (" +
                    bad.length +
                    " hit(s)). Examples: " +
                    bad.slice(0, 5).join("; ")
            );
        }
    }

    function collectForbiddenRecursive(item, bad) {
        if (bad.length >= 16) return;
        if (item.typename === "GroupItem") {
            var j;
            for (j = 0; j < item.pageItems.length; j++) {
                collectForbiddenRecursive(item.pageItems[j], bad);
            }
            return;
        }
        if (item.typename === "CompoundPathItem") {
            var k;
            for (k = 0; k < item.pathItems.length; k++) {
                collectForbiddenRecursive(item.pathItems[k], bad);
            }
            return;
        }
        if (item.typename === "PathItem") {
            if (item.filled && isForbiddenRgb(item.fillColor)) {
                bad.push("fill " + rgbBrief(item.fillColor));
            }
            if (item.stroked && isForbiddenRgb(item.strokeColor)) {
                bad.push("stroke " + rgbBrief(item.strokeColor));
            }
        }
    }

    function isForbiddenRgb(color) {
        if (!color || color.typename !== "RGBColor") return false;
        return (
            color.red >= FORBIDDEN_LOW[0] &&
            color.red <= FORBIDDEN_HIGH[0] &&
            color.green >= FORBIDDEN_LOW[1] &&
            color.green <= FORBIDDEN_HIGH[1] &&
            color.blue >= FORBIDDEN_LOW[2] &&
            color.blue <= FORBIDDEN_HIGH[2]
        );
    }

    function rgbBrief(c) {
        return (
            "R" +
            Math.round(c.red) +
            " G" +
            Math.round(c.green) +
            " B" +
            Math.round(c.blue)
        );
    }

    function truncateAlert(s) {
        var maxLen = 3500;
        if (s.length <= maxLen) return s;
        return s.substring(0, maxLen) + "\n\n... (truncated)";
    }

    function parseFileName(fileName) {
        var stripped = stripExt(fileName);

        if (/^[A-Z]{3}-FP-/.test(stripped)) {
            var parts = stripped.split("-");
            var code = parts[0];
            var version = parts[parts.length - 1];
            var langCode = null;
            var descriptorParts;

            if (parts.length >= 4 && parts[parts.length - 2] === "RGB") {
                version = parts[parts.length - 1];
                descriptorParts = parts.slice(2, parts.length - 2);
            } else {
                var maybeLang = parts[parts.length - 2];
                descriptorParts = parts.slice(2, parts.length - 1);
                if (/^[A-Z]{2}$/.test(maybeLang)) {
                    langCode = maybeLang;
                    descriptorParts = parts.slice(2, parts.length - 2);
                }
            }

            return {
                isSupplier: false,
                code: code,
                propertyName: null,
                descriptor: descriptorParts.join("-"),
                langCode: langCode,
                version: version
            };
        }

        var underscoreParts = stripped.split("_");
        var propertyName = underscoreParts[0];
        var descriptor = underscoreParts.slice(1).join("-");

        return {
            isSupplier: true,
            code: null,
            propertyName: propertyName,
            descriptor: descriptor || propertyName,
            langCode: null,
            version: "1"
        };
    }

    function derivePropertyCode(propertyName) {
        return propertyName.substring(0, 3).toUpperCase();
    }

    function stripExt(name) {
        return name.replace(/\.[^.]+$/, "");
    }

    function createFolderStructure(parent, code) {
        var f = {
            source: new Folder(parent + "/" + code + " Source Files"),
            working: new Folder(parent + "/" + code + " Working Files AI"),
            eps: new Folder(parent + "/" + code + " EPS RGB Outlined"),
            jpeg: new Folder(parent + "/" + code + " 1600 PXL JPEG"),
            pdf: new Folder(parent + "/" + code + " FP PDF"),
            versions: new Folder(parent + "/" + code + " FP Versions")
        };
        var k;
        for (k in f) {
            if (!f[k].exists) f[k].create();
        }
        return f;
    }

    function outlineAllText(doc) {
        outlineAllTextSkippingLayer(doc, null);
    }

    function outlineAllTextSkippingLayer(doc, skipLayerName) {
        var i;
        for (i = doc.textFrames.length - 1; i >= 0; i--) {
            var tf = doc.textFrames[i];
            if (
                skipLayerName &&
                tf.layer &&
                String(tf.layer.name) === skipLayerName
            ) {
                continue;
            }
            try {
                tf.createOutline();
            } catch (e) {}
        }
    }

    function makeRGBBlack() {
        var c = new RGBColor();
        c.red = 0;
        c.green = 0;
        c.blue = 0;
        return c;
    }

    function runHeadlessIfConfigured() {
        var scriptFile = new File($.fileName);
        var dir = scriptFile.parent;
        var cfg = new File(dir.fsName + "/headless-run.txt");
        if (!cfg.exists) return false;

        var resultFile = new File(dir.fsName + "/headless-result.txt");

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
            writeResult("ERROR: could not read headless-run.txt\n" + eRead.message);
            return true;
        }

        var line = String(raw).replace(/^\s+|\s+$/g, "").split(/[\r\n]+/)[0] || "";
        var parts = line.split("\t");
        var cmd = parts[0] || "";

        try {
            if (cmd === "dryRunFile") {
                var pathStr = parts[1];
                if (!pathStr) {
                    writeResult("ERROR: dryRunFile<TAB>/path/to/file.eps");
                    return true;
                }
                var target = new File(pathStr);
                if (!target.exists) {
                    writeResult("ERROR: file not found:\n" + pathStr);
                    return true;
                }
                var doc = app.open(target);
                try {
                    writeResult(
                        "DRY RUN (headless)\n" +
                            target.name +
                            "\n\n" +
                            describeCaptionPreview(doc)
                    );
                } finally {
                    doc.close(SaveOptions.DONOTSAVECHANGES);
                }
                return true;
            }

            if (cmd === "dryRunFolder") {
                var pathFolder = parts[1];
                if (!pathFolder) {
                    writeResult("ERROR: dryRunFolder<TAB>/path/to/folder");
                    return true;
                }
                var folder = new Folder(pathFolder);
                if (!folder.exists) {
                    writeResult("ERROR: folder not found:\n" + pathFolder);
                    return true;
                }
                var filesDr = folder.getFiles(function (f) {
                    if (f instanceof Folder) return false;
                    return /\.(eps|ai)$/i.test(f.name);
                });
                if (!filesDr.length) {
                    writeResult("No .eps or .ai in:\n" + folder.fsName);
                    return true;
                }
                var report = "DRY RUN (headless)\nFolder:\n" + folder.fsName + "\n\n";
                var n;
                for (n = 0; n < filesDr.length; n++) {
                    var docF = app.open(filesDr[n]);
                    try {
                        report += "---\n" + filesDr[n].name + "\n";
                        report += describeCaptionPreview(docF) + "\n";
                    } finally {
                        docF.close(SaveOptions.DONOTSAVECHANGES);
                    }
                }
                report += "\n---\nFiles checked: " + filesDr.length + "\n";
                writeResult(truncateAlert(report));
                return true;
            }

            if (cmd === "fullBatch") {
                if (parts.length < 3) {
                    writeResult(
                        "ERROR: fullBatch requires:\n" +
                            "fullBatch<TAB>/path/to/supplier/folder<TAB>PROPERTYCODE"
                    );
                    return true;
                }
                var supplierFolder = new Folder(parts[1]);
                var propertyCodeFb = String(parts[2]).replace(/^\s+|\s+$/g, "").toUpperCase();
                if (!supplierFolder.exists) {
                    writeResult("ERROR: folder not found:\n" + parts[1]);
                    return true;
                }
                if (!propertyCodeFb) {
                    writeResult("ERROR: property code empty");
                    return true;
                }
                var filesFb = supplierFolder.getFiles(function (f) {
                    if (f instanceof Folder) return false;
                    return /\.(eps|ai)$/i.test(f.name);
                });
                if (!filesFb.length) {
                    writeResult("No .eps or .ai in:\n" + supplierFolder.fsName);
                    return true;
                }
                var rootFolder = supplierFolder.parent;
                var foldersFb = createFolderStructure(rootFolder, propertyCodeFb);
                var iCopy;
                for (iCopy = 0; iCopy < filesFb.length; iCopy++) {
                    var destFb = new File(foldersFb.source + "/" + filesFb[iCopy].name);
                    if (!destFb.exists) {
                        filesFb[iCopy].copy(destFb);
                    }
                }
                var processedFb = 0;
                var skippedFb = [];
                var jFb;
                for (jFb = 0; jFb < filesFb.length; jFb++) {
                    try {
                        var docFb = app.open(filesFb[jFb]);
                        processFile(docFb, propertyCodeFb, foldersFb, filesFb[jFb].name, SILENT_DELETE_IN_BATCH);
                        processedFb++;
                    } catch (eFb) {
                        skippedFb.push(filesFb[jFb].name + " - " + eFb.message);
                    }
                }
                var msgFb =
                    "FULL BATCH (headless)\n\n" +
                    "Property code: " +
                    propertyCodeFb +
                    "\n" +
                    "Supplier folder:\n" +
                    supplierFolder.fsName +
                    "\n\n" +
                    "Processed: " +
                    processedFb +
                    " of " +
                    filesFb.length;
                if (skippedFb.length) {
                    msgFb += "\n\nSkipped:\n" + skippedFb.join("\n");
                }
                msgFb += "\n\nOutput root:\n" + rootFolder.fsName;
                writeResult(msgFb);
                return true;
            }

            writeResult(
                "ERROR: unknown command \"" + cmd + "\". Use dryRunFile, dryRunFolder, or fullBatch."
            );
            return true;
        } catch (e) {
            writeResult("ERROR: " + e.message);
            return true;
        }
    }

})();
