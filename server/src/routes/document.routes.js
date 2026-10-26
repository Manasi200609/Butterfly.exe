const router = require("express").Router();
const multer = require("multer");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const env = require("../config/env");
const controller = require("../controllers/document.controller");
const { validateUploadCandidate } = require("../utils/uploadValidation");
const uploadDir = path.resolve(__dirname, "../../", env.uploadDir);
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({ destination: uploadDir, filename: (_req, _file, cb) => cb(null, `${crypto.randomUUID()}.upload`) }),
  limits: { fileSize: env.maxUploadBytes, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!validateUploadCandidate(file)) return cb(Object.assign(new Error("Only PDF and TXT files with matching declared types are supported."), { status: 415 }));
    cb(null, true);
  },
});
router.post("/upload", upload.single("file"), controller.upload);
module.exports = router;
