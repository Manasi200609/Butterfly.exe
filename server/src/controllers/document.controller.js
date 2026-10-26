const fs = require("node:fs/promises");
const { extractUploaded } = require("../services/document.service");
async function upload(req, res, next) {
  if (!req.file) return res.status(400).json({ error: { code: "FILE_REQUIRED", message: "Upload one PDF or TXT notice file." } });
  try {
    const extracted = await extractUploaded(req.file);
    res.json({ text: extracted.text, extraction: extracted.extraction, filename: req.file.filename });
  } catch (error) { next(error); }
  finally { await fs.unlink(req.file.path).catch(() => {}); }
}
module.exports = { upload };
