const fs = require("node:fs/promises");
const path = require("node:path");

async function extractUploaded(file) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === ".txt") {
    const buffer = await fs.readFile(file.path);
    if (buffer.includes(0)) throw Object.assign(new Error("The TXT file content is not valid plain text."), { status: 415 });
    const text = buffer.toString("utf8");
    if (!text.trim()) throw Object.assign(new Error("The uploaded text file is empty."), { status: 400 });
    return { text, extraction: "text" };
  }
  if (ext === ".pdf") {
    try {
      const buffer = await fs.readFile(file.path);
      if (buffer.subarray(0, 5).toString() !== "%PDF-") throw new Error("Invalid PDF signature.");
      const pdf = require("pdf-parse");
      const result = await pdf(buffer);
      if (!result.text.trim()) throw new Error("No selectable text found in PDF.");
      return { text: result.text, extraction: "pdf-text" };
    } catch {
      throw Object.assign(new Error("Could not extract selectable text from this PDF. Scanned PDFs are not supported; paste the notice text instead."), { status: 422 });
    }
  }
  throw Object.assign(new Error("Image extraction and OCR are not supported yet. Paste the notice text or upload a TXT or text-based PDF."), { status: 415 });
}
module.exports = { extractUploaded };
