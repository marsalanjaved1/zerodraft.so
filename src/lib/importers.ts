
// @ts-nocheck
import mammoth from "mammoth";

export async function parseDocx(buffer: Buffer): Promise<string> {
    const result = await mammoth.convertToHtml({ buffer });
    return result.value;
}

export async function parsePdf(buffer: Buffer): Promise<string> {
    // Polyfill DOMMatrix locally before requiring pdf-parse
    if (!globalThis.DOMMatrix) {
        globalThis.DOMMatrix = class DOMMatrix {
            constructor() { this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0; }
            translate() { return this; }
            scale() { return this; }
            transformPoint(p) { return p; }
            toString() { return "matrix(1, 0, 0, 1, 0, 0)"; }
        };
    }


    // Use main entry point which works better in this environment
    const lib = require("pdf-parse");
    const PDFParse = lib.PDFParse || lib.default?.PDFParse || lib;

    if (!PDFParse) {
        throw new Error("Failed to import PDFParse class");
    }

    // Explicitly set worker to avoid dynamic require errors in Webpack/Next.js
    // We point to the ESM worker since pdfjs-dist v5+ is ESM only
    try {
        const workerPath = require.resolve("pdfjs-dist/build/pdf.worker.mjs");
        if (typeof PDFParse.setWorker === 'function') {
            PDFParse.setWorker(workerPath);
        }
    } catch (e) {
        console.warn("Failed to resolve PDF worker path:", e);
    }

    const u8 = new Uint8Array(buffer);
    const parser = new PDFParse(u8);
    const data = await parser.getText();
    // data.text contains the text
    return (data.text || "").replace(/\n/g, "<br>");
}
