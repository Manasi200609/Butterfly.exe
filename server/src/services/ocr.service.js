async function extractImageText() {
  throw Object.assign(new Error("Image OCR is not implemented. Paste the notice text or upload a TXT or text-based PDF."), { status: 415 });
}
module.exports = { extractImageText };
