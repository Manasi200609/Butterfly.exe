const path = require("node:path");
const allowed = new Map([[".txt", "text/plain"], [".pdf", "application/pdf"]]);
function validateUploadCandidate(file, maxBytes = Infinity) {
  if (!file || (Number.isFinite(file.size) && file.size > maxBytes)) return false;
  const ext = path.extname(file.originalname).toLowerCase();
  return allowed.has(ext) && file.mimetype === allowed.get(ext);
}
module.exports = { validateUploadCandidate };
